import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
  deleteEnquiry,
} from '../controllers/enquiry.controller.js';
import { createEnquirySchema, updateEnquirySchema } from '../schemas/enquiry.schema.js';

export const enquiryRouter = Router();

enquiryRouter.post('/', validate(createEnquirySchema), createEnquiry);
enquiryRouter.use(authenticate, authorize('admin'));
enquiryRouter.get('/', listEnquiries);
enquiryRouter.get('/:id', getEnquiry);
enquiryRouter.patch('/:id', validate(updateEnquirySchema), updateEnquiry);
enquiryRouter.delete('/:id', deleteEnquiry);
