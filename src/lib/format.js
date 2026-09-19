// Small display helpers shared across pages.

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return '—';
  return INR.format(Number(amount));
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts });
}

export function formatMonth(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

// Whole days from today until `iso` (negative when already past).
export function daysUntil(iso) {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

export function maskMobile(mobile = '') {
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length < 4) return mobile;
  return `${'•'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`.replace(/(.{5})/g, '$1 ').trim();
}

export function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name.slice(0, 2) || 'S').toUpperCase();
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

// "25 Sept, 4:00 pm" — date plus clock time for leave out/in stamps.
export function formatDateTime(iso, opts = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', ...opts });
}

// Calendar days a hostel leave spans, counting both the out and in dates.
// Returns null when either stamp is invalid or the in date is before the out date.
export function leaveDays(outAt, inAt) {
  const a = new Date(outAt);
  const b = new Date(inAt);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  const diff = Math.round((b - a) / 86400000);
  return diff < 0 ? null : diff + 1;
}
