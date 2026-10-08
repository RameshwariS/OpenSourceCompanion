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
