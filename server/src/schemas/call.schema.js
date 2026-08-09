import { z } from 'zod';

export const createCallSchema = z.object({
  client: z.string().min(1),
  dietitian: z.string().min(1),
  scheduledAt: z.coerce.date(),
  notes: z.string().optional(),
});

export const updateCallSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
  notes: z.string().optional(),
});
