import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { blockIfMustChangePassword } from '../middleware/blockIfMustChangePassword.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { listReports, createReport, addReportFeedback, deleteReport } from '../controllers/report.controller.js';
import { addReportFeedbackSchema } from '../schemas/report.schema.js';

export const reportRouter = Router();
reportRouter.use(authenticate, blockIfMustChangePassword);

reportRouter.get('/', listReports);
reportRouter.post('/', authorize('client'), upload.single('file'), createReport);
reportRouter.post(
  '/:id/feedback',
  authorize('dietitian', 'admin'),
  validate(addReportFeedbackSchema),
  addReportFeedback
);
reportRouter.delete('/:id', deleteReport);
