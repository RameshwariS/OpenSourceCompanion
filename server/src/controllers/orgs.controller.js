import * as service from '../services/orgFollow.service.js';

export async function list(req, res) {
  const follows = await service.listFollows(req.user);
  res.status(200).json({ success: true, data: { follows }, message: 'Followed organizations' });
}

export async function follow(req, res) {
  const { follow: result, created } = await service.followOrg(req.user, req.validated.body.org);
  res.status(created ? 201 : 200).json({ success: true, data: { follow: result }, message: 'Following organization' });
}

export async function unfollow(req, res) {
  await service.unfollowOrg(req.user, req.validated.params.org);
  res.status(200).json({ success: true, data: null, message: 'Unfollowed organization' });
}