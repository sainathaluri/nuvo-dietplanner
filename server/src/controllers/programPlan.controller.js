import {
  listProgramPlans as queryProgramPlans,
  findProgramPlanById,
  createProgramPlan as createProgramPlanRecord,
  updateProgramPlanById,
} from '../models/ProgramPlan.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

// Readable by admin and dietitian ("automatically available to every dietitian for their
// clients") — only admin can create/edit (enforced in the router via authorize()).
export const listProgramPlans = asyncHandler(async (req, res) => {
  const activeOnly = req.user.role !== 'admin' || req.query.activeOnly === 'true';
  const plans = await queryProgramPlans({ activeOnly });
  res.json(plans.map((p) => toClientShape(p)));
});

export const createProgramPlan = asyncHandler(async (req, res) => {
  const plan = await createProgramPlanRecord(req.body);
  res.status(201).json(toClientShape(plan));
});

export const updateProgramPlan = asyncHandler(async (req, res) => {
  const existing = await findProgramPlanById(req.params.id);
  if (!existing) throw ApiError.notFound('Plan not found');
  const plan = await updateProgramPlanById(req.params.id, req.body);
  res.json(toClientShape(plan));
});
