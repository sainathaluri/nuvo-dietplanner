import {
  createEnquiry as createEnquiryRecord,
  listEnquiries as queryEnquiries,
  countEnquiries,
  findEnquiryById,
  updateEnquiryById,
  deleteEnquiryById,
} from '../models/Enquiry.js';
import { listByEnquiryId, createHistoryEntry } from '../models/EnquiryHistory.js';
import { findUserByEmail, createUser as createUserRecord } from '../models/User.js';
import { createCall as createCallRecord } from '../models/Call.js';
import { hashPassword } from '../utils/password.js';
import { withTransaction } from '../db/pool.js';
import { assertSlotAvailable } from '../services/availabilityGuard.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { toClientShape } from '../utils/serialize.js';

// Shared by the 'follow-up' and 'converted' transitions: creates the lead's real client account
// the first time either one is reached, reusing the exact same create-user path
// user.controller.js#createUser already uses (hash the temp password, force a change on first
// login). Returns the existing converted_user_id unchanged if the enquiry already has one — a
// second Follow-up (or Converted after Follow-up) never creates a duplicate account.
async function ensureConvertedAccount(enquiry, { planId, planDuration, password, assignedDietitian = null }) {
  if (enquiry.convertedUserId) return enquiry.convertedUserId;

  if (!password || !planId || !planDuration) {
    throw ApiError.badRequest('password, planId, and planDuration are required to create the client account');
  }
  if (await findUserByEmail(enquiry.email)) {
    throw ApiError.conflict('A user with this email is already registered');
  }

  const user = await createUserRecord({
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    passwordHash: await hashPassword(password),
    role: 'client',
    assignedDietitian,
    programPlan: planId,
    planDuration,
    mustChangePassword: true,
  });
  return user.id;
}

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

// Every transition appends one enquiry_history row (status + note, immutable) — see
// server/src/schemas/enquiry.schema.js for which statuses require a note and why. 'follow-up' and
// 'converted' additionally create a client account the first time either is reached (see
// ensureConvertedAccount above); 'follow-up' also books a real call.
export const updateEnquiry = asyncHandler(async (req, res) => {
  const existing = await findEnquiryById(req.params.id);
  if (!existing) throw ApiError.notFound('Enquiry not found');

  const { status, note, planId, planDuration, password } = req.body;
  let callId = null;
  let convertedUserId = existing.convertedUserId;

  if (status === 'follow-up' || status === 'converted') {
    const alreadyConverted = Boolean(convertedUserId);
    convertedUserId = await ensureConvertedAccount(existing, {
      planId,
      planDuration,
      password,
      assignedDietitian: status === 'follow-up' ? req.body.dietitian : null,
    });
    // Persisted immediately, before the call-booking step below (which can still fail with a
    // 409). Otherwise a newly-created account would be orphaned on failure: the enquiry would
    // never learn its id, so a retry could neither reuse it (unknown id) nor create a fresh one
    // (the email's already taken) — permanently stuck.
    if (!alreadyConverted) await updateEnquiryById(req.params.id, { convertedUserId });
  }

  if (status === 'follow-up') {
    const { dietitian, scheduledAt } = req.body;
    // Reuses the exact same transaction + availability-check + call-creation path
    // call.controller.js#createCall's non-force branch already uses — a 409 from
    // assertSlotAvailable bubbles up unchanged if the slot's no longer free.
    const call = await withTransaction(async (conn) => {
      await assertSlotAvailable({ dietitianId: dietitian, scheduledAt }, conn);
      return createCallRecord({ client: convertedUserId, dietitian, scheduledAt, notes: note }, conn);
    });
    callId = call.id;
  }

  if (status !== 'new') {
    await createHistoryEntry({ enquiryId: existing.id, status, note: note ?? null, callId });
  }

  const enquiry = await updateEnquiryById(req.params.id, { status, note, convertedUserId });
  res.json(toClientShape(enquiry));
});

// Admin-only sub-resource — mirrors report.controller.js's feedback pattern. Returns the full,
// immutable timeline for one enquiry (never paginated — a single lead's history stays small).
export const getEnquiryHistory = asyncHandler(async (req, res) => {
  const enquiry = await findEnquiryById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  const history = await listByEnquiryId(req.params.id);
  res.json(history.map((entry) => toClientShape(entry)));
});

export const deleteEnquiry = asyncHandler(async (req, res) => {
  const enquiry = await deleteEnquiryById(req.params.id);
  if (!enquiry) throw ApiError.notFound('Enquiry not found');
  res.status(204).send();
});
