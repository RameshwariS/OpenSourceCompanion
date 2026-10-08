import cron from 'node-cron';
import { checkMergedPullRequests } from './mergedPullRequests.job.js';
import { checkOrgIssues } from './orgIssues.job.js';
import { checkTrackedIssues } from './trackedIssues.job.js';

// A slow run must never overlap the next one
function guarded(name, fn) {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (err) {
      console.error(`Job "${name}" failed:`, err.message);
    } finally {
      running = false;
    }
  };
}

/** Starts all jobs and returns a function that stops them. */
export function startJobs() {
  // Different minutes spread the load on GitHub's search limit (30/min)
  const tasks = [
    cron.schedule('*/15 * * * *', guarded('org-issues', () => checkOrgIssues())),
    cron.schedule('5,20,35,50 * * * *', guarded('merged-prs', () => checkMergedPullRequests())),
    cron.schedule('10,25,40,55 * * * *', guarded('tracked-issues', () => checkTrackedIssues())),
  ];
  console.log('Background jobs started');
  return () => tasks.forEach((task) => task.stop());
}