import mongoose from 'mongoose';

const feedbackEntrySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const reportSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    note: { type: String },
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
    feedback: { type: [feedbackEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const Report = mongoose.model('Report', reportSchema);
