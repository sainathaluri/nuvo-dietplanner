import { z } from 'zod';

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  emoji: z.string().optional(),
  mealType: z.enum(['Breakfast', 'Lunch', 'Snack', 'Dinner']),
  prepTime: z.string().min(1),
  tags: z.array(z.string()).optional(),
  kcal: z.number().optional(),
  protein: z.number().optional(),
  ingredients: z.string().min(1),
  instructions: z.string().min(1),
});

export const updateRecipeSchema = createRecipeSchema.partial();
