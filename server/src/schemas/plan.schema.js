import { z } from 'zod';

const mealSlot = z.object({
  day: z.string().min(1),
  time: z.string().min(1),
  mealType: z.enum(['Breakfast', 'Lunch', 'Snack', 'Dinner']),
  recipe: z.string().nullable().optional(),
});

export const createPlanSchema = z.object({
  client: z.string().min(1),
  dietitian: z.string().min(1),
  title: z.string().optional(),
  week: z.coerce.date(),
  meals: z.array(mealSlot).optional(),
});

export const updatePlanSchema = z.object({
  title: z.string().optional(),
  meals: z.array(mealSlot).optional(),
  published: z.boolean().optional(),
});
