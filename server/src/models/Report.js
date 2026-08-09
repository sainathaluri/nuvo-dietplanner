import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    note: { type: String },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
    review: { type: String },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);
