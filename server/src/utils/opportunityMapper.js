// Which related documents to load, and which of their fields.
export const OPPORTUNITY_POPULATE = [
  { path: 'project', select: 'repoFullName name language avatarUrl verified owner' },
  { path: 'createdBy' },
];

/** Populated opportunity (lean) -> our API shape. */
export function toOpportunityDTO(doc, { canManage = false, myApplication = null, pendingApplications = null } = {}) {
  const { project } = doc;
  return {
    id: String(doc._id),
    title: doc.title,
    description: doc.description,
    skills: doc.skills,
    difficulty: doc.difficulty,
    expectedHours: { min: doc.expectedHoursMin, max: doc.expectedHoursMax },
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    project: {
      id: String(project._id),
      repoFullName: project.repoFullName,
      name: project.name,
      language: project.language ?? null,
      avatarUrl: project.avatarUrl ?? null,
      verified: project.verified,
    },
    createdBy: doc.createdBy,
    canManage,
    myApplication, // the viewer's own application: { id, status, reply } or null
    pendingApplications, // a number for managers, null for everyone else
  };
}

export const toApplicationDTO = (a, extra = {}) => ({
  id: String(a._id),
  status: a.status,
  message: a.message,
  reply: a.reply,
  createdAt: a.createdAt,
  respondedAt: a.respondedAt ?? null,
  ...extra,
});