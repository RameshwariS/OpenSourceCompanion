import mongoose from 'mongoose';

const { Schema } = mongoose;

// A SNAPSHOT of a GitHub repository that a maintainer registered. GitHub stays the
// source of truth; list pages read these stored values so they never call GitHub.
const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // who listed it
    repoFullName: { type: String, required: true }, // canonical casing from GitHub: "facebook/react"
    repoKey: { type: String, required: true, unique: true }, // lowercase, for case-insensitive uniqueness

    name: { type: String, required: true },
    description: { type: String, default: '' },
    language: { type: String, default: null },
    topics: { type: [String], default: [] },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    license: { type: String, default: null },
    archived: { type: Boolean, default: false },
    avatarUrl: { type: String, default: null },

    verified: { type: Boolean, default: false },

    beginnerIssueCount: { type: Number, default: 0 },
    helpWantedIssueCount: { type: Number, default: 0 },
    contributorsCount: { type: Number, default: null }, // null = unknown

    // The only fields maintainers write themselves. Everything else comes from GitHub.
    summary: { type: String, maxlength: 1000, default: '' },
    contributingUrl: { type: String, default: '' },

    lastSyncedAt: Date,
  },
  { timestamps: true },
);

projectSchema.index({ language: 1, stars: -1 });
projectSchema.index({ topics: 1 });
projectSchema.index({ owner: 1 });
projectSchema.index({ stars: -1 });
projectSchema.index({ createdAt: -1 });

export default mongoose.model('Project', projectSchema);