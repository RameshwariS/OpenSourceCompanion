import Issue from '../models/Issue.js';
import * as github from './github.service.js';
import { fetchIssueFromGithub, upsertSnapshot } from './snapshot.service.js';

const toCommentDTO = (c) => ({
  id: c.id,
  author: { login: c.user?.login ?? 'ghost', avatarUrl: c.user?.avatar_url ?? null },
  body: (c.body ?? '').slice(0, 5000),
  createdAt: c.created_at,
});

export async function getIssueDetail(owner, repo, number) {
  // Issue and comments load in parallel; missing comments must not break the page.
  const [issueResult, commentsResult] = await Promise.allSettled([
    fetchIssueFromGithub(owner, repo, number),
    github.getIssueComments(owner, repo, number),
  ]);
  if (issueResult.status === 'rejected') throw issueResult.reason;

  const { dto, stale } = issueResult.value;
  const comments = commentsResult.status === 'fulfilled' ? commentsResult.value.data.map(toCommentDTO) : [];

  // If this issue is bookmarked/tracked by anyone, keep its stored snapshot fresh
  if (await Issue.exists({ githubId: dto.githubId })) await upsertSnapshot(dto);

  return { issue: dto, comments, stale };
}