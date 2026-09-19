// Parent session token. Kept in localStorage (same reasoning as vegaPilot's
// auth.js — a non-HttpOnly cookie is no safer for a pure SPA).
const TOKEN_KEY = 'crisprParentToken';
const PARENT_KEY = 'pp_parent';
const CHILD_KEY = 'pp_selected_child';

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY) || '';
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function setToken(token) {
  if (!token) return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(PARENT_KEY);
  window.localStorage.removeItem(CHILD_KEY);
}

// Cached parent identity (synchronous, for the first paint before /me resolves).
export function getCachedParent() {
  try {
    return JSON.parse(window.localStorage.getItem(PARENT_KEY) || 'null');
  } catch {
    return null;
  }
}

export function setCachedParent(parent) {
  if (parent) window.localStorage.setItem(PARENT_KEY, JSON.stringify(parent));
  else window.localStorage.removeItem(PARENT_KEY);
}

// Which child the parent last looked at — survives reloads.
export function getSelectedChildId() {
  return window.localStorage.getItem(CHILD_KEY) || '';
}

export function setSelectedChildId(id) {
  if (id) window.localStorage.setItem(CHILD_KEY, String(id));
  else window.localStorage.removeItem(CHILD_KEY);
}
