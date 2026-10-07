import Application from '../models/Application.js';
import { ApiError } from '../utils/ApiError.js';
import { toApplicationDTO } from '../utils/opportunityMapper.js';
import { isProjectManager } from '../utils/permissions.js';

export async function listMyApplications(user) {
  const applications = await Application.find({ applicant: user._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate({ path: 'opportunity', select: 'title status project', populate: { path: 'project', select: 'repoFullName' } })
    .lean();

  return applications
    .filter((a) => a.opportunity?.project)
    .map((a) =>
      toApplicationDTO(a, {
        opportunity: {
          id: String(a.opportunity._id),
          title: a.opportunity.title,
          status: a.opportunity.status,
          repoFullName: a.opportunity.project.repoFullName,
        },
      }),
    );
}

export async function withdrawApplication(user, id) {
  const application = await Application.findById(id);
  if (!application) throw new ApiError(404, 'Application not found');
  if (application.status !== 'pending') {
    throw new ApiError(400, 'Only pending applications can be withdrawn');
  }
  await application.deleteOne();
}

export async function respondToApplication(user, id, { status, reply }) {
  const application = await Application.findById(id).populate({
    path: 'opportunity',
    select: 'project',
    populate: { path: 'project', select: 'owner' },
  });
  if (!application?.opportunity?.project) throw new ApiError(404, 'Application not found');

  if (!isProjectManager(user, application.opportunity.project)) {
    throw new ApiError(403, 'Only the project owner can respond to applications');
  }
  if (application.status !== 'pending') throw new ApiError(409, 'This application has already been answered');

  application.set({ status, reply, respondedAt: new Date() });
  await application.save();
  return toApplicationDTO(application);
}