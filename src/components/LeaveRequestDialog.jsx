import React, { useEffect, useRef, useState } from 'react';
import { requestHostelLeave } from '../lib/parentApi';
import { Icon } from './Icons';
import { formatDateTime, leaveDays } from '../lib/format';

export const LEAVE_REASONS = ['Medical', 'Festival', 'Family Function', 'Personal', 'Other'];
export const LEAVE_DESTINATIONS = ['Home', 'Other'];
export const LEAVE_MODES = ['Student by Self', 'Parent Accompanying', 'Guardian Accompanying', 'with Fellow Students'];

const EMPTY = { outAt: '', inAt: '', reason: '', goingTo: 'Home', destination: '', mode: '', remarks: '' };

function Choices({ label, options, value, onChange }) {
  return (
    <div className="pp-field">
      <span>{label}</span>
      <div className="pp-choice-row" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className={`pp-choice ${value === o ? 'is-active' : ''}`}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * "Request leave" form for a hosteller: out/in stamps, reason, destination,
 * travel mode and remarks. On success the created request (status `pending`)
 * is handed back through `onCreated`; the server notifies the hostel provider.
 */
export default function LeaveRequestDialog({ open, childId, childName, onCreated, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const firstRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setForm(EMPTY);
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
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError(''); };
  const pick = (k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setError(''); };
  const first = childName ? childName.split(' ')[0] : 'the student';
  const days = form.outAt && form.inAt ? leaveDays(form.outAt, form.inAt) : null;
  const validSpan = days !== null && new Date(form.inAt) > new Date(form.outAt);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.outAt) { setError('Please pick the out date and time.'); return; }
    if (!form.inAt) { setError('Please pick the in date and time.'); return; }
    if (!validSpan) { setError('The in date must be after the out date.'); return; }
    if (!form.reason) { setError('Please choose a reason for the leave.'); return; }
    if (form.goingTo === 'Other' && !form.destination.trim()) { setError(`Please tell us where ${first} is going.`); return; }
    if (!form.mode) { setError(`Please choose how ${first} will travel.`); return; }
    setBusy(true); setError('');
    try {
      const created = await requestHostelLeave(childId, {
        ...form, destination: form.destination.trim(), remarks: form.remarks.trim(),
      });
      onCreated?.(created);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose?.(); }}>
      <form className="pp-modal pp-leave-modal" role="dialog" aria-modal="true" aria-labelledby="pp-leave-title" onSubmit={handleSubmit} noValidate>
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-leave-title">Request leave</h2>
            <p>Tell the hostel when {first} will be away. The hostel provider is notified as soon as you send this.</p>
          </div>
          <button type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close" disabled={busy}>
            <Icon.X width={18} height={18} />
          </button>
        </div>

        <div className="pp-form-grid pp-leave-dates">
          <label className="pp-field">
            <span>Out date / time</span>
            <input ref={firstRef} className="pp-input" type="datetime-local" value={form.outAt} onChange={set('outAt')} />
          </label>
          <label className="pp-field">
            <span>In date / time</span>
            <input className="pp-input" type="datetime-local" value={form.inAt} min={form.outAt || undefined} onChange={set('inAt')} />
          </label>
        </div>
        {validSpan && (
          <div className="pp-leave-span" role="status">
            <b>{days} {days === 1 ? 'day' : 'days'}</b> · out {formatDateTime(form.outAt)}, back {formatDateTime(form.inAt)}
          </div>
        )}

        <Choices label="Reason for leave" options={LEAVE_REASONS} value={form.reason} onChange={pick('reason')} />
        <Choices label="Going to" options={LEAVE_DESTINATIONS} value={form.goingTo} onChange={pick('goingTo')} />
        {form.goingTo === 'Other' && (
          <label className="pp-field">
            <span>Where to?</span>
            <input className="pp-input" type="text" maxLength={120} value={form.destination} onChange={set('destination')} placeholder="Place or address" />
          </label>
        )}
        <Choices label="Mode" options={LEAVE_MODES} value={form.mode} onChange={pick('mode')} />
        <label className="pp-field">
          <span>Remarks <em className="pp-opt">optional</em></span>
          <textarea className="pp-textarea" rows={3} maxLength={300} value={form.remarks} onChange={set('remarks')} placeholder="Anything the warden should know" />
        </label>

        {error && <div className="pp-alert pp-alert-error" role="alert">{error}</div>}

        <div className="pp-modal-actions">
          <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </div>
  );
}
