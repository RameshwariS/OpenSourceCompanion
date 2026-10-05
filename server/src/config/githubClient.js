import axios from 'axios';
import { env } from './env.js';

// One pre-configured client for api.github.com. Only the services talk to it.
export const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 10_000,
  headers: {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'OpenSourceCompanion',
    ...(env.GITHUB_TOKEN && { Authorization: `Bearer ${env.GITHUB_TOKEN}` }),
  },
});