import mongoose from 'mongoose';

const { Schema } = mongoose;

export const APPLICATION_STATUSES = ['pending', 'accepted', 'declined'];

const applicationSchema = new Schema(
  {
    opportunity: { type: Schema.Types.ObjectId, ref: 'Opportunity', required: true },
    applicant: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
    reply: { type: String, maxlength: 1000, default: '' },
    respondedAt: Date,
  },
  { timestamps: true },
);

// One application per person per opportunity, enforced by the database
applicationSchema.index({ opportunity: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ opportunity: 1, status: 1 });
applicationSchema.index({ applicant: 1, createdAt: -1 });

export default mongoose.model('Application', applicationSchema);