import * as projectService from '../services/project.service.js';

export async function create(req, res) {
  const project = await projectService.registerProject(req.user, req.validated.body.repo);
  res.status(201).json({ success: true, data: { project }, message: 'Project listed' });
}

export async function list(req, res) {
  const data = await projectService.listProjects(req.user, req.validated.query);
  res.status(200).json({ success: true, data, message: 'Projects retrieved' });
}

export async function get(req, res) {
  const data = await projectService.getProjectDetail(req.user, req.validated.params.id);
  res.status(200).json({ success: true, data, message: 'Project retrieved' });
}

export async function update(req, res) {
  const { params, body } = req.validated;
  const project = await projectService.updateProject(req.user, params.id, body);
  res.status(200).json({ success: true, data: { project }, message: 'Project updated' });
}

export async function remove(req, res) {
  await projectService.deleteProject(req.user, req.validated.params.id);
  res.status(200).json({ success: true, data: null, message: 'Project removed' });
}

export async function follow(req, res) {
  const data = await projectService.followProject(req.user._id, req.validated.params.id);
  res.status(200).json({ success: true, data, message: 'Following project' });
}

export async function unfollow(req, res) {
  const data = await projectService.unfollowProject(req.user._id, req.validated.params.id);
  res.status(200).json({ success: true, data, message: 'Unfollowed project' });
}