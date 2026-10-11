import * as issueService from '../services/issue.service.js';
import { getIssueDetail } from '../services/issueDetail.service.js';
import { attachUserState } from '../services/issueState.service.js';
import { getRecommendedIssues } from '../services/recommendation.service.js';

export async function listIssues(req, res) {
  const result = await issueService.searchIssues(req.validated.query);
  const items = await attachUserState(req.user._id, result.items);
  res.status(200).json({ success: true, data: { ...result, items }, message: 'Issues retrieved' });
}

export async function recommended(req, res) {
  const data = await getRecommendedIssues(req.user, req.validated.query);
  res.status(200).json({ success: true, data, message: 'Recommended issues' });
}

export async function getIssue(req, res) {
  const { owner, repo, number } = req.validated.params;
  const detail = await getIssueDetail(owner, repo, number);
  const [issue] = await attachUserState(req.user._id, [detail.issue]);

  res.status(200).json({
    success: true,
    data: { issue, comments: detail.comments, stale: detail.stale },
    message: 'Issue retrieved',
  });
}