import mongoose from 'mongoose';

const { Schema } = mongoose;

const orgFollowSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    org: { type: String, required: true }, // canonical casing from GitHub, e.g. "Microsoft"
    orgKey: { type: String, required: true }, // lowercase, for lookups and grouping
    avatarUrl: { type: String, default: null },
    // The job has checked this org for new issues up to this moment
    lastCheckedAt: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

orgFollowSchema.index({ user: 1, orgKey: 1 }, { unique: true });
orgFollowSchema.index({ orgKey: 1 });

export default mongoose.model('OrgFollow', orgFollowSchema);