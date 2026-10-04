import { api } from './client';

export async function register(payload) {
  const res = await api.post('/auth/register', payload);
  return res.data.data.user;
}

export async function login(payload) {
  const res = await api.post('/auth/login', payload);
  return res.data.data.user;
}

export async function logout() {
  await api.post('/auth/logout');
}

// Returns null (instead of throwing) when nobody is logged in; that's a normal state
export async function getMe() {
  try {
    const res = await api.get('/users/me');
    return res.data.data.user;
  } catch (err) {
    if ([401, 403].includes(err.response?.status)) return null;
    throw err;
  }
}