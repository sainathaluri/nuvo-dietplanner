import mongoose from 'mongoose';

const mealSlotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    time: { type: String, required: true },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Snack', 'Dinner'], required: true },
    recipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  },
  { _id: false }
);

const planSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dietitian: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Weekly nourish plan' },
    week: { type: Date, required: true },
    meals: { type: [mealSlotSchema], default: [] },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Plan = mongoose.model('Plan', planSchema);
