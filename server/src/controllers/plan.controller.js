import { Plan } from '../models/Plan.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

function scopeToOwner(req, filter = {}) {
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.user.role === 'dietitian') filter.dietitian = req.user.id;
  return filter;
}

export const listPlans = asyncHandler(async (req, res) => {
  const filter = scopeToOwner(req);
  if (req.query.client && req.user.role !== 'client') filter.client = req.query.client;
  if (req.query.week) filter.week = new Date(req.query.week);
  res.json(await Plan.find(filter).populate('meals.recipe').sort({ week: -1 }));
});

export const getPlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id).populate('meals.recipe');
  if (!plan) throw ApiError.notFound('Plan not found');

  const owns =
    req.user.role === 'admin' ||
    (req.user.role === 'client' && String(plan.client) === req.user.id) ||
    (req.user.role === 'dietitian' && String(plan.dietitian) === req.user.id);
  if (!owns) throw ApiError.forbidden();

  res.json(plan);
});

export const createPlan = asyncHandler(async (req, res) => {
  res.status(201).json(await Plan.create(req.body));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!plan) throw ApiError.notFound('Plan not found');
  res.json(plan);
});

export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findByIdAndDelete(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  res.status(204).send();
});
