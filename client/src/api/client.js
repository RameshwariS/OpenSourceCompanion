import axios from 'axios';

// Set VITE_API_URL to the API origin when the client and server are deployed
// separately. Leave it unset when a same-origin proxy handles /api.
export const API_ORIGIN = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || undefined;

// One shared axios instance. withCredentials lets the browser send our
// httpOnly auth cookie (added in Phase 2).
export const api = axios.create({
  baseURL: `${API_ORIGIN || ''}/api`,
  withCredentials: true,
});
