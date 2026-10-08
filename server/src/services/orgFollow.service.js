import OrgFollow from '../models/OrgFollow.js';
import { ApiError } from '../utils/ApiError.js';
import * as github from './github.service.js';

const MAX_FOLLOWS = 20;

const toDTO = (f) => ({ id: String(f._id), org: f.org, avatarUrl: f.avatarUrl, followedAt: f.createdAt });

export async function followOrg(user, org) {
  const key = org.toLowerCase();

  const existing = await OrgFollow.findOne({ user: user._id, orgKey: key });
  if (existing) return { follow: toDTO(existing), created: false }; // following is idempotent

  if ((await OrgFollow.countDocuments({ user: user._id })) >= MAX_FOLLOWS) {
    throw new ApiError(400, `You can follow at most ${MAX_FOLLOWS} organizations`);
  }

  let profile;
  try {
    ({ data: profile } = await github.getOrganization(org));
  } catch (err) {
    if (err.statusCode === 404) {
      throw new ApiError(404, 'Organization not found on GitHub. Personal accounts cannot be followed.');
    }
    throw err;
  }

  try {
    const follow = await OrgFollow.create({
      user: user._id,
      org: profile.login,
      orgKey: profile.login,
      avatarUrl: profile.avatarUrl,
    });
    return { follow: toDTO(follow), created: true };
  } catch (err) {
    if (err.code !== 11000) throw err;
    // Two simultaneous requests: the other one won
    return { follow: toDTO(await OrgFollow.findOne({ user: user._id, orgKey: key })), created: false };
  }
}

export async function listFollows(user) {
  const follows = await OrgFollow.find({ user: user._id }).sort({ createdAt: -1 }).limit(MAX_FOLLOWS).lean();
  return follows.map(toDTO);
}

export async function unfollowOrg(user, org) {
  await OrgFollow.deleteOne({ user: user._id, orgKey: org.toLowerCase() });
}