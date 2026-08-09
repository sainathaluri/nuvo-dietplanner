import { Call } from '../models/Call.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

function scopeToOwner(req, filter = {}) {
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.user.role === 'dietitian') filter.dietitian = req.user.id;
  return filter;
}

export const listCalls = asyncHandler(async (req, res) => {
  const filter = scopeToOwner(req);
  if (req.query.from || req.query.to) {
    filter.scheduledAt = {};
    if (req.query.from) filter.scheduledAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.scheduledAt.$lte = new Date(req.query.to);
  }
  res.json(await Call.find(filter).sort({ scheduledAt: 1 }));
});

export const createCall = asyncHandler(async (req, res) => {
  res.status(201).json(await Call.create(req.body));
});

export const updateCall = asyncHandler(async (req, res) => {
  const call = await Call.findById(req.params.id);
  if (!call) throw ApiError.notFound('Call not found');

  const isOwningClient = req.user.role === 'client' && String(call.client) === req.user.id;
  if (isOwningClient && Object.keys(req.body).some((key) => key !== 'status') ) {
    throw ApiError.forbidden('Clients may only cancel a call');
  }
  if (isOwningClient && req.body.status && req.body.status !== 'cancelled') {
    throw ApiError.forbidden('Clients may only cancel a call');
  }

  Object.assign(call, req.body);
  await call.save();
  res.json(call);
});

export const deleteCall = asyncHandler(async (req, res) => {
  const call = await Call.findByIdAndDelete(req.params.id);
  if (!call) throw ApiError.notFound('Call not found');
  res.status(204).send();
});
