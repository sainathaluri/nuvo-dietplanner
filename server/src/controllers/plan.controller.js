import { Plan } from '../models/Plan.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';

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
  let { client, dietitian, ...rest } = req.body;

  if (req.user.role === 'dietitian') {
    // A dietitian can only ever author a plan as themselves, for one of their own clients —
    // never submit an arbitrary `dietitian` field or a client they aren't assigned to.
    dietitian = req.user.id;
    await assertDietitianOwnsClient(req, client);
  }

  const plan = await Plan.create({ client, dietitian, ...rest });
  res.status(201).json(await plan.populate('meals.recipe'));
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  if (req.user.role === 'dietitian' && String(plan.dietitian) !== req.user.id) throw ApiError.forbidden();

  Object.assign(plan, req.body);
  await plan.save();
  res.json(await plan.populate('meals.recipe'));
});

export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  if (req.user.role === 'dietitian' && String(plan.dietitian) !== req.user.id) throw ApiError.forbidden();

  await plan.deleteOne();
  res.status(204).send();
});

// Client-only, narrowly scoped: can flip their own meal's completed/swapRequested flags, never
// the meal's content (day/time/mealType/recipe) — that stays dietitian/admin territory above.
export const updateMealStatus = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) throw ApiError.notFound('Plan not found');
  if (String(plan.client) !== req.user.id) throw ApiError.forbidden();

  const meal = plan.meals[Number(req.params.index)];
  if (!meal) throw ApiError.notFound('Meal not found');

  if (req.body.completed !== undefined) meal.completed = req.body.completed;
  if (req.body.swapRequested !== undefined) meal.swapRequested = req.body.swapRequested;

  await plan.save();
  res.json(await plan.populate('meals.recipe'));
});
