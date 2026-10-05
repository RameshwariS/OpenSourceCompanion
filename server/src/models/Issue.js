import mongoose from 'mongoose';

const { Schema } = mongoose;

const labelSchema = new Schema({ name: String, color: String }, { _id: false });

// A SNAPSHOT of a GitHub issue. We only store issues someone bookmarked or tracked,
// never a mirror of GitHub. Difficulty is not stored, it's computed from labels.
const issueSchema = new Schema(
  {
    githubId: { type: Number, required: true, unique: true },
    repoFullName: { type: String, required: true },
    number: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    state: { type: String, enum: ['open', 'closed'], required: true },
    labels: { type: [labelSchema], default: [] },
    language: String,
    repoStars: Number,
    commentsCount: { type: Number, default: 0 },
    authorLogin: String,
    authorAvatarUrl: String,
    htmlUrl: { type: String, required: true },
    githubCreatedAt: Date,
    githubUpdatedAt: Date,
    syncedAt: Date,
  },
  { timestamps: true },
);

issueSchema.index({ repoFullName: 1, number: 1 });

export default mongoose.model('Issue', issueSchema);