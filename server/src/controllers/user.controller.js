import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword } from '../utils/password.js';

export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.user.role === 'dietitian') filter.assignedDietitian = req.user.id;
  else if (req.query.assignedDietitian) filter.assignedDietitian = req.query.assignedDietitian;

  res.json(await User.find(filter));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  const isSelf = user.id === req.user.id;
  const isOwningDietitian = req.user.role === 'dietitian' && String(user.assignedDietitian) === req.user.id;
  if (!isSelf && !isOwningDietitian && req.user.role !== 'admin') throw ApiError.forbidden();

  res.json(user);
});

export const updateMe = asyncHandler(async (req, res) => {
  Object.assign(req.user, req.body);
  await req.user.save();
  res.json(req.user);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) throw ApiError.notFound('User not found');
  res.json(user);
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await User.findOne({ email })) throw ApiError.conflict('Email already registered');

  const user = await User.create({ name, email, passwordHash: await hashPassword(password), role });
  res.status(201).json(user);
});
