// The recommendation RULES. A pure module: no database, no network, easy to test,
// and the one file to replace if the rules are ever swapped for a machine-learning model.
import { normalizeLabel } from './difficulty.service.js';

export const WEIGHTS = {
  languageMatch: 5,
  skillMatch: 5,
  activityMatch: 2,
  goodFirstIssue: 4,
  helpWanted: 2,
  recentlyUpdated: 2,
  popularity: 1,
};

const DAY_MS = 86_400_000;
const RECENT_DAYS = 7;
const POPULAR_STARS = 1000;

const trimDots = (token) => token.replace(/^\.+|\.+$/g, '');
// Keep + # . inside tokens so "c++", "c#" and "node.js" survive
const tokenize = (text) => new Set(text.split(/[^a-z0-9+#.]+/).map(trimDots).filter(Boolean));
const sameText = (a, b) => a.toLowerCase() === b.toLowerCase();

function matchesSkill(skill, tokens, text) {
  const term = skill.trim().toLowerCase();
  if (!term) return false;
  // Multi-word skills ("machine learning") are searched as a phrase, single words as whole words
  return /\s/.test(term) ? text.includes(term) : tokens.has(trimDots(term));
}

/**
 * @param issue   our issue shape (title, repoFullName, labels, language, stars, updatedAt, difficulty)
 * @param profile { languages: string[], skillTerms: string[], activityLanguages: string[] }
 * @returns {{ score: number, reasons: string[] }}
 */
export function scoreIssue(issue, profile, now = new Date()) {
  let score = 0;
  const reasons = [];
  const add = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  const language = issue.language;
  if (language && profile.languages.some((l) => sameText(l, language))) {
    add(WEIGHTS.languageMatch, `Written in ${language}, one of your skills`);
  }

  const text = [issue.title, issue.repoFullName, ...issue.labels.map((l) => l.name)].join(' ').toLowerCase();
  const tokens = tokenize(text);
  const matchedSkill = profile.skillTerms.find((skill) => matchesSkill(skill, tokens, text));
  if (matchedSkill) add(WEIGHTS.skillMatch, `Mentions ${matchedSkill}`); // once, however many skills match

  if (language && profile.activityLanguages.some((l) => sameText(l, language))) {
    add(WEIGHTS.activityMatch, `You have worked with ${language} issues before`);
  }

  if (issue.difficulty === 'beginner') add(WEIGHTS.goodFirstIssue, 'Beginner-friendly');
  if (issue.labels.some((l) => normalizeLabel(l.name) === 'help wanted')) {
    add(WEIGHTS.helpWanted, 'Maintainers are asking for help');
  }
  if (now.getTime() - Date.parse(issue.updatedAt) <= RECENT_DAYS * DAY_MS) {
    add(WEIGHTS.recentlyUpdated, 'Updated in the last week');
  }
  if ((issue.stars ?? 0) >= POPULAR_STARS) add(WEIGHTS.popularity, 'Popular project');

  return { score, reasons };
}

/** Highest score first. Ties: most recently updated, then lowest id, so the order is stable. */
export function rankIssues(issues, profile, now = new Date()) {
  return issues
    .map((issue) => ({ ...issue, ...scoreIssue(issue, profile, now) }))
    .sort(
      (a, b) =>
        b.score - a.score || Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.githubId - b.githubId,
    );
}