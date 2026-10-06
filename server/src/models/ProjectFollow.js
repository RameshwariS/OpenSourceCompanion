import mongoose from 'mongoose';

const { Schema } = mongoose;

const projectFollowSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// The database guarantees one follow per (user, project).
projectFollowSchema.index({ user: 1, project: 1 }, { unique: true });
// "Who follows this project?" (follower counts now, notifications in Phase 8)
projectFollowSchema.index({ project: 1 });

export default mongoose.model('ProjectFollow', projectFollowSchema);