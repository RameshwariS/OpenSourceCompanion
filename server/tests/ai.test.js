import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import app from '../src/app.js';
import User from '../src/models/User.js';
import IssueSummary from '../src/models/IssueSummary.js';
import { encrypt, decrypt } from '../src/utils/crypto.js';
import { connectTestDB, clearTestDB, closeTestDB } from './helpers/db.js';
import { createAgent } from './helpers/auth.js';
import { getProvider, maskApiKey } from '../src/services/llm/providers.js';
import { summarize } from '../src/services/ai.service.js';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn(), create: vi.fn(() => ({ get: vi.fn() })) } }));
beforeAll(connectTestDB);
afterEach(async () => { await clearTestDB(); vi.clearAllMocks(); });
afterAll(closeTestDB);

describe('AI key and provider helpers', () => {
  it('encrypts and masks without exposing the full key', () => {
    const key = 'sk-secret-value-a1b2';
    expect(decrypt(encrypt(key))).toBe(key);
    expect(maskApiKey(key)).toBe('sk-...a1b2');
  });
  it('normalizes invalid provider key errors without exposing provider response', async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 401, data: { message: 'bad secret' } } });
    await expect(getProvider('openai').validate('bad-secret', 'gpt-4o-mini')).rejects.toMatchObject({ code: 'AI_INVALID_KEY' });
  });
  it('adapts mocked completion calls for OpenAI, Gemini, and Claude', async () => {
    const fixtures = [
      ['openai', { data: { choices: [{ message: { content: 'openai reply' } }] } }, 'openai reply'],
      ['gemini', { data: { candidates: [{ content: { parts: [{ text: 'gemini reply' }] } }] } }, 'gemini reply'],
      ['anthropic', { data: { content: [{ text: 'claude reply' }] } }, 'claude reply'],
    ];
    for (const [provider, response, expected] of fixtures) {
      axios.post.mockResolvedValueOnce(response);
      await expect(getProvider(provider).complete('key', getProvider(provider).defaultModel, [{ role: 'user', content: 'hello' }])).resolves.toBe(expected);
    }
    expect(axios.post).toHaveBeenCalledTimes(3);
  });
});

describe('AI routes', () => {
  it('requires authentication on AI endpoints', async () => {
    expect((await request(app).get('/api/ai/key')).status).toBe(401);
    expect((await request(app).post('/api/ai/chat').send({})).status).toBe(401);
  });
  it('returns only masked key metadata and supports deletion', async () => {
    const { agent, user } = await createAgent();
    await User.updateOne({ _id: user.id }, { $set: { 'llm.provider': 'openai', 'llm.model': 'gpt-4o-mini', 'llm.apiKeyEnc': encrypt('sk-test-secret-a1b2'), 'llm.keyLastFour': 'a1b2' } });
    const status = await agent.get('/api/ai/key');
    expect(status.body.data).toEqual({ configured: true, provider: 'openai', model: 'gpt-4o-mini', maskedKey: '...a1b2' });
    expect(JSON.stringify(status.body)).not.toContain('sk-test-secret-a1b2');
    expect((await agent.delete('/api/ai/key')).status).toBe(200);
  });
  it('reports missing keys before attempting AI calls', async () => {
    const { agent } = await createAgent();
    const response = await agent.post('/api/ai/chat').send({ repoFullName: 'acme/widgets', question: 'How do I set this up?' });
    expect(response.status).toBe(409);
    expect(response.body.code).toBe('AI_KEY_MISSING');
  });
  it('validates key before storing and reports a safe invalid-key error', async () => {
    const { agent, user } = await createAgent();
    axios.post.mockRejectedValueOnce({ response: { status: 401, data: { message: 'sk-leaked' } } });
    const response = await agent.put('/api/ai/key').send({ provider: 'openai', model: 'gpt-4o-mini', apiKey: 'sk-invalid-test' });
    expect(response.status).toBe(400);
    expect(response.body.message).not.toContain('sk-invalid-test');
    expect((await User.findById(user.id).select('+llm.apiKeyEnc')).llm?.apiKeyEnc).toBeUndefined();
  });
});

describe('AI issue summary cache', () => {
  it('returns cached summary when GitHub updated_at is unchanged', async () => {
    const { user } = await createAgent();
    const githubToken = 'gho-secret-test';
    await User.updateOne({ _id: user.id }, { $set: { 'github.accessTokenEnc': encrypt(githubToken), 'llm.provider': 'openai', 'llm.model': 'gpt-4o-mini', 'llm.apiKeyEnc': encrypt('sk-key'), 'llm.keyLastFour': 'key' } });
    await IssueSummary.create({ repoFullName: 'acme/widgets', issueNumber: 7, githubUpdatedAt: new Date('2026-02-01T00:00:00Z'), summary: 'Cached summary' });
    axios.get.mockImplementation(async (url) => {
      if (url.endsWith('/issues/7')) return { data: { updated_at: '2026-02-01T00:00:00Z' } };
      if (url.includes('/comments')) return { data: [] };
      return { data: { content: '' } };
    });
    const result = await summarize(user.id, 'acme/widgets', 7);
    expect(result).toEqual({ summary: 'Cached summary', cached: true });
    expect(axios.post).not.toHaveBeenCalled();
  });
});
