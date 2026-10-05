import * as prService from '../services/pullRequest.service.js';

export async function list(req, res) {
  const data = await prService.getMyPullRequests(req.user);
  res.status(200).json({ success: true, data, message: 'Pull requests retrieved' });
}

export async function stats(req, res) {
  const data = await prService.getMyPullRequestStats(req.user);
  res.status(200).json({ success: true, data, message: 'Pull request statistics' });
}

export function refresh(req, res) {
  prService.refreshMyPullRequests(req.user);
  res.status(200).json({ success: true, data: null, message: 'Cache cleared. Fresh data will load next.' });
}