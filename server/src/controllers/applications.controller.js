import * as service from '../services/application.service.js';

export async function mine(req, res) {
  const applications = await service.listMyApplications(req.user);
  res.status(200).json({ success: true, data: { applications }, message: 'Your applications' });
}

export async function withdraw(req, res) {
  await service.withdrawApplication(req.user, req.validated.params.id);
  res.status(200).json({ success: true, data: null, message: 'Application withdrawn' });
}

export async function respond(req, res) {
  const { params, body } = req.validated;
  const application = await service.respondToApplication(req.user, params.id, body);
  res.status(200).json({ success: true, data: { application }, message: 'Response saved' });
}