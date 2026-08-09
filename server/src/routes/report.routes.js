import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { listReports, createReport, reviewReport, deleteReport } from '../controllers/report.controller.js';
import { reviewReportSchema } from '../schemas/report.schema.js';

export const reportRouter = Router();
reportRouter.use(authenticate);

reportRouter.get('/', listReports);
reportRouter.post('/', authorize('client'), upload.single('file'), createReport);
reportRouter.patch('/:id', authorize('dietitian', 'admin'), validate(reviewReportSchema), reviewReport);
reportRouter.delete('/:id', deleteReport);
