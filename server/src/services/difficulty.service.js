// ESTIMATED difficulty. GitHub has no difficulty field, so we infer it from labels.
// This is a heuristic, not an official classification. It is a pure function so it
// is easy to test and could later be replaced by something smarter.

export const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

// "good-first-issue", "Good First Issue" and "good first issue 🌱" all become "good first issue"
const normalize = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const BEGINNER = new Set(['good first issue', 'first timers only', 'beginner', 'beginner friendly', 'easy']);
const INTERMEDIATE = new Set(['help wanted', 'medium', 'intermediate']);
const COMPLEX = new Set(['hard', 'difficult', 'advanced', 'complex', 'expert']);

// Exact GitHub label names used to build search queries (GitHub matches names exactly)
export const SEARCH_LABELS = {
  beginner: ['good first issue', 'good-first-issue', 'first-timers-only', 'beginner', 'easy'],
  intermediate: ['help wanted', 'help-wanted', 'medium', 'intermediate'],
};

export function classifyDifficulty(labelNames = []) {
  const labels = labelNames.map(normalize);

  // A "complexity" label wins: better to under-promise to a beginner than over-promise.
  if (labels.some((l) => COMPLEX.has(l))) return 'advanced';
  if (labels.some((l) => BEGINNER.has(l))) return 'beginner';
  if (labels.some((l) => INTERMEDIATE.has(l))) return 'intermediate';
  return 'advanced'; // no signal -> conservative default
}