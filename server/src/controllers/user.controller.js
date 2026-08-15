import {
  listUsers as queryUsers,
  findUserById,
  updateUser as updateUserRecord,
  createUser as createUserRecord,
  findUserByEmail,
} from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';
import { toClientShape } from '../utils/serialize.js';

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.user.role === 'dietitian') filter.assignedDietitian = req.user.id;
  else if (req.query.assignedDietitian) filter.assignedDietitian = req.query.assignedDietitian;

  const users = await queryUsers(filter);
  res.json(users.map((u) => toClientShape(u, ['passwordHash'])));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await findUserById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = user.id === req.user.id;
  const isOwningDietitian = req.user.role === 'dietitian' && String(user.assignedDietitian) === req.user.id;
  if (!isSelf && !isOwningDietitian && req.user.role !== 'admin') throw ApiError.forbidden();

  res.json(toClientShape(user, ['passwordHash']));
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await updateUserRecord(req.user.id, req.body);
  res.json(toClientShape(user, ['passwordHash']));
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await updateUserRecord(req.params.id, req.body);
  if (!user) throw ApiError.notFound('User not found');
  res.json(toClientShape(user, ['passwordHash']));
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await findUserByEmail(email)) throw ApiError.conflict('Email already registered');

  const user = await createUserRecord({ name, email, passwordHash: await hashPassword(password), role });
  res.status(201).json(toClientShape(user, ['passwordHash']));
});
