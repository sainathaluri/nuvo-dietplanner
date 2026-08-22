import { findUserByEmail, findUserById, setPassword, bumpRefreshTokenVersion } from '../models/User.js';
import {
  createPasswordResetToken,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
  hashResetToken,
} from '../models/PasswordResetToken.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { toClientShape } from '../utils/serialize.js';
import { env } from '../config/env.js';
import crypto from 'node:crypto';

const REFRESH_COOKIE = 'nourishly_refresh';
const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  // In production the client (Vercel) and server (Render/Railway) are genuinely different
  // sites, not just different ports like local dev — `strict` (or even `lax`) would silently
  // stop the browser from ever sending this cookie cross-site, breaking refresh/logout entirely.
  // `none` requires `secure: true`, which is already true exactly when this is `none`.
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
  return accessToken;
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const accessToken = issueTokens(res, user);
  res.json({ user: toClientShape(user, ['passwordHash']), accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('Missing refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await findUserById(payload.sub);
  if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Refresh token no longer valid');
  }

  res.json({ accessToken: signAccessToken(user) });
});

// Deliberately not gated by blockIfMustChangePassword (see auth.routes.js) — this is the one
// authenticated call a user with the flag still set must be able to make. Works whether
// `currentPassword` is the admin-set temp password or an ordinary one, since both are just
// `users.password_hash`. Reissues tokens (like login) so the caller lands in the dashboard
// without a separate re-login step, per spec.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!(await comparePassword(currentPassword, req.user.passwordHash))) {
    throw ApiError.unauthorized('Current password is incorrect');
  }

  const user = await setPassword(req.user.id, {
    passwordHash: await hashPassword(newPassword),
    mustChangePassword: false,
  });
  const accessToken = issueTokens(res, user);
  res.json({ user: toClientShape(user, ['passwordHash']), accessToken });
});

// Always responds the same way regardless of whether the email is registered or the send
// succeeded — a different response for "unknown email" or "send failed" would let a caller probe
// which emails have accounts. Failures are still logged server-side for operators to see.
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await findUserByEmail(email);

  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);
    await createPasswordResetToken({ userId: user.id, tokenHash: hashResetToken(rawToken), expiresAt });

    const resetUrl = `${env.clientOrigin}/reset-password?token=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl).catch((err) => {
      console.error('[forgotPassword] failed to send reset email', err);
    });
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

// Deliberately does not touch mustChangePassword: a voluntary password reset by someone who
// already knew (or has now regained access to) their account is a different situation from the
// forced first-login change (auth.controller.js#changePassword) — that gate, if still set, stays
// in effect and is enforced the normal way on the caller's next request.
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const resetToken = await findValidPasswordResetToken(hashResetToken(token));
  if (!resetToken) throw ApiError.badRequest('This reset link is invalid or has expired.');

  const user = await findUserById(resetToken.userId);
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired.');

  await setPassword(user.id, { passwordHash: await hashPassword(password), mustChangePassword: user.mustChangePassword });
  await markPasswordResetTokenUsed(resetToken.id);
  // A leaked/forgotten password means any existing session could be compromised too.
  await bumpRefreshTokenVersion(user.id);

  res.status(204).send();
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: toClientShape(req.user, ['passwordHash']) });
});
