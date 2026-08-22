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
  else if (req.user.role === 'client') filter.role = 'dietitian'; // clients may only browse the dietitian directory
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
  const { assignedDietitian } = req.body;
  if (assignedDietitian !== undefined) {
    if (req.user.role !== 'client') throw ApiError.forbidden('Only clients can choose a dietitian');
    if (assignedDietitian !== null) {
      const dietitian = await findUserById(assignedDietitian);
      if (!dietitian || dietitian.role !== 'dietitian') throw ApiError.badRequest('Invalid dietitian');
    }
  }

  const user = await updateUserRecord(req.user.id, req.body);
  res.json(toClientShape(user, ['passwordHash']));
});

export const updateUser = asyncHandler(async (req, res) => {
  const { assignedDietitian, role } = req.body;
  if (assignedDietitian) {
    const dietitian = await findUserById(assignedDietitian);
    if (!dietitian || dietitian.role !== 'dietitian') throw ApiError.badRequest('Invalid dietitian');
  }

  // programPlan/planDuration only ever apply to a client — same conditional-apply convention as
  // assignedDietitian above. Only cleared when this patch explicitly changes the role away from
  // client; otherwise passed through as given (or omitted, leaving them untouched).
  const patch = { ...req.body };
  if (role !== undefined && role !== 'client') {
    patch.programPlan = null;
    patch.planDuration = null;
  }

  const user = await updateUserRecord(req.params.id, patch);
  if (!user) throw ApiError.notFound('User not found');
  res.json(toClientShape(user, ['passwordHash']));
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, assignedDietitian = null, programPlan = null, planDuration = null } = req.body;
  if (await findUserByEmail(email)) throw ApiError.conflict('Email already registered');

  if (assignedDietitian) {
    const dietitian = await findUserById(assignedDietitian);
    if (!dietitian || dietitian.role !== 'dietitian') throw ApiError.badRequest('Invalid dietitian');
  }

  const user = await createUserRecord({
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
    assignedDietitian: role === 'client' ? assignedDietitian : null,
    programPlan: role === 'client' ? programPlan : null,
    planDuration: role === 'client' ? planDuration : null,
    // Every account is admin-created now (self-registration is gone) — the person who set this
    // password is never the one who'll use it, so force a change on first login.
    mustChangePassword: true,
  });
  res.status(201).json(toClientShape(user, ['passwordHash']));
});
