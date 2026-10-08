import mongoose from 'mongoose';

const { Schema } = mongoose;

export const NOTIFICATION_TYPES = ['org_issue', 'org_issue_summary', 'pr_merged', 'issue_closed'];

const notificationSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true, maxlength: 300 },
    // An internal path ("/issues/acme/widgets/7") or a https://github.com/ URL
    link: { type: String, default: '' },
    // Identifies the EVENT (e.g. "org-issue:12345") so a job that runs twice can't notify twice
    dedupeKey: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, readAt: 1 });
// MongoDB deletes notifications 90 days after creation
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 });

export default mongoose.model('Notification', notificationSchema);