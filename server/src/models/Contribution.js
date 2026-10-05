import mongoose from 'mongoose';

const { Schema } = mongoose;

export const CONTRIBUTION_STATUSES = [
  'interested',
  'planning',
  'working',
  'pr_opened',
  'changes_requested',
  'merged',
  'closed',
];

const contributionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    status: { type: String, enum: CONTRIBUTION_STATUSES, default: 'interested' },
    notes: { type: String, maxlength: 2000, default: '' },
  },
  { timestamps: true },
);

contributionSchema.index({ user: 1, issue: 1 }, { unique: true }); // track an issue once
contributionSchema.index({ user: 1, status: 1 });

export default mongoose.model('Contribution', contributionSchema);