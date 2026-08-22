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
import { withTransaction } from '../db/pool.js';
import { assertSlotAvailable, getAvailableSlotsForDay } from '../services/availabilityGuard.js';

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

// GET /calls/available-slots?date=&dietitian=&excludeCallId= — dietitian resolution mirrors
// createCall: client is scoped to their own assignedDietitian, dietitian to themself, admin must
// supply ?dietitian= explicitly.
export const getAvailableSlots = asyncHandler(async (req, res) => {
  let dietitianId;
  if (req.user.role === 'client') {
    const me = await findUserById(req.user.id);
    if (!me.assignedDietitian) {
      throw ApiError.badRequest('No dietitian assigned yet — contact support to get set up.');
    }
    dietitianId = String(me.assignedDietitian);
  } else if (req.user.role === 'dietitian') {
    dietitianId = req.user.id;
  } else {
    if (!req.query.dietitian) throw ApiError.badRequest('dietitian is required');
    dietitianId = req.query.dietitian;
  }

  const slots = await getAvailableSlotsForDay({
    dietitianId,
    date: req.query.date,
    excludeCallId: req.query.excludeCallId,
  });
  res.json({ slots });
});

export const createCall = asyncHandler(async (req, res) => {
  let { client, dietitian, scheduledAt, notes, reminderMinutesBefore } = req.body;

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

  // Clients can never force — see the `force` comment in call.schema.js.
  const force = req.user.role !== 'client' && Boolean(req.body.force);
  const payload = { client, dietitian, scheduledAt, notes, reminderMinutesBefore };

  const call = force
    ? await createCallRecord(payload)
    : await withTransaction(async (conn) => {
        await assertSlotAvailable({ dietitianId: dietitian, scheduledAt }, conn);
        return createCallRecord(payload, conn);
      });

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
    const allowedKeys = new Set(['scheduledAt', 'status', 'reminderMinutesBefore']);
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

  // Only a reschedule (scheduledAt changing) needs re-checking — cancelling, completing, or
  // editing notes/reminders doesn't touch the slot. Clients can never force (see call.schema.js).
  const dietitianId = call.dietitian?._id ?? call.dietitian;
  const force = req.user.role !== 'client' && Boolean(req.body.force);

  // A genuine reschedule (the new time differs from the current one) stamps rescheduledAt and
  // preserves the call's original time — a reschedule updates this same row in place, so without
  // this the client profile's call history would have no way to show it was ever moved (spec §6
  // item 4). Re-rescheduling again just bumps rescheduledAt; originalScheduledAt only ever
  // captures the very first time.
  let patch = req.body;
  if (req.body.scheduledAt && new Date(req.body.scheduledAt).getTime() !== new Date(call.scheduledAt).getTime()) {
    patch = { ...req.body, rescheduledAt: new Date(), originalScheduledAt: call.originalScheduledAt ?? call.scheduledAt };
  }

  const updated =
    req.body.scheduledAt && !force
      ? await withTransaction(async (conn) => {
          await assertSlotAvailable({ dietitianId, scheduledAt: req.body.scheduledAt, excludeCallId: call.id }, conn);
          return updateCallById(req.params.id, patch, conn);
        })
      : await updateCallById(req.params.id, patch);

  res.json(toClientShape(updated));
});

export const deleteCall = asyncHandler(async (req, res) => {
  const call = await deleteCallById(req.params.id);
  if (!call) throw ApiError.notFound('Call not found');
  res.status(204).send();
});
