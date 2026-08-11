import { z } from 'zod';

const mealSlot = z.object({
  day: z.string().min(1),
  time: z.string().min(1),
  mealType: z.enum(['Breakfast', 'Lunch', 'Snack', 'Dinner']),
  recipe: z.string().nullable().optional(),
});

export const createPlanSchema = z.object({
  client: z.string().min(1),
  // A dietitian caller never sends this — the server derives it from the caller. Only an admin
  // assigning a plan on a dietitian's behalf supplies it explicitly.
  dietitian: z.string().min(1).optional(),
  title: z.string().optional(),
  week: z.coerce.date(),
  meals: z.array(mealSlot).optional(),
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
