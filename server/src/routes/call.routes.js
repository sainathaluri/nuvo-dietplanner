import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { listCalls, createCall, updateCall, deleteCall } from '../controllers/call.controller.js';
import { createCallSchema, updateCallSchema } from '../schemas/call.schema.js';

export const callRouter = Router();
callRouter.use(authenticate);

callRouter.get('/', listCalls);
callRouter.post('/', authorize('dietitian', 'admin'), validate(createCallSchema), createCall);
callRouter.patch('/:id', validate(updateCallSchema), updateCall);
callRouter.delete('/:id', authorize('dietitian', 'admin'), deleteCall);
