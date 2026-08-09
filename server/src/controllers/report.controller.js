import { Report } from '../models/Report.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const listReports = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'client') filter.client = req.user.id;
  else if (req.query.client) filter.client = req.query.client;

  res.json(await Report.find(filter).sort({ createdAt: -1 }));
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

export const reviewReport = asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(
    req.params.id,
    { ...req.body, reviewedBy: req.user.id },
    { new: true, runValidators: true }
  );
  if (!report) throw ApiError.notFound('Report not found');
  res.json(report);
});

export const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');
  if (req.user.role !== 'admin' && String(report.client) !== req.user.id) throw ApiError.forbidden();

  await report.deleteOne();
  res.status(204).send();
});
