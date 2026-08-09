import { Enquiry } from '../models/Enquiry.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';

export const createEnquiry = asyncHandler(async (req, res) => {
  res.status(201).json(await Enquiry.create(req.body));
});

export const listEnquiries = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  res.json(await Enquiry.find(filter).sort({ createdAt: -1 }));
});

export const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.json(enquiry);
});

export const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.json(enquiry);
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.status(204).send();
});
