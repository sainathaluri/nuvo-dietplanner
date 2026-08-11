import { z } from 'zod';

export const createCallSchema = z.object({
  // A client booking their own call sends neither — the server derives both from the caller's
  // assignedDietitian. A dietitian/admin booking on someone's behalf must supply both.
  client: z.string().min(1).optional(),
  dietitian: z.string().min(1).optional(),
  scheduledAt: z.coerce.date(),
  notes: z.string().optional(),
});

export const updateCallSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
});
