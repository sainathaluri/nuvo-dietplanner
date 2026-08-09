import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  listProgress,
  createProgress,
  updateProgress,
  deleteProgress,
} from '../controllers/progress.controller.js';
import { createProgressSchema, updateProgressSchema } from '../schemas/progress.schema.js';

export const progressRouter = Router();
progressRouter.use(authenticate);

progressRouter.get('/', listProgress);
progressRouter.post('/', authorize('client'), validate(createProgressSchema), createProgress);
progressRouter.patch('/:id', validate(updateProgressSchema), updateProgress);
progressRouter.delete('/:id', deleteProgress);
