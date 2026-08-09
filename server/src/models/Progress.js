import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    weight: { type: Number, required: true },
    energy: { type: Number, min: 0, max: 10 },
    adherence: { type: Number, min: 0, max: 100 },
  },
  { timestamps: true }
);

export const Progress = mongoose.model('Progress', progressSchema);
