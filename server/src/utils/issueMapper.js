import { classifyDifficulty } from '../services/difficulty.service.js';

// "https://api.github.com/repos/acme/widgets" -> "acme/widgets"
export const repoFullNameOf = (raw) => raw.repository_url.split('/repos/')[1];

/** GitHub API issue JSON (+ repo info) -> our API shape. */
export function fromGithub(raw, repoInfo) {
  const repoFullName = repoFullNameOf(raw);
  const [owner, repoName] = repoFullName.split('/');
  const labels = (raw.labels ?? [])
    .filter((l) => l && typeof l === 'object')
    .map((l) => ({ name: l.name, color: l.color ?? '' }));

  return {
    githubId: raw.id,
    number: raw.number,
    title: raw.title,
    body: raw.body ?? '',
    state: raw.state,
    repoFullName,
    owner,
    repoName,
    labels,
    language: repoInfo?.language ?? null,
    stars: repoInfo?.stars ?? null,
    commentsCount: raw.comments ?? 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    htmlUrl: raw.html_url,
    author: { login: raw.user?.login ?? 'ghost', avatarUrl: raw.user?.avatar_url ?? null },
    // Computed on every read, never stored, so improving the rules updates old data too
    difficulty: classifyDifficulty(labels.map((l) => l.name)),
  };
}

/** List responses omit the (large) body. */
export function withoutBody(dto) {
  const copy = { ...dto };
  delete copy.body;
  return copy;
}

/** Our API shape -> fields stored in the Issue snapshot document. */
export function toSnapshotFields(dto) {
  return {
    githubId: dto.githubId,
    repoFullName: dto.repoFullName,
    number: dto.number,
    title: dto.title,
    body: (dto.body ?? '').slice(0, 20_000), // cap what we store
    state: dto.state,
    labels: dto.labels,
    language: dto.language,
    repoStars: dto.stars,
    commentsCount: dto.commentsCount,
    authorLogin: dto.author.login,
    authorAvatarUrl: dto.author.avatarUrl,
    htmlUrl: dto.htmlUrl,
    githubCreatedAt: dto.createdAt,
    githubUpdatedAt: dto.updatedAt,
    syncedAt: new Date(),
  };
}

/** Stored Issue snapshot -> our API shape (without body). */
export function fromSnapshot(doc) {
  const [owner, repoName] = doc.repoFullName.split('/');
  const labels = doc.labels.map((l) => ({ name: l.name, color: l.color }));
  return {
    githubId: doc.githubId,
    number: doc.number,
    title: doc.title,
    state: doc.state,
    repoFullName: doc.repoFullName,
    owner,
    repoName,
    labels,
    language: doc.language ?? null,
    stars: doc.repoStars ?? null,
    commentsCount: doc.commentsCount,
    createdAt: doc.githubCreatedAt,
    updatedAt: doc.githubUpdatedAt,
    htmlUrl: doc.htmlUrl,
    author: { login: doc.authorLogin, avatarUrl: doc.authorAvatarUrl ?? null },
    difficulty: classifyDifficulty(labels.map((l) => l.name)),
    syncedAt: doc.syncedAt,
  };
}