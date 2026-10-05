import request from 'supertest';
import app from '../../src/app.js';

let counter = 0;

/** Registers a fresh user and returns an agent that carries the login cookie. */
export async function createAgent(overrides = {}) {
  const n = ++counter;
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({
    name: `User ${n}`,
    username: `user${n}`,
    email: `user${n}@example.com`,
    password: 'Password123',
    ...overrides,
  });
  return { agent, user: res.body.data.user };
}