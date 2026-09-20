import React, { useEffect } from 'react';
import { Icon } from './Icons';
import { Pill } from './ui';
import { formatDate, formatDateTime, formatTime } from '../lib/format';

export const LEAVE_TONE = { pending: 'sky', approved: 'lime', rejected: 'orange', cancelled: 'ghost' };
export const LEAVE_STATUS = {
  pending: 'Awaiting hostel approval',
  approved: 'Approved by the hostel',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};
export const cap = (w = '') => w.charAt(0).toUpperCase() + w.slice(1);

/**
 * Full details of one hostel leave request (a row of hostel-leaves[]), opened
 * from the compact list on the Hostel page. Renders nothing when `leave` is null.
 */
export default function LeaveDetailsDialog({ leave, childName, onClose }) {
  useEffect(() => {
    if (!leave) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [leave, onClose]);

  if (!leave) return null;

  const l = leave;
  const status = l.status || 'pending';
  const decided = l.decidedOn && (status === 'approved' || status === 'rejected');
  const where = l.goingTo === 'Other' ? (l.destination || 'Other') : (l.goingTo || '—');
  const first = childName ? childName.split(' ')[0] : 'Student';

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`pp-modal pp-leave-modal is-${status}`} role="dialog" aria-modal="true" aria-labelledby="pp-leave-title">
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-leave-title">Leave request</h2>
            <p>{formatDate(l.outAt)} – {formatDate(l.inAt)} · {l.days} {l.days === 1 ? 'day' : 'days'}</p>
          </div>
          <button type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close"><Icon.X width={18} height={18} /></button>
        </div>

        <div className="pp-leave-status">
          <Pill tone={LEAVE_TONE[status] || 'ghost'}>{cap(status)}</Pill>
          <small>{LEAVE_STATUS[status] || cap(status)}</small>
          {l.decisionNote && <p className="pp-leave-note"><b>Hostel says:</b> {l.decisionNote}</p>}
        </div>

        <dl className="pp-leave-facts">
          <div><dt>Out</dt><dd>{formatDate(l.outAt, { weekday: 'short' })} · {formatTime(l.outAt)}</dd></div>
          <div><dt>In</dt><dd>{formatDate(l.inAt, { weekday: 'short' })} · {formatTime(l.inAt)}</dd></div>
          <div><dt>Reason</dt><dd>{l.reason || '—'}</dd></div>
          <div><dt>Going to</dt><dd>{where}</dd></div>
          <div><dt>Travelling</dt><dd>{l.mode || '—'}</dd></div>
          <div><dt>Away for</dt><dd>{l.days} {l.days === 1 ? 'day' : 'days'}</dd></div>
          {l.remarks && <div className="is-wide"><dt>Note from you</dt><dd>“{l.remarks}”</dd></div>}
        </dl>

        <ul className="pp-leave-timeline">
          <li><span>Requested</span><b>{formatDateTime(l.requestedOn)}</b></li>
          {decided && <li><span>{status === 'approved' ? 'Approved' : 'Declined'}</span><b>{formatDateTime(l.decidedOn)}</b></li>}
          {l.id && <li><span>Reference</span><b>{l.id}</b></li>}
        </ul>

        <p className="pp-foot-note">
          {status === 'approved'
            ? `${first} still needs the warden's sign-out at the gate when leaving.`
            : status === 'pending'
              ? 'The hostel provider has been notified and will confirm from their side.'
              : ''}
        </p>
      </div>
    </div>
  );
}
