import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  assignedDietitian: z.string().min(1).nullable().optional(),
});

export const updateUserSchema = z.object({
  role: z.enum(['client', 'dietitian', 'admin']).optional(),
  assignedDietitian: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
});

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['client', 'dietitian', 'admin']),
  assignedDietitian: z.string().min(1).nullable().optional(),
});
