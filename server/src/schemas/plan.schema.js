import { z } from 'zod';

const mealSlot = z.object({
  day: z.string().min(1),
  time: z.string().min(1),
  mealType: z.enum(['Breakfast', 'Lunch', 'Snack', 'Dinner']),
  recipe: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export const createPlanSchema = z
  .object({
    client: z.string().min(1),
    // A dietitian caller never sends this — the server derives it from the caller. Only an admin
    // assigning a plan on a dietitian's behalf supplies it explicitly.
    dietitian: z.string().min(1).optional(),
    title: z.string().optional(),
    week: z.coerce.date(),
    // The end of the diet week — always exactly 6 days after `week` (the client auto-computes and
    // locks this in the UI; this refine is the authoritative boundary check).
    weekEnd: z.coerce.date(),
    meals: z.array(mealSlot).optional(),
  })
  .refine((data) => data.weekEnd.getTime() - data.week.getTime() === 6 * ONE_DAY_MS, {
    message: 'Week end must be 6 days after week start',
    path: ['weekEnd'],
  });

export const updatePlanSchema = z.object({
  title: z.string().optional(),
  meals: z.array(mealSlot).optional(),
  published: z.boolean().optional(),
});

export const updateMealStatusSchema = z
  .object({
    completed: z.boolean().optional(),
    swapRequested: z.boolean().optional(),
  })
  .refine((data) => data.completed !== undefined || data.swapRequested !== undefined, {
    message: 'Provide completed or swapRequested',
  });
