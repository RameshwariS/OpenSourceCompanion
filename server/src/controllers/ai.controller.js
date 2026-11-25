import * as ai from '../services/ai.service.js';
export async function keyStatus(req, res) { res.json({ success: true, data: await ai.getKeyStatus(req.user._id) }); }
export async function saveKey(req, res) { res.json({ success: true, data: await ai.saveKey(req.user, req.validated.body), message: 'AI key saved' }); }
export async function deleteKey(req, res) { res.json({ success: true, data: await ai.deleteKey(req.user), message: 'AI key removed' }); }
export async function summarize(req, res) { const { owner, repo, number } = req.validated.params; res.json({ success: true, data: await ai.summarize(req.user._id, `${owner}/${repo}`, number) }); }
export async function chat(req, res) { res.json({ success: true, data: await ai.chat(req.user._id, req.validated.body) }); }
