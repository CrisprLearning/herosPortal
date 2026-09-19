import axios from 'axios';
import { clearToken, getToken } from './auth';

// API origin resolution. The parent APIs are plain PHP scripts under
// CrisprTechApp/parent/*.php (same host as the /user and /restricted APIs),
// so the base is the bare ORIGIN — no /api suffix.
//   1. VITE_API_BASE (origin) when set — see .env.example.
//   2. Otherwise localhost -> `php -S 127.0.0.1:8099 -t CrisprTechApp`,
//      anything else -> production.
const ENV_API_BASE = import.meta.env?.VITE_API_BASE;

export const BASE_URL = ENV_API_BASE
  ? String(ENV_API_BASE).replace(/\/+$/, '')
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://127.0.0.1:8099'
      : 'https://crisprtech.app');

// Demo mode renders the whole portal from src/data/parentPortalDemo.js.
// Off by default now that the /parent APIs exist; set VITE_DEMO_MODE=1 to
// demo without a backend.
export const DEMO_MODE = String(import.meta.env?.VITE_DEMO_MODE ?? '0') === '1';

export const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Any 401 outside the login flow means the session is dead: clear it and
// send the parent back to /login, remembering where they were.
export function handleUnauthorized() {
  clearToken();
  if (window.location.pathname !== '/login') {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(`/login?next=${next}`);
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isAuthCall = url.includes('/parent/login.php') || url.includes('/parent/authenticate.php');
    if (status === 401 && !isAuthCall) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);
