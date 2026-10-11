import { getUserEvents } from './github.service.js';

// Activity that shows real participation in OTHER people's projects.
// Pushes are excluded on purpose: pushing to your own repos is too easy to inflate.
const COUNTED_EVENTS = new Set([
  'PullRequestEvent',
  'PullRequestReviewEvent',
  'PullRequestReviewCommentEvent',
  'IssuesEvent',
  'IssueCommentEvent',
]);

const DAY_MS = 86_400_000;
const dayNumber = (isoDay) => Math.floor(Date.parse(`${isoDay}T00:00:00Z`) / DAY_MS);

/** GitHub events -> Map of UTC day ("2026-03-01") to number of counted events on repos the user doesn't own. */
export function activityCounts(events, login) {
  const counts = new Map();
  for (const event of events) {
    if (!COUNTED_EVENTS.has(event.type) || !event.created_at) continue;
    const owner = String(event.repo?.name ?? '').split('/')[0].toLowerCase();
    if (owner === login.toLowerCase()) continue;
    const day = event.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return counts;
}

/** Unique UTC days with activity. */
export const activityDays = (events, login) => [...activityCounts(events, login).keys()];

/** The last `totalDays` days ending today (UTC), oldest first, with zeros filled in. */
export function buildActivitySeries(counts, now = new Date(), totalDays = 91) {
  const today = Math.floor(now.getTime() / DAY_MS);
  const days = [];
  for (let n = today - totalDays + 1; n <= today; n++) {
    const date = new Date(n * DAY_MS).toISOString().slice(0, 10);
    days.push({ date, count: counts.get(date) ?? 0 });
  }
  return { days, total: days.reduce((sum, d) => sum + d.count, 0) };
}

/** Pure function. `current` survives until the end of the day AFTER your last activity. */
export function computeStreaks(days, now = new Date()) {
  const numbers = [...new Set(days.map(dayNumber))].sort((a, b) => a - b);

  let longest = 0;
  let run = 0;
  let previous = null;
  for (const n of numbers) {
    run = previous !== null && n === previous + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = n;
  }

  // `run` is now the length of the LAST streak. It is "current" only if it reaches today or yesterday.
  const today = Math.floor(now.getTime() / DAY_MS);
  const current = numbers.length > 0 && numbers.at(-1) >= today - 1 ? run : 0;
  return { current, longest };
}

export async function getStreaks(login) {
  const { data: events } = await getUserEvents(login);
  return computeStreaks(activityDays(events, login));
}