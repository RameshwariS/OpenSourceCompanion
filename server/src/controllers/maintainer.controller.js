import * as service from '../services/maintainer.service.js';

export async function dashboard(req, res) {
  const data = await service.getDashboard(req.user);
  res.status(200).json({ success: true, data, message: 'Maintainer dashboard' });
}