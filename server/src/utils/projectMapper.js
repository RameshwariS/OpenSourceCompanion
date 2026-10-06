/** Slim GitHub repository (from github.getRepository) -> fields stored on the Project. */
export function repoToFields(repo) {
  return {
    repoFullName: repo.fullName,
    repoKey: repo.fullName.toLowerCase(),
    name: repo.name,
    description: repo.description.slice(0, 500),
    language: repo.language,
    topics: repo.topics.slice(0, 20),
    stars: repo.stars,
    forks: repo.forks,
    license: repo.license && repo.license !== 'NOASSERTION' ? repo.license : null,
    archived: repo.archived,
    avatarUrl: repo.ownerAvatarUrl,
    lastSyncedAt: new Date(),
  };
}

/** Project document (or lean/plain object) -> our API shape. */
export function toProjectDTO(doc, { followersCount = 0, isFollowing = false } = {}) {
  return {
    id: String(doc._id),
    repoFullName: doc.repoFullName,
    githubOwner: doc.repoFullName.split('/')[0],
    name: doc.name,
    description: doc.description ?? '',
    language: doc.language ?? null,
    topics: doc.topics ?? [],
    stars: doc.stars,
    forks: doc.forks,
    license: doc.license ?? null,
    archived: doc.archived,
    avatarUrl: doc.avatarUrl ?? null,
    verified: doc.verified,
    beginnerIssueCount: doc.beginnerIssueCount,
    helpWantedIssueCount: doc.helpWantedIssueCount,
    contributorsCount: doc.contributorsCount ?? null,
    summary: doc.summary ?? '',
    contributingUrl: doc.contributingUrl ?? '',
    // Only present when `owner` was populated (the detail page)
    listedBy: doc.owner?.username ? { username: doc.owner.username, name: doc.owner.name } : null,
    lastSyncedAt: doc.lastSyncedAt ?? null,
    createdAt: doc.createdAt,
    followersCount,
    isFollowing,
  };
}

/** { TypeScript: 8000, CSS: 2000 } (bytes) -> [{ name, percent }], top 6 plus "Other". */
export function languageBreakdown(bytesByLanguage, max = 6) {
  const entries = Object.entries(bytesByLanguage ?? {})
    .filter(([, bytes]) => bytes > 0)
    .sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (total === 0) return [];

  const percent = (bytes) => Math.round((bytes / total) * 1000) / 10;
  const top = entries.slice(0, max).map(([name, bytes]) => ({ name, percent: percent(bytes) }));
  const rest = entries.slice(max).reduce((sum, [, bytes]) => sum + bytes, 0);
  return rest > 0 ? [...top, { name: 'Other', percent: percent(rest) }] : top;
}

const clip = (text) => String(text ?? '').slice(0, 200);

/**
 * GitHub repo events -> a short, readable feed (opened/merged PRs, opened issues, releases).
 * Links are BUILT by us from numbers/tags, never copied from the payload.
 */
export function mapEvents(events, repoFullName, limit = 10) {
  const items = [];
  const base = `https://github.com/${repoFullName}`;

  for (const event of events) {
    const payload = event.payload ?? {};
    let entry = null;

    if (event.type === 'PullRequestEvent' && Number.isInteger(payload.pull_request?.number)) {
      const { number, title, merged } = payload.pull_request;
      if (payload.action === 'opened') {
        entry = { kind: 'pr_opened', text: `opened pull request #${number}`, title: clip(title), url: `${base}/pull/${number}` };
      } else if (payload.action === 'closed' && merged) {
        entry = { kind: 'pr_merged', text: `merged pull request #${number}`, title: clip(title), url: `${base}/pull/${number}` };
      }
    } else if (event.type === 'IssuesEvent' && payload.action === 'opened' && Number.isInteger(payload.issue?.number)) {
      const { number, title } = payload.issue;
      entry = { kind: 'issue_opened', text: `opened issue #${number}`, title: clip(title), url: `${base}/issues/${number}` };
    } else if (event.type === 'ReleaseEvent' && payload.action === 'published' && payload.release?.tag_name) {
      const tag = payload.release.tag_name;
      entry = {
        kind: 'release',
        text: 'published a release',
        title: clip(payload.release.name || tag),
        url: `${base}/releases/tag/${encodeURIComponent(tag)}`,
      };
    }

    if (entry) {
      items.push({ id: String(event.id), actor: event.actor?.login ?? 'ghost', createdAt: event.created_at, ...entry });
      if (items.length >= limit) break;
    }
  }
  return items;
}