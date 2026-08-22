import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import {
  getWeeklyHours,
  putWeeklyHours,
  listAvailabilityExceptions,
  createAvailabilityException,
  deleteAvailabilityException,
} from '../controllers/availability.controller.js';
import { weeklyHoursSchema, createExceptionSchema } from '../schemas/availability.schema.js';

export const availabilityRouter = Router();
// Dietitian self-service only — no admin-on-behalf-of path (see docs/API.md).
availabilityRouter.use(authenticate, blockIfMustChangePassword, authorize('dietitian'));

availabilityRouter.get('/weekly-hours', getWeeklyHours);
availabilityRouter.put('/weekly-hours', validate(weeklyHoursSchema), putWeeklyHours);
availabilityRouter.get('/exceptions', listAvailabilityExceptions);
availabilityRouter.post('/exceptions', validate(createExceptionSchema), createAvailabilityException);
availabilityRouter.delete('/exceptions/:id', deleteAvailabilityException);
