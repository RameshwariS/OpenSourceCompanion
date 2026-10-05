import mongoose from 'mongoose';

const { Schema } = mongoose;

const bookmarkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issue: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// The DATABASE guarantees no duplicates, even for two simultaneous requests.
bookmarkSchema.index({ user: 1, issue: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Bookmark', bookmarkSchema);