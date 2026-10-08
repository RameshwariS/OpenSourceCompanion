import OrgFollow from '../models/OrgFollow.js';
import { githubGet } from '../services/github.service.js';
import { notify } from '../services/notification.service.js';
import { repoFullNameOf } from '../utils/issueMapper.js';

// GitHub's search index lags behind reality by a few minutes, so every run looks back
// further than its checkpoint. The unique dedupeKey makes the overlap harmless.
const OVERLAP_MS = 15 * 60 * 1000;
const MAX_ORGS_PER_RUN = 20; // one GitHub search per org, and search is limited to 30/min
const PAGE = 30;
const MAX_INDIVIDUAL = 5;

const toGithubTime = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z');

async function processOrg({ _id: orgKey, org, oldest }, now) {
  const from = new Date(oldest.getTime() - OVERLAP_MS);
  const result = await githubGet('/search/issues', {
    q: `org:${org} is:issue is:open is:public archived:false created:>${toGithubTime(from)}`,
    sort: 'created',
    order: 'asc', // oldest first, so a flood is worked through in order across runs
    per_page: PAGE,
    page: 1,
  });

  const issues = result.items.filter((i) => !i.pull_request);

  // If everything fit on one page we have seen it all up to `now`.
  // Otherwise we only got as far as the last issue returned, and the next run continues from there.
  const complete = issues.length <= PAGE;
  const checkpoint = complete ? now : new Date(result.items.at(-1).created_at);

  const follows = await OrgFollow.find({ orgKey }).populate('user', 'status github.username');
  let sent = 0;

  for (const follow of follows) {
    if (!follow.user || follow.user.status !== 'active') continue;

    const since = Math.min(follow.createdAt.getTime(), follow.lastCheckedAt.getTime() - OVERLAP_MS);
    const me = follow.user.github?.username?.toLowerCase();
    const fresh = issues.filter((i) => Date.parse(i.created_at) > since && i.user?.login?.toLowerCase() !== me);

    for (const issue of fresh.slice(0, MAX_INDIVIDUAL)) {
      const repoFullName = repoFullNameOf(issue);
      const created = await notify(follow.user._id, {
        type: 'org_issue',
        message: `New issue in ${follow.org}: ${issue.title.slice(0, 120)} (${repoFullName}#${issue.number})`,
        link: `/issues/${repoFullName}/${issue.number}`, // built from names and numbers, never copied from the payload
        dedupeKey: `org-issue:${issue.id}`,
      });
      if (created) sent++;
    }

    const extra = fresh.length - MAX_INDIVIDUAL;
    if (extra > 0) {
      const created = await notify(follow.user._id, {
        type: 'org_issue_summary',
        message: `${extra} more new ${extra === 1 ? 'issue' : 'issues'} in ${follow.org}`,
        link: `/issues?org=${encodeURIComponent(follow.org)}&sort=created`,
        dedupeKey: `org-summary:${orgKey}:${checkpoint.toISOString()}`,
      });
      if (created) sent++;
    }

    // $max: a checkpoint can move forward, never backward
    await OrgFollow.updateOne({ _id: follow._id }, { $max: { lastCheckedAt: checkpoint } });
  }
  return sent;
}

/** One search per distinct followed org (not per follower). Returns how many notifications were created. */
export async function checkOrgIssues(now = new Date()) {
  const orgs = await OrgFollow.aggregate([
    { $group: { _id: '$orgKey', org: { $first: '$org' }, oldest: { $min: '$lastCheckedAt' } } },
    { $sort: { oldest: 1 } }, // the org checked longest ago goes first
    { $limit: MAX_ORGS_PER_RUN },
  ]);

  let sent = 0;
  for (const entry of orgs) {
    try {
      sent += await processOrg(entry, now);
    } catch (err) {
      // One broken org must not stop the others
      console.error(`Org issue check failed for ${entry.org}:`, err.message);
    }
  }
  return sent;
}