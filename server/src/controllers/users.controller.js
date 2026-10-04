export function getMe(req, res) {
  res.status(200).json({ success: true, data: { user: req.user }, message: 'Current user' });
}