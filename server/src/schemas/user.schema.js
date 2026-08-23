import { z } from 'zod';
import { PLAN_DURATIONS } from '../constants/planDurations.js';

// Only meaningful for role: 'client' — applied conditionally in the controller, same convention
// as assignedDietitian.
const programPlan = z.string().min(1).nullable().optional();
const planDuration = z.enum(PLAN_DURATIONS).nullable().optional();

// Deliberately lenient (allows digits, spaces, and the usual separators/prefix) rather than a
// strict E.164-only pattern — this app has no SMS/telephony integration to require a dialable
// format for, and a too-strict pattern would just reject real numbers with local formatting
// conventions. Still real format validation, not "any non-empty string" (spec §2026-round2-fixes
// items 2/3's explicit ask).
const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s\-().]{6,19}$/, 'Enter a valid phone number');

const address = z.string().trim().min(1, 'Enter an address').max(255);

const email = z.string().trim().toLowerCase().email('Enter a valid email address');

// '' alongside the real pattern so a controlled form field that hasn't been touched (or was
// cleared) can be submitted without failing format validation — emptiness vs. "wrong format" are
// different failures, and only fields actually required (see the dietitian superRefine below)
// need to reject empty.
const optionalPhone = z.union([phone, z.literal('')]).optional();
const optionalAddress = z.union([address, z.literal('')]).optional();
const qualifications = z.string().trim().max(2000).optional();
const accountStatus = z.enum(['active', 'inactive', 'suspended']).optional();

// Must be a real IANA zone name — Intl.DateTimeFormat throws RangeError on anything else, which is
// the standard way to validate one without a lookup table (no timezone library ships a full,
// current IANA list to hand-check against; the JS runtime's own tz database already is that list).
// Only meaningful for role='dietitian' — see the column comment in schema.sql.
const timezone = z
  .string()
  .min(1)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Not a valid IANA timezone name (e.g. "Asia/Kolkata")' }
  )
  .optional();

export const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: optionalPhone,
  assignedDietitian: z.string().min(1).nullable().optional(),
  timezone,
});

// email/phone/address/qualifications/accountStatus are new (spec §2026-round2-fixes items 2/3).
// email uniqueness (excluding the user's own current row) is checked in the controller — a static
// schema can't see other rows. Reachable by an admin editing anyone, or a dietitian editing their
// own assigned client's contact info only (see user.controller.js#updateUser's ownership check) —
// the schema itself doesn't need to know which caller it is; the controller enforces which fields
// each caller may actually send.
export const updateUserSchema = z.object({
  role: z.enum(['client', 'dietitian', 'admin']).optional(),
  assignedDietitian: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  email: email.optional(),
  phone: optionalPhone,
  address: optionalAddress,
  qualifications,
  accountStatus,
  programPlan,
  planDuration,
  timezone,
});

export const createUserSchema = z
  .object({
    name: z.string().min(1),
    email,
    password: z.string().min(8),
    role: z.enum(['client', 'dietitian', 'admin']),
    phone: optionalPhone,
    address: optionalAddress,
    qualifications,
    assignedDietitian: z.string().min(1).nullable().optional(),
    programPlan,
    planDuration,
  })
  // Email is already required for every role above; phone/address are only required for a
  // dietitian (spec item 1's explicit "Add and require") — a client/admin account has no use for
  // either at creation time, matching how programPlan/planDuration are conditionally required in
  // the opposite direction (client-only).
  .superRefine((data, ctx) => {
    if (data.role !== 'dietitian') return;
    if (!data.phone) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Phone number is required for a dietitian', path: ['phone'] });
    }
    if (!data.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Address is required for a dietitian', path: ['address'] });
    }
  });
