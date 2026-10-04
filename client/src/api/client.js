import axios from 'axios';

// One shared axios instance. withCredentials lets the browser send our
// httpOnly auth cookie (added in Phase 2).
export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});