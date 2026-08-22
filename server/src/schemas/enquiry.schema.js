import { z } from 'zod';
import { PLAN_DURATIONS } from '../constants/planDurations.js';

export const createEnquirySchema = z.object({
  goal: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  preferredSlot: z.string().optional(),
  note: z.string().optional(),
});

// Every status transition appends to enquiry_history — nothing is ever overwritten (see
// enquiry.controller.js#updateEnquiry). Each status has its own required fields:
// - 'new': no extra fields (rarely used — mostly a reset/undo path).
// - 'contacted': conversation notes are required.
// - 'closed' ("Unsuccessful" in the UI): a reason is required.
// - 'follow-up': books a real call through the availability service, so needs a dietitian + a
//   slot. Also creates the lead's client account the first time (planId/planDuration/password
//   required then, checked in the controller since it depends on DB state a static schema can't
//   see) — if the enquiry was already converted (e.g. via a prior follow-up), these are omitted.
// - 'converted': creates the same account (no dietitian/call) if one doesn't already exist yet.
export const updateEnquirySchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('new') }),
  z.object({ status: z.literal('contacted'), note: z.string().min(1, 'Add a note about the conversation') }),
  z.object({ status: z.literal('closed'), note: z.string().min(1, 'Add a reason') }),
  z.object({
    status: z.literal('follow-up'),
    dietitian: z.string().min(1),
    scheduledAt: z.coerce.date(),
    planId: z.string().min(1).optional(),
    planDuration: z.enum(PLAN_DURATIONS).optional(),
    password: z.string().min(8).optional(),
    note: z.string().optional(),
  }),
  z.object({
    status: z.literal('converted'),
    planId: z.string().min(1).optional(),
    planDuration: z.enum(PLAN_DURATIONS).optional(),
    password: z.string().min(8).optional(),
  }),
]);

export const listEnquiriesQuerySchema = z.object({
  status: z.enum(['new', 'contacted', 'follow-up', 'converted', 'closed']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
