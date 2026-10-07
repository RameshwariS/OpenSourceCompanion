import mongoose from 'mongoose';
import { DIFFICULTIES } from '../services/difficulty.service.js';

const { Schema } = mongoose;

export const OPPORTUNITY_STATUSES = ['open', 'closed'];

const opportunitySchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 5000 },
    skills: { type: [String], default: [] },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    expectedHoursMin: { type: Number, required: true, min: 1, max: 500 },
    expectedHoursMax: { type: Number, required: true, min: 1, max: 500 },

    status: { type: String, enum: OPPORTUNITY_STATUSES, default: 'open' },
  },
  { timestamps: true },
);

opportunitySchema.index({ status: 1, createdAt: -1 });
opportunitySchema.index({ project: 1, status: 1 });
opportunitySchema.index({ createdBy: 1, createdAt: -1 });
opportunitySchema.index({ difficulty: 1 });
opportunitySchema.index({ skills: 1 });

export default mongoose.model('Opportunity', opportunitySchema);