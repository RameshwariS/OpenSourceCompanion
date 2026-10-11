import { getDashboard } from '../services/dashboard.service.js';

export async function get(req, res) {
  const data = await getDashboard(req.user);
  res.status(200).json({ success: true, data, message: 'Dashboard' });
}