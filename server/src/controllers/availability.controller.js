import { asyncHandler } from '../middleware/asyncHandler.js';
import { listWeeklyHours, replaceWeeklyHours } from '../models/DietitianWeeklyHours.js';
import { listExceptions, createException, deleteExceptionById } from '../models/AvailabilityException.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

// Every handler here is self-service: scoped to req.user.id, no admin-on-behalf-of path (a
// dietitian manages only their own availability — see docs/API.md).

export const getWeeklyHours = asyncHandler(async (req, res) => {
  const days = await listWeeklyHours(req.user.id);
  res.json(days.map((day) => toClientShape(day)));
});

export const putWeeklyHours = asyncHandler(async (req, res) => {
  const days = await replaceWeeklyHours(req.user.id, req.body.days);
  res.json(days.map((day) => toClientShape(day)));
});

export const listAvailabilityExceptions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.from) filter.from = new Date(req.query.from);
  if (req.query.to) filter.to = new Date(req.query.to);
  const exceptions = await listExceptions(req.user.id, filter);
  res.json(exceptions.map((exception) => toClientShape(exception)));
});

export const createAvailabilityException = asyncHandler(async (req, res) => {
  const { startAt, endAt, kind, note } = req.body;
  const exception = await createException({ dietitianId: req.user.id, startAt, endAt, kind, note });
  res.status(201).json(toClientShape(exception));
});

export const deleteAvailabilityException = asyncHandler(async (req, res) => {
  const deleted = await deleteExceptionById(req.params.id, req.user.id);
  if (!deleted) throw ApiError.notFound('Exception not found');
  res.status(204).send();
});
