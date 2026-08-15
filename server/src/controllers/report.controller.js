import {
  listReports as queryReports,
  createReport as createReportRecord,
  findReportById,
  addReportFeedback as addReportFeedbackRecord,
  deleteReportById,
} from '../models/Report.js';
import { listClientIdsByDietitian } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';
import { toClientShape } from '../utils/serialize.js';

export const listReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'client') {
    filter.client = req.user.id;
  } else if (req.query.client) {
    await assertDietitianOwnsClient(req, req.query.client);
    filter.client = req.query.client;
  } else if (req.user.role === 'dietitian') {
    // No ?client= given: default to "my clients' reports", not every report on the platform.
    filter.clientIn = await listClientIdsByDietitian(req.user.id);
  }

  const reports = await queryReports(filter);
  res.json(reports.map((r) => toClientShape(r)));
});

export const createReport = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('file is required');

  const report = await createReportRecord({
    client: req.user.id,
    fileName: req.file.originalname,
    filePath: req.file.filename,
    note: req.body.note,
  });
  res.status(201).json(toClientShape(report));
});

// Appends one entry to the report's feedback thread (and updates status alongside) rather than
// replacing a single review field — a report can go through several rounds of dietitian review.
export const addReportFeedback = asyncHandler(async (req, res) => {
  const existing = await findReportById(req.params.id);
  if (!existing) throw ApiError.notFound('Report not found');

  const report = await addReportFeedbackRecord(req.params.id, {
    authorId: req.user.id,
    authorName: req.user.name,
    message: req.body.message,
    status: req.body.status,
  });
  res.json(toClientShape(report));
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await findReportById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  if (req.user.role !== 'admin' && String(report.client) !== req.user.id) throw ApiError.forbidden();

  await deleteReportById(req.params.id);
  res.status(204).send();
});
