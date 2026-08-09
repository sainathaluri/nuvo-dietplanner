import { z } from 'zod';

export const createProgressSchema = z.object({
  date: z.coerce.date(),
  weight: z.number(),
  energy: z.number().min(0).max(10).optional(),
  adherence: z.number().min(0).max(100).optional(),
});

export const updateProgressSchema = createProgressSchema.partial();
