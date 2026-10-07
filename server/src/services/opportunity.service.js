import Application from '../models/Application.js';
import Opportunity from '../models/Opportunity.js';
import Project from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { isProjectManager } from '../utils/permissions.js';
import { OPPORTUNITY_POPULATE, toApplicationDTO, toOpportunityDTO } from '../utils/opportunityMapper.js';

export const PER_PAGE = 10;
const MAX_OPEN_PER_PROJECT = 25;

/**
 * Adds viewer-specific data to a page of opportunities with two small queries
 * (never one per item): the viewer's own application, and pending counts for
 * the opportunities the viewer manages.
 */
async function hydrate(user, docs) {
  if (docs.length === 0) return [];

  const ids = docs.map((d) => d._id);
  const managedIds = docs.filter((d) => isProjectManager(user, d.project)).map((d) => d._id);

  const [mine, pending] = await Promise.all([
    Application.find({ applicant: user._id, opportunity: { $in: ids } }).select('opportunity status reply').lean(),
    managedIds.length
      ? Application.aggregate([
          { $match: { opportunity: { $in: managedIds }, status: 'pending' } },
          { $group: { _id: '$opportunity', count: { $sum: 1 } } },
        ])
      : [],
  ]);

  const mineByOpportunity = new Map(
    mine.map((a) => [String(a.opportunity), { id: String(a._id), status: a.status, reply: a.reply }]),
  );
  const pendingByOpportunity = new Map(pending.map((p) => [String(p._id), p.count]));

  return docs.map((doc) => {
    const canManage = isProjectManager(user, doc.project);
    return toOpportunityDTO(doc, {
      canManage,
      myApplication: mineByOpportunity.get(String(doc._id)) ?? null,
      pendingApplications: canManage ? (pendingByOpportunity.get(String(doc._id)) ?? 0) : null,
    });
  });
}

async function paginate(user, filter, page) {
  const [docs, totalCount] = await Promise.all([
    Opportunity.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(page * PER_PAGE)
      .limit(PER_PAGE)
      .populate(OPPORTUNITY_POPULATE)
      .lean(),
    Opportunity.countDocuments(filter),
  ]);

  return {
    items: await hydrate(user, docs.filter((d) => d.project)),
    pagination: { page, perPage: PER_PAGE, totalCount, totalPages: Math.ceil(totalCount / PER_PAGE) },
  };
}

async function getOne(user, id) {
  const doc = await Opportunity.findById(id).populate(OPPORTUNITY_POPULATE).lean();
  if (!doc || !doc.project) throw new ApiError(404, 'Opportunity not found');
  const [dto] = await hydrate(user, [doc]);
  return dto;
}

/** Loads an opportunity (+ its project's owner) and checks the user may manage it. */
export async function loadManageable(user, id) {
  const opportunity = await Opportunity.findById(id).populate({ path: 'project', select: 'owner' });
  if (!opportunity || !opportunity.project) throw new ApiError(404, 'Opportunity not found');
  if (!isProjectManager(user, opportunity.project)) {
    throw new ApiError(403, 'Only the project owner can manage this opportunity');
  }
  return opportunity;
}

export async function listOpportunities(user, { skill, difficulty, language, project, status, page }) {
  const filter = { status };
  if (difficulty) filter.difficulty = difficulty;
  // Anchored + escaped: "react" matches the skill "React" but not "React Native"
  if (skill) filter.skills = new RegExp(`^${escapeRegex(skill)}$`, 'i');

  const and = [];
  if (language) and.push({ project: { $in: await Project.distinct('_id', { language }) } });
  if (project) and.push({ project });
  if (and.length > 0) filter.$and = and;

  return paginate(user, filter, page);
}

export const listMyOpportunities = (user, { page }) => paginate(user, { createdBy: user._id }, page);

export const getOpportunity = getOne;

export async function createOpportunity(user, input) {
  const project = await Project.findById(input.project).select('owner');
  if (!project) throw new ApiError(404, 'Project not found');
  if (!isProjectManager(user, project)) throw new ApiError(403, 'Only the project owner can post opportunities');

  const openCount = await Opportunity.countDocuments({ project: project._id, status: 'open' });
  if (openCount >= MAX_OPEN_PER_PROJECT) {
    throw new ApiError(400, `A project can have at most ${MAX_OPEN_PER_PROJECT} open opportunities`);
  }

  // Fields are listed explicitly; createdBy always comes from the session, never the body
  const created = await Opportunity.create({
    project: project._id,
    createdBy: user._id,
    title: input.title,
    description: input.description,
    skills: input.skills,
    difficulty: input.difficulty,
    expectedHoursMin: input.expectedHoursMin,
    expectedHoursMax: input.expectedHoursMax,
  });
  return getOne(user, created._id);
}

export async function updateOpportunity(user, id, changes) {
  const opportunity = await loadManageable(user, id);
  opportunity.set(changes);

  // Checked AFTER merging, so changing only one of min/max can't break the rule
  if (opportunity.expectedHoursMin > opportunity.expectedHoursMax) {
    throw new ApiError(400, 'Maximum hours must be at least the minimum');
  }
  await opportunity.save();
  return getOne(user, id);
}

export async function deleteOpportunity(user, id) {
  const opportunity = await loadManageable(user, id);
  await Application.deleteMany({ opportunity: opportunity._id });
  await opportunity.deleteOne();
}

// ---------------- applications to ONE opportunity ----------------

export async function applyToOpportunity(user, id, message) {
  const opportunity = await Opportunity.findById(id);
  if (!opportunity) throw new ApiError(404, 'Opportunity not found');
  if (opportunity.status !== 'open') throw new ApiError(400, 'This opportunity is closed');
  if (String(opportunity.createdBy) === String(user._id)) {
    throw new ApiError(400, 'You cannot apply to your own opportunity');
  }

  const alreadyApplied = Application.exists({ opportunity: opportunity._id, applicant: user._id });
  if (alreadyApplied) throw new ApiError(409, 'You have already applied to this opportunity');

  try {
    const application = await Application.create({ opportunity: opportunity._id, applicant: user._id, message });
    return toApplicationDTO(application);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'You have already applied to this opportunity');
    throw err;
  }
}

export async function listApplicants(user, id) {
  const opportunity = await loadManageable(user, id);
  const applications = await Application.find({ opportunity: opportunity._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate('applicant', 'username name skills github.avatarUrl')
    .lean();

  return applications
    .filter((a) => a.applicant)
    .map((a) =>
      toApplicationDTO(a, {
        applicant: {
          username: a.applicant.username,
          name: a.applicant.name,
          skills: a.applicant.skills,
          avatarUrl: a.applicant.github?.avatarUrl ?? null,
        },
      }),
    );
}