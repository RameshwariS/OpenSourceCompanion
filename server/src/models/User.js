import mongoose from 'mongoose';

const { Schema } = mongoose;

export const ROLES = ['contributor', 'maintainer', 'admin'];

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false => never returned by queries unless explicitly requested
    passwordHash: { type: String, select: false },

    role: { type: String, enum: ROLES, default: 'contributor' },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },

    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },

    // Profile fields: editing endpoints arrive in Phase 5
    bio: { type: String, maxlength: 500, default: '' },
    skills: { type: [String], default: [] },
    location: { type: String, maxlength: 100, default: '' },
    portfolioUrl: { type: String, default: '' },
    linkedinUrl: { type: String, default: '' },

    github: {
      id: Number,
      username: String,
      avatarUrl: String,
      // AES-256-GCM encrypted OAuth token. Hidden by default.
      accessTokenEnc: { type: String, select: false },
    },
  },
  { timestamps: true },
);

// One GitHub account can belong to only one user. A *partial* index applies the
// uniqueness only to users that actually have a github.id.
userSchema.index(
  { 'github.id': 1 },
  { unique: true, partialFilterExpression: { 'github.id': { $type: 'number' } } },
);

// Safety net: even if a code path forgets, these never leave the server.
userSchema.set('toJSON', {
  versionKey: false,
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.passwordHash;
    if (ret.github) delete ret.github.accessTokenEnc;
    return ret;
  },
});

export default mongoose.model('User', userSchema);