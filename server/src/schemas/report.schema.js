import { z } from 'zod';

export const reviewReportSchema = z.object({
  review: z.string().min(1),
  status: z.enum(['pending', 'reviewed']).default('reviewed'),
});
