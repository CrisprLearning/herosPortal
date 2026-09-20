import React, { useEffect, useRef, useState } from 'react';
import { requestHostelLeave } from '../lib/parentApi';
import { Icon } from './Icons';
import { formatDateTime, leaveDays } from '../lib/format';

export const LEAVE_REASONS = ['Medical', 'Festival', 'Family Function', 'Personal', 'Other'];
export const LEAVE_DESTINATIONS = ['Home', 'Other'];
export const LEAVE_MODES = ['Student by Self', 'Parent Accompanying', 'Guardian Accompanying', 'with Fellow Students'];

// Sensible defaults so a parent normally only has to pick the two dates:
// students usually leave after the evening session and return before class.
const DEFAULT_OUT_TIME = '17:00';
const DEFAULT_IN_TIME = '08:00';

const EMPTY = {
  outDate: '', outTime: DEFAULT_OUT_TIME, inDate: '', inTime: DEFAULT_IN_TIME,
  reason: '', goingTo: 'Home', destination: '', mode: '', remarks: '',
};

function todayIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// "YYYY-MM-DDTHH:mm" (the same shape a datetime-local input yields) or '' when incomplete.
const stamp = (date, time) => (date && time ? `${date}T${time}` : '');

function Select({ label, options, value, onChange, placeholder, inputRef }) {
  return (
    <label className="pp-field">
      <span>{label}</span>
      <span className="pp-select-field">
        <select ref={inputRef} className={`pp-select ${value ? '' : 'is-empty'}`} value={value} onChange={onChange}>
          <option value="" disabled>{placeholder}</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Icon.ChevronDown width={18} height={18} />
      </span>
    </label>
  );
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="pp-field">
      <span>{label}</span>
      <div className="pp-segment" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className={`pp-segment-btn ${value === o ? 'is-active' : ''}`}
            onClick={() => onChange(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// One half of the leave window: a date and a time input framed as a single
// control, with the resolved stamp echoed underneath so the parent can read
// back "Fri 25 Sep, 5:00 pm" instead of decoding two raw fields.
function WindowSlot({ title, date, time, minDate, onDate, onTime, inputRef }) {
  const at = stamp(date, time);
  return (
    <div className={`pp-window-slot ${at ? 'is-set' : ''}`}>
      <div className="pp-window-slot-title">{title}</div>
      <div className="pp-window-inputs">
        <label className="pp-window-input">
          <Icon.Calendar width={16} height={16} />
          <input ref={inputRef} type="date" value={date} min={minDate} onChange={onDate} aria-label={`${title} date`} />
        </label>
        <label className="pp-window-input is-time">
          <Icon.Clock width={16} height={16} />
          <input type="time" value={time} onChange={onTime} aria-label={`${title} time`} />
        </label>
      </div>
      <div className="pp-window-readout" aria-live="polite">
        {at ? formatDateTime(at, { weekday: 'short' }) : 'Pick a date'}
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

  const outAt = stamp(form.outDate, form.outTime);
  const inAt = stamp(form.inDate, form.inTime);
  const days = outAt && inAt ? leaveDays(outAt, inAt) : null;
  const validSpan = days !== null && new Date(inAt) > new Date(outAt);
  const badSpan = outAt && inAt && !validSpan;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!outAt) { setError('Please pick the out date and time.'); return; }
    if (!inAt) { setError('Please pick the in date and time.'); return; }
    if (!validSpan) { setError('The in date must be after the out date.'); return; }
    if (!form.reason) { setError('Please choose a reason for the leave.'); return; }
    if (form.goingTo === 'Other' && !form.destination.trim()) { setError(`Please tell us where ${first} is going.`); return; }
    if (!form.mode) { setError(`Please choose how ${first} will travel.`); return; }
    setBusy(true); setError('');
    try {
      const created = await requestHostelLeave(childId, {
        outAt, inAt,
        reason: form.reason, goingTo: form.goingTo, mode: form.mode,
        destination: form.destination.trim(), remarks: form.remarks.trim(),
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

        <fieldset className={`pp-window ${badSpan ? 'is-invalid' : ''}`}>
          <legend className="pp-label">Leave window</legend>
          <div className="pp-window-grid">
            <WindowSlot
              title="Out"
              inputRef={firstRef}
              date={form.outDate} time={form.outTime} minDate={todayIso()}
              onDate={set('outDate')} onTime={set('outTime')}
            />
            <span className="pp-window-arrow" aria-hidden="true"><Icon.ArrowUpRight width={16} height={16} /></span>
            <WindowSlot
              title="In"
              date={form.inDate} time={form.inTime} minDate={form.outDate || todayIso()}
              onDate={set('inDate')} onTime={set('inTime')}
            />
          </div>
          <div className={`pp-window-summary ${validSpan ? 'is-ok' : ''} ${badSpan ? 'is-bad' : ''}`} role="status">
            {validSpan && <><b>{days} {days === 1 ? 'day' : 'days'}</b> away from the hostel</>}
            {badSpan && 'The in date and time must be after the out date and time.'}
            {!outAt && !inAt && 'Choose when the student leaves and returns.'}
            {(outAt ? !inAt : inAt) && (outAt ? 'Now pick the return date.' : 'Now pick the out date.')}
          </div>
        </fieldset>

        <div className="pp-form-grid pp-leave-grid">
          <Select
            label="Reason for leave" options={LEAVE_REASONS} placeholder="Select a reason"
            value={form.reason} onChange={set('reason')}
          />
          <Select
            label="Mode of travel" options={LEAVE_MODES} placeholder="How will they travel?"
            value={form.mode} onChange={set('mode')}
          />
          <Segmented label="Going to" options={LEAVE_DESTINATIONS} value={form.goingTo} onChange={pick('goingTo')} />
          {form.goingTo === 'Other' ? (
            <label className="pp-field">
              <span>Where to?</span>
              <input className="pp-input" type="text" maxLength={120} value={form.destination} onChange={set('destination')} placeholder="Place or address" />
            </label>
          ) : <div className="pp-leave-grid-gap" aria-hidden="true" />}
          <label className="pp-field is-full">
            <span>Remarks <em className="pp-opt">optional</em></span>
            <textarea className="pp-textarea" rows={2} maxLength={300} value={form.remarks} onChange={set('remarks')} placeholder="Anything the warden should know" />
          </label>
        </div>

        {error && <div className="pp-alert pp-alert-error" role="alert">{error}</div>}

        <div className="pp-modal-actions">
          <button type="button" className="pp-btn pp-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="pp-btn pp-btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
        </div>
      </form>
    </div>
  );
}
