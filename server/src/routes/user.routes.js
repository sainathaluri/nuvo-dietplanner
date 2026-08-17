import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { listUsers, getUser, updateMe, updateUser, createUser } from '../controllers/user.controller.js';
import { updateMeSchema, updateUserSchema, createUserSchema } from '../schemas/user.schema.js';

export const userRouter = Router();
userRouter.use(authenticate);

userRouter.get('/', authorize('admin', 'dietitian', 'client'), listUsers);
userRouter.get('/:id', getUser);
userRouter.patch('/me', validate(updateMeSchema), updateMe);
userRouter.patch('/:id', authorize('admin'), validate(updateUserSchema), updateUser);
userRouter.post('/', authorize('admin'), validate(createUserSchema), createUser);
