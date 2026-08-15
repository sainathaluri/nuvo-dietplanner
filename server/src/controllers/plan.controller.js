import {
  listPlans as queryPlans,
  findPlanById,
  createPlan as createPlanRecord,
  updatePlanById,
  deletePlanById,
  updatePlanMealByIndex,
} from '../models/Plan.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';

function scopeToOwner(req, filter = {}) {
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.user.role === 'dietitian') filter.dietitian = req.user.id;
  return filter;
}

export const listPlans = asyncHandler(async (req, res) => {
  const filter = scopeToOwner(req);
  if (req.query.client && req.user.role !== 'client') filter.client = req.query.client;
  if (req.query.week) filter.week = new Date(req.query.week);
  const plans = await queryPlans(filter);
  res.json(plans.map((p) => toClientShape(p)));
});

export const getPlan = asyncHandler(async (req, res) => {
  const plan = await findPlanById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');

  const owns =
    req.user.role === 'admin' ||
    (req.user.role === 'client' && String(plan.client) === req.user.id) ||
    (req.user.role === 'dietitian' && String(plan.dietitian) === req.user.id);
  if (!owns) throw ApiError.forbidden();

  res.json(toClientShape(plan));
});

export const createPlan = asyncHandler(async (req, res) => {
  let { client, dietitian, ...rest } = req.body;

  if (req.user.role === 'dietitian') {
    // A dietitian can only ever author a plan as themselves, for one of their own clients —
    // never submit an arbitrary `dietitian` field or a client they aren't assigned to.
    dietitian = req.user.id;
    await assertDietitianOwnsClient(req, client);
  }

  const plan = await createPlanRecord({ client, dietitian, ...rest });
  res.status(201).json(toClientShape(plan));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const existing = await findPlanById(req.params.id);
  if (!existing) throw ApiError.notFound('Plan not found');
  if (req.user.role === 'dietitian' && String(existing.dietitian) !== req.user.id) throw ApiError.forbidden();

  const plan = await updatePlanById(req.params.id, req.body);
  res.json(toClientShape(plan));
});

export const deletePlan = asyncHandler(async (req, res) => {
  const existing = await findPlanById(req.params.id);
  if (!existing) throw ApiError.notFound('Plan not found');
  if (req.user.role === 'dietitian' && String(existing.dietitian) !== req.user.id) throw ApiError.forbidden();

  await deletePlanById(req.params.id);
  res.status(204).send();
});

// Client-only, narrowly scoped: can flip their own meal's completed/swapRequested flags, never
// the meal's content (day/time/mealType/recipe) — that stays dietitian/admin territory above.
export const updateMealStatus = asyncHandler(async (req, res) => {
  const existing = await findPlanById(req.params.id);
  if (!existing) throw ApiError.notFound('Plan not found');
  if (String(existing.client) !== req.user.id) throw ApiError.forbidden();

  if (!existing.meals[Number(req.params.index)]) throw ApiError.notFound('Meal not found');

  const plan = await updatePlanMealByIndex(req.params.id, Number(req.params.index), {
    completed: req.body.completed,
    swapRequested: req.body.swapRequested,
  });
  res.json(toClientShape(plan));
});
