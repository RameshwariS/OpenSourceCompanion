import { activityCounts, buildActivitySeries } from './activity.service.js';
import { getStats } from './contribution.service.js';
import { getUserEvents } from './github.service.js';
import { getSummary } from './pullRequest.service.js';

async function loadGithub(user) {
  const login = user.github?.username;
  if (!login) return { connected: false };

  // Both are cached and shared with the profile page. The async wrapper turns a synchronous
  // throw (invalid login) into a rejection that allSettled can handle.
  const [summary, events] = await Promise.allSettled([(async () => getSummary(login))(), getUserEvents(login)]);
  if (summary.status === 'rejected' && events.status === 'rejected') return { connected: true, available: false };

  return {
    connected: true,
    available: true,
    pullRequests: summary.status === 'fulfilled' ? summary.value.data.stats : null,
    activity: events.status === 'fulfilled' ? buildActivitySeries(activityCounts(events.value.data, login)) : null,
    stale: [summary, events].some((r) => r.status === 'fulfilled' && r.value.stale),
  };
}

export async function getDashboard(user) {
  const [tracking, github] = await Promise.all([getStats(user._id), loadGithub(user)]);
  return { tracking, github };
}