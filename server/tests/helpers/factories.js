import Application from '../../src/models/Application.js';
import Opportunity from '../../src/models/Opportunity.js';
import Project from '../../src/models/Project.js';

export async function makeProject(ownerId, over = {}) {
  const repoFullName = over.repoFullName ?? 'acme/widgets';
  return Project.create({
    owner: ownerId,
    repoFullName,
    repoKey: repoFullName.toLowerCase(),
    name: repoFullName.split('/')[1],
    ...over,
  });
}

export const makeOpportunity = (projectId, createdBy, over = {}) =>
  Opportunity.create({
    project: projectId,
    createdBy,
    title: 'Improve the docs',
    description: 'Help us improve the getting started guide for new users.',
    skills: ['React'],
    difficulty: 'beginner',
    expectedHoursMin: 2,
    expectedHoursMax: 5,
    ...over,
  });

export const makeApplication = (opportunityId, applicantId, over = {}) =>
  Application.create({
    opportunity: opportunityId,
    applicant: applicantId,
    message: 'I would love to help with this.',
    ...over,
  });