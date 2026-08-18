import { z } from 'zod';

// Testing-stage feature (see server/src/jobs/callScheduler.js): 'once' means no auto-rescheduling;
// any other value rolls the call forward to the next occurrence, at the same time-of-day, once its
// scheduled_at passes. reminderMinutesBefore drives the client's in-app pop-up reminder — null/0
// means no reminder.
const frequency = z.enum(['once', 'daily', 'weekly', 'biweekly', 'monthly']).optional();
const reminderMinutesBefore = z.coerce.number().int().min(0).max(1440).nullable().optional();

export const createCallSchema = z.object({
  // A client booking their own call sends neither — the server derives both from the caller's
  // assignedDietitian. A dietitian/admin booking on someone's behalf must supply both.
  client: z.string().min(1).optional(),
  dietitian: z.string().min(1).optional(),
  scheduledAt: z.coerce.date(),
  notes: z.string().optional(),
  frequency,
  reminderMinutesBefore,
});

export const updateCallSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
  frequency,
  reminderMinutesBefore,
});
