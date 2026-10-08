import Contribution from '../models/Contribution.js';
import Issue from '../models/Issue.js';
import { notify } from '../services/notification.service.js';
import { fetchIssueFromGithub, upsertSnapshot } from '../services/snapshot.service.js';

const MAX_PER_RUN = 20;
const FINISHED = ['merged', 'closed']; // statuses the user has already wrapped up

export async function checkTrackedIssues() {
  const trackedIds = await Contribution.distinct('issue', { status: { $nin: FINISHED } });

  // Least recently synced first, so every tracked issue gets its turn
  const issues = await Issue.find({ _id: { $in: trackedIds }, state: 'open' }).sort({ syncedAt: 1 }).limit(MAX_PER_RUN);

  for (const issue of issues) {
    try {
      const [owner, repo] = issue.repoFullName.split('/');
      const { dto } = await fetchIssueFromGithub(owner, repo, issue.number);

      if (dto.state === 'closed') {
        const trackers = await Contribution.find({ issue: issue._id }).select('user');
        for (const tracker of trackers) {
          await notify(tracker.user, {
            type: 'issue_closed',
            message: `A tracked issue was closed: ${dto.title.slice(0, 120)} (${dto.repoFullName}#${dto.number})`,
            link: `/issues/${dto.owner}/${dto.repoName}/${dto.number}`,
            dedupeKey: `issue-closed:${dto.githubId}`,
          });
        }
      }
      await upsertSnapshot(dto); // refreshes the stored state and syncedAt
    } catch (err) {
      console.error(`Tracked issue check failed for ${issue.repoFullName}#${issue.number}:`, err.message);
      // Move it to the back of the queue so one broken issue can't hog a slot forever
      await Issue.updateOne({ _id: issue._id }, { $set: { syncedAt: new Date() } });
    }
  }
}