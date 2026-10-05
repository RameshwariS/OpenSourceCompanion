import Issue from '../models/Issue.js';
import { ApiError } from '../utils/ApiError.js';
import { fromGithub, repoFullNameOf, toSnapshotFields } from '../utils/issueMapper.js';
import * as github from './github.service.js';

/** Fetch one issue (+ repo stats) from GitHub (cached) and map it to our shape. */
export async function fetchIssueFromGithub(owner, repo, number) {
  const { data: raw, stale } = await github.getIssue(owner, repo, number);
  if (raw.pull_request) throw new ApiError(404, 'That is a pull request, not an issue');

  const repoInfo = await github.getRepoInfo(repoFullNameOf(raw)).catch(() => null);
  return { dto: fromGithub(raw, repoInfo), stale };
}

export async function upsertSnapshot(dto) {
  const fields = toSnapshotFields(dto);
  const run = () =>
    Issue.findOneAndUpdate({ githubId: dto.githubId }, { $set: fields }, { upsert: true, new: true });

  try {
    return await run();
  } catch (err) {
    // Two requests upserting the same new issue at once: one loses the race. Retry once.
    if (err.code === 11000) return run();
    throw err;
  }
}

/**
 * Used by bookmarks and tracking. The CLIENT only says "acme/widgets #7".
 * WE fetch the real data from GitHub, so nobody can store fake issue content.
 */
export async function ensureSnapshot(repoFullName, number) {
  const [owner, repo] = repoFullName.split('/');
  const { dto } = await fetchIssueFromGithub(owner, repo, number);
  return upsertSnapshot(dto);
}