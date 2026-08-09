import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    goal: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    preferredSlot: { type: String },
    note: { type: String },
    status: {
      type: String,
      enum: ['new', 'contacted', 'follow-up', 'converted', 'closed'],
      default: 'new',
    },
  },
  { timestamps: true }
);

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
