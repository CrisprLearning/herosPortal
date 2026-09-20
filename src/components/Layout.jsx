import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearToken } from '../lib/auth';
import { logout, isProfileComplete } from '../lib/parentApi';
import { DEMO_MODE } from '../lib/api';
import { asset } from '../lib/paths';
import { Icon } from './Icons';
import Avatar from './Avatar';
import StudentSwitcher from './StudentSwitcher';
import ConfirmDialog from './ConfirmDialog';
import ProfileDialog from './ProfileDialog';
import { useStudent } from './StudentProvider';

// `title` builds the personalised page heading from the child's first name,
// e.g. "Aarav's Performance". `label` is the nav wording.
export const NAV = [
  { path: '/performance', label: 'Student 360', short: '360', icon: Icon.Grid, title: (n) => `${n}'s Performance` },
  { path: '/courses', label: 'Courses', short: 'Courses', icon: Icon.Book, title: (n) => `${n}'s Courses` },
  { path: '/hostel', label: 'Hostel', short: 'Hostel', icon: Icon.Home, title: (n) => `${n}'s Hostel Details` },
  { path: '/contacts', label: 'Contacts', short: 'Contacts', icon: Icon.Contacts, title: (n) => `${n}'s Contacts` },
];

const LOGO = asset('logo/crispr-logo.svg');

export function firstName(name = '') {
  return String(name).trim().split(/\s+/)[0] || '';
}

// Phones and tablets: the avatar at the top right opens a small menu that
// points up at the picture. Closes on outside click, Escape, or a choice.
function ProfileMenu({ parent, incomplete, busy, onProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="pp-profile-menu pp-pagehead-mobile" ref={rootRef}>
      <button type="button" className="pp-icon-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Account menu" onClick={() => setOpen((o) => !o)}>
        <Avatar name={parent?.name} size={32} />
      </button>
      {incomplete && <span className="pp-dot-warn" aria-hidden="true" />}
      {open && (
        <div className="pp-profile-pop" role="menu">
          {parent?.name && <small className="pp-profile-pop-name">{parent.name}</small>}
          <button type="button" role="menuitem" className="pp-profile-pop-item" onClick={() => { setOpen(false); onProfile(); }}>
            <Icon.User width={17} height={17} /> {incomplete ? 'Complete profile' : 'Edit profile'}
          </button>
          <button type="button" role="menuitem" className="pp-profile-pop-item is-danger" disabled={busy} onClick={() => { setOpen(false); onLogout(); }}>
            <Icon.Logout width={17} height={17} /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * App shell, same bones as the candidate portal. Desktop: left sidebar with
 * the logo, nav, parent strip and sign-out. Mobile: an in-flow page heading
 * carrying the student switcher and an account menu, plus a bottom tab bar.
 * The same NAV list drives both.
 */
export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { parent, child, children: kids, loading, updateParent } = useStudent() || {};
  const [signingOut, setSigningOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePrompt, setProfilePrompt] = useState(false);

  // Right after login: if name / email / place / gender are not all set,
  // open the profile dialog once per session (the parent can pick "Later").
  useEffect(() => {
    if (loading || !parent) return;
    let prompted = false;
    try { prompted = sessionStorage.getItem('pp_profile_prompted') === '1'; } catch { /* ignore */ }
    if (!isProfileComplete(parent) && !prompted) {
      setProfilePrompt(true);
      setProfileOpen(true);
    }
  }, [loading, parent]);

  function openProfile() {
    setProfilePrompt(false);
    setProfileOpen(true);
  }

  function closeProfile() {
    setProfileOpen(false);
    if (profilePrompt) {
      try { sessionStorage.setItem('pp_profile_prompted', '1'); } catch { /* ignore */ }
    }
  }

  function handleProfileSaved(saved) {
    updateParent?.(saved);
    setProfileOpen(false);
    try { sessionStorage.setItem('pp_profile_prompted', '1'); } catch { /* ignore */ }
  }

  const current = NAV.find((n) => location.pathname.startsWith(n.path)) || NAV[0];
  const first = firstName(child?.name);
  const heading = first ? current.title(first) : current.label;
  const incomplete = Boolean(parent) && !isProfileComplete(parent);

  useEffect(() => {
    document.title = `${heading} · Crispr Learning`;
  }, [heading]);

  // Both logout buttons open the confirmation; only the dialog's confirm
  // actually ends the session.
  function handleLogout() {
    setConfirmOpen(true);
  }

  async function confirmLogout() {
    setSigningOut(true);
    await logout();
    clearToken();
    navigate('/login', { replace: true });
  }

  const navLink = (isActive) => `pp-nav-link ${isActive ? 'is-active' : ''}`;
  const tabLink = (isActive) => `pp-tab ${isActive ? 'is-active' : ''}`;

  const profileDialog = (
    <ProfileDialog
      open={profileOpen}
      parent={parent}
      prompt={profilePrompt}
      onSaved={handleProfileSaved}
      onClose={closeProfile}
    />
  );

  const confirmDialog = (
    <ConfirmDialog
      open={confirmOpen}
      title="Sign out?"
      message="You will need your mobile number and a new OTP to sign in again."
      confirmLabel={signingOut ? 'Signing out…' : 'Sign out'}
      cancelLabel="Stay signed in"
      tone="danger"
      busy={signingOut}
      onConfirm={confirmLogout}
      onCancel={() => setConfirmOpen(false)}
    />
  );

  // No ACTIVE candidate_parent_mapping row for this parent: show a single
  // default screen with just a logout option — no navigation, no switcher.
  if (!loading && kids && kids.length === 0) {
    return (
      <div className="pp-login pp-nostudent">
        <header className="pp-login-brand">
          <img src={LOGO} alt="Crispr Learning" />
        </header>
        <div className="pp-login-card">
          <span className="pp-state-icon"><Icon.User /></span>
          <h1>No student linked yet</h1>
          <p className="pp-login-sub">
            You're signed in as <strong>{parent?.countryCode || '+91'} {parent?.mobile}</strong>, but no student is
            mapped to this number. Please contact the centre office to link your child's admission; the portal
            fills in as soon as that is done.
          </p>
          <button type="button" className="pp-btn pp-btn-ghost pp-btn-block" onClick={openProfile}>
            <Icon.User width={18} height={18} /> Edit profile
          </button>
          <button type="button" className="pp-btn pp-btn-primary pp-btn-block" onClick={handleLogout} disabled={signingOut}>
            <Icon.Logout width={18} height={18} /> Sign out
          </button>
        </div>
        <p className="pp-login-foot">Need help? Call your centre or WhatsApp +91 484 233 4455.</p>
        {profileDialog}
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className="pp-shell">
      {profileDialog}
      {confirmDialog}

      <aside className="pp-sidebar">
        <NavLink className="pp-brand-logo" to="/performance"><img src={LOGO} alt="Crispr Learning" /></NavLink>

        <nav className="pp-nav" aria-label="Primary">
          {NAV.map(({ path, label, icon: Ico }) => (
            <NavLink key={path} to={path} className={({ isActive }) => navLink(isActive)}>
              <Ico />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="pp-sidebar-foot">
          <button type="button" className="pp-user-strip" onClick={openProfile} aria-label="Edit your profile">
            <Avatar name={parent?.name || 'Parent'} size={32} />
            <div>
              <strong>{parent?.name || 'Parent'}</strong>
              <small>{parent ? (incomplete ? 'Complete your profile' : `${parent.countryCode} ${parent.mobile}`) : 'Crispr Learning'}</small>
            </div>
            {incomplete && <span className="pp-dot-warn" aria-hidden="true" />}
          </button>
          <button type="button" className="pp-nav-link pp-nav-logout" onClick={handleLogout} disabled={signingOut}>
            <Icon.Logout />
            <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      <div className="pp-main">
        <main className="pp-content">
          {DEMO_MODE && (
            <div className="pp-demo-banner" role="status">
              Demo data — connect the parent-portal API to see live records.
            </div>
          )}

          {/* Page heading (replaces the old top bar). Carries the student
              switcher everywhere and, on phones, the account menu that the
              sidebar covers on desktop. */}
          <div className="pp-pagehead">
            <h1 className="pp-pagehead-title">{heading}</h1>
            {/* On phones the switcher wraps onto its own row (see responsive.css). */}
            <StudentSwitcher />
            <div className="pp-pagehead-actions">
              <ProfileMenu
                parent={parent}
                incomplete={incomplete}
                busy={signingOut}
                onProfile={openProfile}
                onLogout={handleLogout}
              />
            </div>
          </div>
          {children}
        </main>

        <footer className="pp-foot" role="contentinfo">&copy; 2026 Crispr Learning</footer>

        <nav className="pp-tabbar" aria-label="Primary">
          {NAV.map(({ path, short, icon: Ico }) => (
            <NavLink key={path} to={path} className={({ isActive }) => tabLink(isActive)}>
              <Ico />
              <span>{short}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
