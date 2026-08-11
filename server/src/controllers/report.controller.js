import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { assertDietitianOwnsClient } from '../utils/scope.js';

export const listReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'client') {
    filter.client = req.user.id;
  } else if (req.query.client) {
    await assertDietitianOwnsClient(req, req.query.client);
    filter.client = req.query.client;
  } else if (req.user.role === 'dietitian') {
    // No ?client= given: default to "my clients' reports", not every report on the platform.
    const myClients = await User.find({ assignedDietitian: req.user.id }).select('_id');
    filter.client = { $in: myClients.map((c) => c._id) };
  }

  res.json(await Report.find(filter).populate('client', 'name').sort({ createdAt: -1 }));
});

export const createReport = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('file is required');

  const report = await Report.create({
    client: req.user.id,
    fileName: req.file.originalname,
    filePath: req.file.filename,
    note: req.body.note,
  });
  res.status(201).json(report);
});

// Appends one entry to the report's feedback thread (and updates status alongside) rather than
// replacing a single review field — a report can go through several rounds of dietitian review.
export const addReportFeedback = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');

  report.feedback.push({ author: req.user.id, authorName: req.user.name, message: req.body.message });
  report.status = req.body.status;
  await report.save();
  res.json(report);
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  if (req.user.role !== 'admin' && String(report.client) !== req.user.id) throw ApiError.forbidden();

  await report.deleteOne();
  res.status(204).send();
});
