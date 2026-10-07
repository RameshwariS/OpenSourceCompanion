import Application from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import Project from '../models/Project.js';

/** Everything a maintainer needs at a glance: their projects with opportunity and application counts. */
export async function getDashboard(user) {
  const projects = await Project.find({ owner: user._id })
    .sort({ stars: -1, _id: -1 })
    .select('repoFullName name stars verified avatarUrl')
    .lean();
  const projectIds = projects.map((p) => String(p._id));

  const [opportunities, statusCounts] = await Promise.all([
    Opportunity.find({ project: { $in: projectIds } }).select('project').lean(),
    Opportunity.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
    ]),
  ]);

  const pendingRows = await Application.aggregate([
    { $match: { opportunity: { $in: opportunities.map((o) => o._id) }, status: 'pending' } },
    { $group: { _id: '$opportunity', count: { $sum: 1 } } },
  ]);

  const projectOf = new Map(opportunities.map((o) => [String(o._id), String(o.project)]));
  const countsByProject = new Map(
    projects.map((p) => [String(p._id), { openOpportunities: 0, closedOpportunities: 0, pendingApplications: 0 }]),
  );

  for (const row of statusCounts) {
    const entry = countsByProject.get(String(row._id.project));
    if (entry) entry[row._id.status === 'open' ? 'openOpportunities' : 'closedOpportunities'] += row.count;
  }
  for (const row of pendingRows) {
    const entry = countsByProject.get(projectOf.get(String(row._id)));
    if (entry) entry.pendingApplications += row.count;
  }

  const items = projects.map((p) => ({
    project: {
      id: String(p._id),
      repoFullName: p.repoFullName,
      name: p.name,
      stars: p.stars,
      verified: p.verified,
      avatarUrl: p.avatarUrl ?? null,
    },
    ...countsByProject.get(String(p._id)),
  }));

  return {
    projects: items,
    totals: {
      projects: items.length,
      openOpportunities: items.reduce((sum, i) => sum + i.openOpportunities, 0),
      pendingApplications: items.reduce((sum, i) => sum + i.pendingApplications, 0),
    },
  };
}