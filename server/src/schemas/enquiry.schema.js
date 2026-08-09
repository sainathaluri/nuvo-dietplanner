import { z } from 'zod';

export const createEnquirySchema = z.object({
  goal: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  preferredSlot: z.string().optional(),
  note: z.string().optional(),
});

export const updateEnquirySchema = z.object({
  status: z.enum(['new', 'contacted', 'follow-up', 'converted', 'closed']).optional(),
  note: z.string().optional(),
});
