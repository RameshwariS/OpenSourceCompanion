import * as contributionService from '../services/contribution.service.js';

export async function track(req, res) {
  const contribution = await contributionService.trackIssue(req.user._id, req.validated.body);
  res.status(201).json({ success: true, data: { contribution }, message: 'Issue is now tracked' });
}

export async function list(req, res) {
  const contributions = await contributionService.listContributions(req.user._id);
  res.status(200).json({ success: true, data: { contributions }, message: 'Contributions retrieved' });
}

export async function stats(req, res) {
  const data = await contributionService.getStats(req.user._id);
  res.status(200).json({ success: true, data: { stats: data }, message: 'Contribution statistics' });
}

export async function update(req, res) {
  const { params, body } = req.validated;
  const contribution = await contributionService.updateContribution(req.user._id, params.id, body);
  res.status(200).json({ success: true, data: { contribution }, message: 'Contribution updated' });
}

export async function remove(req, res) {
  await contributionService.removeContribution(req.user._id, req.validated.params.id);
  res.status(200).json({ success: true, data: null, message: 'Contribution removed' });
}