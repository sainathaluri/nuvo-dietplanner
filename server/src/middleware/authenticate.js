import { verifyAccessToken } from '../utils/jwt.js';
import { ApiError } from '../utils/ApiError.js';
import { findUserById } from '../models/User.js';
import { asyncHandler } from './asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw ApiError.unauthorized('Missing access token');

  let payload;
  try {
    payload = verifyAccessToken(header.slice('Bearer '.length));
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }

  const user = await findUserById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');

  req.user = user;
  next();
});
