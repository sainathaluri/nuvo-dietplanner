import { Router } from 'express';
import rateLimit from 'express-rate-limit';
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
import {
  createEnquirySchema,
  updateEnquirySchema,
  listEnquiriesQuerySchema,
} from '../schemas/enquiry.schema.js';

export const enquiryRouter = Router();

const createEnquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many enquiries submitted. Please try again in a while.' },
});

enquiryRouter.post('/', createEnquiryLimiter, validate(createEnquirySchema), createEnquiry);
enquiryRouter.use(authenticate, authorize('admin'));
enquiryRouter.get('/', validate(listEnquiriesQuerySchema, 'query'), listEnquiries);
enquiryRouter.get('/:id', getEnquiry);
enquiryRouter.patch('/:id', validate(updateEnquirySchema), updateEnquiry);
enquiryRouter.delete('/:id', deleteEnquiry);
