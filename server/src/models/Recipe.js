import mongoose from 'mongoose';

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    emoji: { type: String, default: '🍽️' },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Snack', 'Dinner'], required: true },
    prepTime: { type: String, required: true },
    tags: { type: [String], default: [] },
    kcal: { type: Number },
    protein: { type: Number },
    ingredients: { type: String, required: true },
    instructions: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Recipe = mongoose.model('Recipe', recipeSchema);
