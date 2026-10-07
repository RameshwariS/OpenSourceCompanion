import * as service from '../services/opportunity.service.js';

const ok = (res, status, data, message) => res.status(status).json({ success: true, data, message });

export async function create(req, res) {
  const opportunity = await service.createOpportunity(req.user, req.validated.body);
  ok(res, 201, { opportunity }, 'Opportunity posted');
}

export async function list(req, res) {
  ok(res, 200, await service.listOpportunities(req.user, req.validated.query), 'Opportunities retrieved');
}

export async function mine(req, res) {
  ok(res, 200, await service.listMyOpportunities(req.user, req.validated.query), 'Your opportunities');
}

export async function get(req, res) {
  const opportunity = await service.getOpportunity(req.user, req.validated.params.id);
  ok(res, 200, { opportunity }, 'Opportunity retrieved');
}

export async function update(req, res) {
  const { params, body } = req.validated;
  const opportunity = await service.updateOpportunity(req.user, params.id, body);
  ok(res, 200, { opportunity }, 'Opportunity updated');
}

export async function remove(req, res) {
  await service.deleteOpportunity(req.user, req.validated.params.id);
  ok(res, 200, null, 'Opportunity removed');
}

export async function apply(req, res) {
  const { params, body } = req.validated;
  const application = await service.applyToOpportunity(req.user, params.id, body.message);
  ok(res, 201, { application }, 'Application sent');
}

export async function applicants(req, res) {
  const applications = await service.listApplicants(req.user, req.validated.params.id);
  ok(res, 200, { applications }, 'Applications retrieved');
}