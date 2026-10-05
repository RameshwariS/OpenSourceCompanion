import Contribution, { CONTRIBUTION_STATUSES } from '../models/Contribution.js';
import Issue from '../models/Issue.js';
import { ApiError } from '../utils/ApiError.js';
import { fromSnapshot } from '../utils/issueMapper.js';
import { ensureSnapshot } from './snapshot.service.js';

const toDTO = (c, issueDoc = c.issue) => ({
  id: String(c._id),
  status: c.status,
  notes: c.notes,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
  issue: fromSnapshot(issueDoc),
});

export async function trackIssue(userId, { repo, number, status, notes }) {
  const issue = await ensureSnapshot(repo, number);
  try {
    const contribution = await Contribution.create({ user: userId, issue: issue._id, status, notes });
    return toDTO(contribution, issue);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You are already tracking this issue');
    throw err;
  }
}

export async function listContributions(userId) {
  const contributions = await Contribution.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(500)
    .populate('issue');
  return contributions.filter((c) => c.issue).map((c) => toDTO(c));
}

export async function updateContribution(userId, id, changes) {
  const contribution = await Contribution.findOne({ _id: id, user: userId }).populate('issue');
  if (!contribution) throw new ApiError(404, 'Contribution not found');

  if (changes.status !== undefined) contribution.status = changes.status;
  if (changes.notes !== undefined) contribution.notes = changes.notes;
  await contribution.save();
  return toDTO(contribution);
}

export async function removeContribution(userId, id) {
  const deleted = await Contribution.findOneAndDelete({ _id: id, user: userId });
  if (!deleted) throw new ApiError(404, 'Contribution not found');
}

export async function getStats(userId) {
  const grouped = await Contribution.aggregate([
    { $match: { user: userId } }, // aggregate() doesn't auto-cast ids, so userId must be an ObjectId (req.user._id is)
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const byStatus = Object.fromEntries(CONTRIBUTION_STATUSES.map((s) => [s, 0]));
  for (const row of grouped) byStatus[row._id] = row.count;

  const issueIds = await Contribution.distinct('issue', { user: userId });
  const repositories = (await Issue.distinct('repoFullName', { _id: { $in: issueIds } })).length;

  return { total: Object.values(byStatus).reduce((a, b) => a + b, 0), byStatus, repositories };
}