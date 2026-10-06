// Lists a few well-known repositories so /projects isn't empty on a fresh install.
// Real data from GitHub (needs GITHUB_TOKEN in .env). Safe to re-run: duplicates are skipped.
// Usage: npm run seed:projects
import { connectDB, disconnectDB } from '../config/db.js';
import User from '../models/User.js';
import { registerProject } from '../services/project.service.js';

const REPOS = [
  'firstcontributions/first-contributions',
  'freeCodeCamp/freeCodeCamp',
  'facebook/react',
  'vercel/next.js',
  'microsoft/vscode',
  'kubernetes/kubernetes',
  'meshery/meshery',
  'grafana/grafana',
  'home-assistant/core',
  'TheAlgorithms/Python',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

await connectDB();

// A curator account with no password, so nobody can log in as it. Its listings are "Community listed".
const curator =
  (await User.findOne({ username: 'osc-curators' })) ??
  (await User.create({
    email: 'curators@opensourcecompanion.invalid',
    username: 'osc-curators',
    name: 'OpenSourceCompanion Curators',
    role: 'maintainer',
  }));

for (const repo of REPOS) {
  try {
    const project = await registerProject(curator, repo);
    console.log(`listed  ${project.repoFullName} (${project.beginnerIssueCount} beginner issues)`);
  } catch (err) {
    console.log(`skipped ${repo}: ${err.message}`);
  }
  await sleep(2500); // each listing uses GitHub search calls (30/min limit)
}

await disconnectDB();