// Works whether `owner` is an ObjectId or a populated object.
// Admins can manage every project; everyone else only their own.
export const isProjectManager = (user, project) =>
  user.role === 'admin' || String(project.owner._id ?? project.owner) === String(user._id);