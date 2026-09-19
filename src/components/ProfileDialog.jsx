import React, { useEffect, useRef, useState } from 'react';
import { updateProfile } from '../lib/parentApi';
import { Icon } from './Icons';

const GENDERS = ['Male', 'Female'];

/**
 * Basic-details form for the parent: name, email, place, gender.
 * Opens automatically after login while any of them is missing (`prompt`
 * mode shows a "Later" button instead of a close icon) and from the
 * "Edit profile" entry points afterwards.
 */
export default function ProfileDialog({ open, parent, prompt = false, onSaved, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', place: '', gender: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setForm({
      name: parent?.name && parent.name !== 'Parent' ? parent.name : '',
      email: parent?.email || '',
      place: parent?.place || '',
      gender: parent?.gender || '',
    });
    setError('');
    setTimeout(() => firstRef.current?.focus(), 50);
    function onKey(e) { if (e.key === 'Escape' && !busy) onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parent]);

  if (!open) return null;

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };
  const missing = [
    !form.name.trim() && 'name',
    !form.email.trim() && 'email',
    !form.place.trim() && 'place',
    !form.gender && 'gender',
  ].filter(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.name.trim().length < 2) { setError('Please enter your name.'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setError('Please enter a valid email address.'); return; }
    setBusy(true); setError('');
    try {
      const saved = await updateProfile({
        name: form.name.trim(), email: form.email.trim(), place: form.place.trim(), gender: form.gender,
      });
      onSaved?.(saved);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not save your details.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy && !prompt) onClose?.(); }}>
      <form className="pp-modal pp-profile-modal" role="dialog" aria-modal="true" aria-labelledby="pp-profile-title" onSubmit={handleSubmit} noValidate>
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-profile-title">{prompt ? 'Complete your profile' : 'Your profile'}</h2>
            <p>
              {prompt
                ? 'A few basic details help the centre reach you about your child.'
                : `Signed in as ${parent?.countryCode || '+91'} ${parent?.mobile || ''}`}
            </p>
          </div>
          {!prompt && (
            <button type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
              <Icon.X width={18} height={18} />
            </button>
          )}
        </div>

        <label className="pp-field">
          <span>Full name</span>
          <input ref={firstRef} className="pp-input" type="text" autoComplete="name" maxLength={80} value={form.name} onChange={set('name')} placeholder="Your name" />
        </label>
        <label className="pp-field">
          <span>Email</span>
          <input className="pp-input" type="email" inputMode="email" autoComplete="email" maxLength={60} value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </label>
        <label className="pp-field">
          <span>Place</span>
          <input className="pp-input" type="text" autoComplete="address-level2" maxLength={60} value={form.place} onChange={set('place')} placeholder="Town or city" />
        </label>
        <div className="pp-field">
          <span>Gender</span>
          <div className="pp-choice-row" role="radiogroup" aria-label="Gender">
            {GENDERS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={form.gender === g}
                className={`pp-choice ${form.gender === g ? 'is-active' : ''}`}
                onClick={() => { setForm((f) => ({ ...f, gender: g })); setError(''); }}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="pp-alert pp-alert-error" role="alert">{error}</div>}
        {prompt && missing.length > 0 && !error && (
          <div className="pp-alert pp-alert-ok" role="status">Still missing: {missing.join(', ')}.</div>
        )}

        <div className="pp-modal-actions">
          {prompt
            ? <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose} disabled={busy}>Later</button>
            : <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>}
          <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save details'}</button>
        </div>
      </form>
    </div>
  );
}
