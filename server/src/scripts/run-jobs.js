// Runs every job once, right now, instead of waiting for the schedule.
// Usage: npm run jobs:once
// Notifications are saved, but they are not pushed live (this is a separate process with no
// socket server). Refresh the page to see them.
import { connectDB, disconnectDB } from '../src/config/db.js';
import { checkMergedPullRequests } from '../src/jobs/mergedPullRequests.job.js';
import { checkOrgIssues } from '../src/jobs/orgIssues.job.js';
import { checkTrackedIssues } from '../src/jobs/trackedIssues.job.js';

await connectDB();
console.log('Org issue notifications created:', await checkOrgIssues());
await checkMergedPullRequests();
await checkTrackedIssues();
console.log('Done');
await disconnectDB();