import { api, DEMO_MODE } from './api';
import { leaveDays } from './format';
import {
  demoParent, demoChildren, demoStudent360, demoQuizStats, demoCourseProgress, demoCourses, demoHostel, demoHostelLeaves, demoCoursePayments, demoContacts, demoProgressReports,
} from '../data/parentPortalDemo';

/**
 * Parent-portal API surface. Every function returns the plain payload the
 * pages need; envelope unwrapping lives here so pages never see `data.response`.
 *
 * Endpoints are the PHP scripts in CrisprTechApp/parent (see
 * PARENT_PORTAL_API_CONTRACT.md). Envelope: { status: "success", data } or
 * { status: "failed", error }. While DEMO_MODE is on the same functions
 * resolve from src/data/parentPortalDemo.js with a short delay so loading
 * states are visible.
 */

const DEMO_OTP = '1234';

// Demo-mode parent lives in memory so profile edits stick for the session.
let demoParentState = { ...demoParent, email: null, place: null, gender: null };

export function isProfileComplete(parent) {
  if (!parent) return true; // nothing to prompt for yet
  if (typeof parent.profileComplete === 'boolean') return parent.profileComplete;
  return Boolean(parent.name && parent.name !== 'Parent' && parent.email && parent.place && parent.gender);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function unwrap(res) {
  const body = res?.data;
  if (body && typeof body === 'object' && 'status' in body) {
    const ok = body.status === 'success' || body.status === true;
    if (!ok) {
      const err = new Error(body.error || body.message || 'Request failed');
      err.body = body;
      throw err;
    }
    return 'data' in body ? body.data : body.response;
  }
  return body;
}

// The PHP scripts take the country code without the plus sign.
const cc = (countryCode) => String(countryCode || '91').replace(/^\+/, '');

const withChild = (path, childId) => `${path}?candidateId=${encodeURIComponent(childId)}`;

// ── Auth ──────────────────────────────────────────────────────────────────
export async function sendOtp({ mobile, countryCode = '+91' }) {
  if (DEMO_MODE) {
    await wait(600);
    return { key: `demo-${Date.now()}`, expiresIn: 120, sentTo: `${countryCode} ${mobile}` };
  }
  const res = await api.post('/parent/authenticate.php', { username: mobile, countryCode: cc(countryCode) });
  const body = (res?.data && typeof res.data === 'object') ? res.data : {};
  if (body.status !== 'success') {
    const err = new Error(body.error || 'Could not send OTP. The server returned an unexpected response.');
    err.retryAfter = typeof body.data === 'number' ? body.data : null;
    throw err;
  }
  // `data` is the opaque login secret echoed back on /login.php.
  return { key: body.data, expiresIn: 120, message: body.message || '' };
}

export async function verifyOtp({ mobile, countryCode = '+91', otp, key }) {
  if (DEMO_MODE) {
    await wait(700);
    if (otp !== DEMO_OTP) {
      const err = new Error('Incorrect OTP. In demo mode the OTP is 1234.');
      err.code = 'INVALID_OTP';
      throw err;
    }
    demoParentState = { ...demoParentState, mobile, countryCode };
    return {
      token: `demo.${btoa(`${countryCode}${mobile}`)}.${Date.now()}`,
      parent: { ...demoParentState, profileComplete: isProfileComplete({ ...demoParentState, profileComplete: undefined }) },
      children: demoChildren,
    };
  }
  const res = await api.post('/parent/login.php', {
    username: mobile, countryCode: cc(countryCode), passcode: otp, key,
  });
  const body = res?.data || {};
  if (body.status !== 'success' || !body.data) {
    throw new Error(body.error || 'Incorrect OTP');
  }
  // login.php returns the token in `data`; the Child shape comes from me.php.
  return { token: body.data, isNewParent: Boolean(body.isNewParent), mappedStudents: body.mappedStudents || [] };
}

export async function logout() {
  if (DEMO_MODE) return;
  try {
    await api.post('/parent/logout.php');
  } catch {
    // Session is being dropped client-side regardless.
  }
}

// ── Identity ──────────────────────────────────────────────────────────────
export async function getMe() {
  if (DEMO_MODE) {
    await wait(300);
    return {
      parent: { ...demoParentState, profileComplete: isProfileComplete({ ...demoParentState, profileComplete: undefined }) },
      children: demoChildren,
    };
  }
  const res = await api.get('/parent/me.php');
  return unwrap(res);
}

// ── Profile ───────────────────────────────────────────────────────────────
export async function updateProfile({ name, email, place, gender }) {
  if (DEMO_MODE) {
    await wait(500);
    if (!name || name.trim().length < 2) throw new Error('Please enter a name between 2 and 80 characters');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address');
    demoParentState = { ...demoParentState, name: name.trim(), email: email || null, place: place || null, gender: gender || null };
    return { ...demoParentState, profileComplete: isProfileComplete({ ...demoParentState, profileComplete: undefined }) };
  }
  const res = await api.post('/parent/update-profile.php', { name, email, place, gender });
  return unwrap(res);
}

// ── Per-child data ────────────────────────────────────────────────────────
export async function getStudent360(childId) {
  if (DEMO_MODE) {
    await wait(500);
    return demoStudent360[childId] ?? null;
  }
  const res = await api.get(withChild('/parent/student-360.php', childId));
  return unwrap(res);
}

// Class statistics for one quiz row of student-360 `quizzes[]`
// ({ quizId, attemptId, ... }). Mirrors the candidate app's quiz-stats.php.
export async function getQuizStats(childId, quiz) {
  if (DEMO_MODE) {
    await wait(450);
    const known = demoQuizStats[quiz?.quizId];
    if (known) return known;
    const max = Number(quiz?.max) || 100;
    const mine = Number(quiz?.score) || 0;
    return {
      maxScore: max, myScore: mine, myRank: null, classStrength: 44,
      topScore: Math.min(max, mine + 12), classAverage: Math.max(0, Math.round(mine * 0.92)), subjects: [],
    };
  }
  const params = new URLSearchParams({ candidateId: childId, quizId: quiz?.quizId ?? '' });
  if (quiz?.attemptId) params.set('attemptId', quiz.attemptId);
  const res = await api.get(`/parent/quiz-stats.php?${params}`);
  return unwrap(res);
}

// Video course progress per subject → chapter → module (watch history).
// Feeds the "Lectures Watched" card and its per-subject popup on the Performance page.
export async function getCourseProgress(childId) {
  if (DEMO_MODE) {
    await wait(450);
    return demoCourseProgress[childId] ?? null;
  }
  const res = await api.get(withChild('/parent/course-progress.php', childId));
  return unwrap(res);
}

export async function getCourses(childId) {
  if (DEMO_MODE) {
    await wait(400);
    return demoCourses[childId] ?? [];
  }
  const res = await api.get(withChild('/parent/courses.php', childId));
  return unwrap(res);
}

export async function getHostel(childId) {
  if (DEMO_MODE) {
    await wait(400);
    return demoHostel[childId] ?? null;
  }
  const res = await api.get(withChild('/parent/hostel.php', childId));
  return unwrap(res);
}

// ── Hostel leave requests ─────────────────────────────────────────────────
// Demo-mode requests live in memory so a new one sticks for the session.
const demoLeaveState = Object.fromEntries(
  Object.entries(demoHostelLeaves).map(([k, v]) => [k, [...(v || [])]]),
);

export async function getHostelLeaves(childId) {
  if (DEMO_MODE) {
    await wait(350);
    return demoLeaveState[childId] ?? [];
  }
  const res = await api.get(withChild('/parent/hostel-leaves.php', childId));
  return unwrap(res);
}

// Creates a leave request for the child. The server notifies the hostel
// provider and returns the stored request (status `pending`).
export async function requestHostelLeave(childId, { outAt, inAt, reason, goingTo, destination, mode, remarks }) {
  const payload = {
    outAt, inAt, reason, goingTo,
    destination: goingTo === 'Other' ? destination || null : null,
    mode, remarks: remarks || null,
  };
  if (DEMO_MODE) {
    await wait(600);
    const days = leaveDays(outAt, inAt);
    if (!days || new Date(inAt) <= new Date(outAt)) throw new Error('The in date must be after the out date');
    const req = {
      id: `L-${Date.now()}`, ...payload, days, status: 'pending',
      requestedOn: new Date().toISOString().slice(0, 16), decidedOn: null, decisionNote: null,
    };
    demoLeaveState[childId] = [req, ...(demoLeaveState[childId] || [])];
    return req;
  }
  const res = await api.post('/parent/hostel-leave-request.php', { candidateId: childId, ...payload });
  return unwrap(res);
}

export async function getCoursePayments(childId) {
  if (DEMO_MODE) {
    await wait(450);
    return demoCoursePayments[childId] ?? [];
  }
  const res = await api.get(withChild('/parent/course-payments.php', childId));
  return unwrap(res);
}

export async function getContacts(childId) {
  if (DEMO_MODE) {
    await wait(300);
    return demoContacts[childId] ?? [];
  }
  const res = await api.get(withChild('/parent/contacts.php', childId));
  return unwrap(res);
}

export async function getProgressReports(childId) {
  if (DEMO_MODE) {
    await wait(350);
    return demoProgressReports[childId] ?? [];
  }
  const res = await api.get(withChild('/parent/progress-reports.php', childId));
  return unwrap(res);
}
