import * as issueService from '../services/issue.service.js';

export async function listIssues(req, res) {
  const result = await issueService.searchIssues(req.validated.query);
  res.status(200).json({ success: true, data: result, message: 'Issues retrieved' });
}