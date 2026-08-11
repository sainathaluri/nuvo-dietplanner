import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { env } from '../config/env.js';

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

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) throw ApiError.conflict('Email already registered');

  const user = await User.create({ name, email, passwordHash: await hashPassword(password), role: 'client' });
  const accessToken = issueTokens(res, user);
  res.status(201).json({ user, accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await comparePassword(password, user.passwordHash))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  const accessToken = issueTokens(res, user);
  res.json({ user, accessToken });
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

  const user = await User.findById(payload.sub);
  if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Refresh token no longer valid');
  }

  res.json({ accessToken: signAccessToken(user) });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});
