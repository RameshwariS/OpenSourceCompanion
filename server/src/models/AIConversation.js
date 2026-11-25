import mongoose from 'mongoose';
const message = new mongoose.Schema({ role: { type: String, enum: ['user', 'assistant'], required: true }, content: { type: String, required: true, maxlength: 12000 } }, { timestamps: true });
const schema = new mongoose.Schema({ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true }, repoFullName: { type: String, required: true }, issueNumber: Number, messages: { type: [message], default: [] } }, { timestamps: true });
export default mongoose.model('AIConversation', schema);
