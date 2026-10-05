import * as profileService from '../services/profile.service.js';

export function getMe(req, res) {
  res.status(200).json({ success: true, data: { user: req.user }, message: 'Current user' });
}

export async function updateMe(req, res) {
  const user = await profileService.updateProfile(req.user, req.validated.body);
  res.status(200).json({ success: true, data: { user }, message: 'Profile updated' });
}

export async function getProfile(req, res) {
  const data = await profileService.getPublicProfile(req.validated.params.username, req.user._id);
  res.status(200).json({ success: true, data, message: 'Profile retrieved' });
}