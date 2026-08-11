import { Progress } from '../models/Progress.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';

export const listProgress = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.query.client) {
    await assertDietitianOwnsClient(req, req.query.client);
    filter.client = req.query.client;
  } else throw ApiError.badRequest('client query param required');

  res.json(await Progress.find(filter).sort({ date: 1 }));
});

export const createProgress = asyncHandler(async (req, res) => {
  res.status(201).json(await Progress.create({ ...req.body, client: req.user.id }));
});

export const updateProgress = asyncHandler(async (req, res) => {
  const entry = await Progress.findById(req.params.id);
  if (!entry) throw ApiError.notFound('Progress entry not found');
  if (req.user.role !== 'admin' && String(entry.client) !== req.user.id) throw ApiError.forbidden();

  Object.assign(entry, req.body);
  await entry.save();
  res.json(entry);
});

export const deleteProgress = asyncHandler(async (req, res) => {
  const entry = await Progress.findById(req.params.id);
  if (!entry) throw ApiError.notFound('Progress entry not found');
  if (req.user.role !== 'admin' && String(entry.client) !== req.user.id) throw ApiError.forbidden();

  await entry.deleteOne();
  res.status(204).send();
});
