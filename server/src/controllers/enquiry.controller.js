import {
  createEnquiry as createEnquiryRecord,
  listEnquiries as queryEnquiries,
  countEnquiries,
  findEnquiryById,
  updateEnquiryById,
  deleteEnquiryById,
} from '../models/Enquiry.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

export const createEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await createEnquiryRecord(req.body);
  res.status(201).json(toClientShape(enquiry));
});

export const listEnquiries = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const page = req.query.page ?? 1;
  const limit = req.query.limit ?? 20;
  const skip = (page - 1) * limit;

  const [enquiries, total] = await Promise.all([
    queryEnquiries(filter, { skip, limit }),
    countEnquiries(filter),
  ]);

  res.json({
    enquiries: enquiries.map((e) => toClientShape(e)),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const getEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await findEnquiryById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.json(toClientShape(enquiry));
});

export const updateEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await updateEnquiryById(req.params.id, req.body);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.json(toClientShape(enquiry));
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await deleteEnquiryById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.status(204).send();
});
