import mongoose from 'mongoose';
const schema = new mongoose.Schema({ repoFullName: { type: String, required: true }, issueNumber: { type: Number, required: true }, githubUpdatedAt: { type: Date, required: true }, summary: { type: String, required: true } }, { timestamps: true });
schema.index({ repoFullName: 1, issueNumber: 1 }, { unique: true });
export default mongoose.model('IssueSummary', schema);
