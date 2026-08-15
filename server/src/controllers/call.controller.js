import {
  listCalls as queryCalls,
  findCallById,
  createCall as createCallRecord,
  updateCallById,
  deleteCallById,
} from '../models/Call.js';
import { findUserById } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

function scopeToOwner(req, filter = {}) {
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.user.role === 'dietitian') filter.dietitian = req.user.id;
  return filter;
}

export const listCalls = asyncHandler(async (req, res) => {
  const filter = scopeToOwner(req);
  // Narrows further to one client. Safe even for a dietitian passing an unrelated client id —
  // `filter.dietitian` from scopeToOwner is still ANDed in, so it can only ever return zero rows,
  // never someone else's calls.
  if (req.query.client && req.user.role !== 'client') filter.client = req.query.client;
  if (req.query.from) filter.from = new Date(req.query.from);
  if (req.query.to) filter.to = new Date(req.query.to);

  const calls = await queryCalls(filter);
  res.json(calls.map((c) => toClientShape(c)));
});

export const createCall = asyncHandler(async (req, res) => {
  let { client, dietitian, scheduledAt, notes } = req.body;

  if (req.user.role === 'client') {
    const me = await findUserById(req.user.id);
    if (!me.assignedDietitian) {
      throw ApiError.badRequest('No dietitian assigned yet — contact support to get set up.');
    }
    client = req.user.id;
    dietitian = String(me.assignedDietitian);
  } else if (req.user.role === 'dietitian') {
    if (!client) throw ApiError.badRequest('client is required');
    dietitian = req.user.id;
  } else if (!client || !dietitian) {
    throw ApiError.badRequest('client and dietitian are required');
  }

  const call = await createCallRecord({ client, dietitian, scheduledAt, notes });
  res.status(201).json(toClientShape(call));
});

export const updateCall = asyncHandler(async (req, res) => {
  const call = await findCallById(req.params.id);
  if (!call) throw ApiError.notFound('Call not found');

  const isOwningClient = req.user.role === 'client' && String(call.client) === req.user.id;
  const isOwningDietitian = req.user.role === 'dietitian' && String(call.dietitian?._id ?? call.dietitian) === req.user.id;
  if (req.user.role === 'client' && !isOwningClient) throw ApiError.forbidden();
  if (req.user.role === 'dietitian' && !isOwningDietitian) throw ApiError.forbidden();

  if (isOwningClient) {
    const allowedKeys = new Set(['scheduledAt', 'status']);
    if (Object.keys(req.body).some((key) => !allowedKeys.has(key))) {
      throw ApiError.forbidden('Clients may only reschedule or cancel a call');
    }
    if (req.body.status && req.body.status !== 'cancelled') {
      throw ApiError.forbidden('Clients may only cancel a call, not mark it complete');
    }
    if (call.status !== 'scheduled') {
      throw ApiError.badRequest('This call can no longer be changed');
    }
  }

  const updated = await updateCallById(req.params.id, req.body);
  res.json(toClientShape(updated));
});

export const deleteCall = asyncHandler(async (req, res) => {
  const call = await deleteCallById(req.params.id);
  if (!call) throw ApiError.notFound('Call not found');
  res.status(204).send();
});
