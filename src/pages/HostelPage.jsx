import React, { useEffect, useState } from 'react';
import { getHostel, getHostelLeaves } from '../lib/parentApi';
import { useChildData } from '../components/StudentProvider';
import Avatar from '../components/Avatar';
import LeaveRequestDialog from '../components/LeaveRequestDialog';
import { useToast } from '../components/Toast';
import { Card, PageState, Pill } from '../components/ui';
import { Icon } from '../components/Icons';
import { daysUntil, formatDate, formatDateTime, formatINR, formatMonth, formatTime } from '../lib/format';

const STATUS_TONE = { paid: 'lime', pending: 'sky', overdue: 'orange' };
const LEAVE_TONE = { pending: 'sky', approved: 'lime', rejected: 'orange', cancelled: 'ghost' };
const LEAVE_STATUS = {
  pending: 'Awaiting hostel approval',
  approved: 'Approved by the hostel',
  rejected: 'Not approved',
  cancelled: 'Cancelled',
};
const cap = (w = '') => w.charAt(0).toUpperCase() + w.slice(1);

// A pending payment past its due date is overdue, whatever the server says.
function effectiveStatus(p) {
  if (p.status === 'pending' && (daysUntil(p.dueOn) ?? 0) < 0) return 'overdue';
  return p.status;
}

const digitsOf = (ph = '') => String(ph).replace(/\D/g, '');
// "96331 04657" style for display; links use the raw digits.
const prettyPhone = (d = '') => (d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : d);

// One person the parent can reach about the hostel: name, role, every phone
// they have, and quick call / WhatsApp actions on the first number.
function HostelContact({ c }) {
  const phones = c.phones.map(digitsOf).filter(Boolean);
  const first = phones[0];
  return (
    <li className="pp-contact-row">
      <Avatar name={c.name} size={44} radius="14px" />
      <div className="pp-contact-meta">
        <strong>{c.name}</strong>
        <small>{c.role}</small>
        {phones.length > 0 && (
          <span className="pp-contact-phones">
            {phones.map((d) => <a key={d} href={`tel:+91${d}`}>+91 {prettyPhone(d)}</a>)}
          </span>
        )}
      </div>
      {first && (
        <div className="pp-contact-actions">
          <a className="pp-icon-btn is-call" href={`tel:+91${first}`} aria-label={`Call ${c.name}`} title="Call"><Icon.Phone width={17} height={17} /></a>
          <a className="pp-icon-btn is-wa" href={`https://wa.me/91${first}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} title="WhatsApp"><Icon.Chat width={17} height={17} /></a>
        </div>
      )}
    </li>
  );
}

// One leave request, laid out so a parent can read it at a glance: when the
// student is out and back, why and where they are going, and what the hostel
// decided. The same markup serves phones and desktops.
function LeaveRow({ l }) {
  const status = l.status || 'pending';
  const decided = l.decidedOn && (status === 'approved' || status === 'rejected');
  const where = l.goingTo === 'Other' ? (l.destination || 'Other') : (l.goingTo || '—');
  return (
    <li className={`pp-leave is-${status}`}>
      <div className="pp-leave-when">
        <div className="pp-leave-stamp">
          <small>Out</small>
          <strong>{formatDate(l.outAt, { weekday: 'short' })}</strong>
          <span>{formatTime(l.outAt)}</span>
        </div>
        <span className="pp-leave-arrow" aria-hidden="true"><Icon.ArrowUpRight width={16} height={16} /></span>
        <div className="pp-leave-stamp">
          <small>In</small>
          <strong>{formatDate(l.inAt, { weekday: 'short' })}</strong>
          <span>{formatTime(l.inAt)}</span>
        </div>
        <Pill tone="dark" size="sm" className="pp-leave-days">{l.days} {l.days === 1 ? 'day' : 'days'}</Pill>
      </div>

      <dl className="pp-leave-facts">
        <div><dt>Reason</dt><dd>{l.reason || '—'}</dd></div>
        <div><dt>Going to</dt><dd>{where}</dd></div>
        <div><dt>Travelling</dt><dd>{l.mode || '—'}</dd></div>
        {l.remarks && <div className="is-wide"><dt>Note</dt><dd>“{l.remarks}”</dd></div>}
      </dl>

      <div className="pp-leave-status">
        <Pill tone={LEAVE_TONE[status] || 'ghost'}>{cap(status)}</Pill>
        <small>{LEAVE_STATUS[status] || cap(status)}</small>
        <small>Requested {formatDateTime(l.requestedOn)}</small>
        {decided && <small>{status === 'approved' ? 'Approved' : 'Declined'} {formatDateTime(l.decidedOn)}</small>}
        {l.decisionNote && <p className="pp-leave-note"><b>Hostel says:</b> {l.decisionNote}</p>}
      </div>
    </li>
  );
}

export default function HostelPage() {
  const { data, loading, error, child } = useChildData(getHostel);
  const leavesQ = useChildData(getHostelLeaves);
  // Requests created this session sit on top of the fetched list; cleared on child switch.
  const [added, setAdded] = useState([]);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const toast = useToast();
  useEffect(() => { setAdded([]); setLeaveOpen(false); }, [child?.id]);

  if (loading || error) return <PageState loading={loading} error={error} />;

  if (!data) {
    return (
      <div className="pp-page">
        <Card className="pp-state">
          <span className="pp-state-icon"><Icon.Home /></span>
          <strong>{child?.name} is a day scholar</strong>
          <p>No hostel or residence is mapped to this student. If that's not right, contact the centre office.</p>
        </Card>
      </div>
    );
  }

  const { residence, room, checkInOn, rent, payments = [] } = data;
  const withStatus = payments.map((p) => ({ ...p, status: effectiveStatus(p) }));

  const leaves = [...added, ...(leavesQ.data || [])];
  const providerPhones = residence.providerPhones || [];
  const contacts = [
    (residence.wardenName || residence.wardenPhone) && {
      id: 'warden', name: residence.wardenName || 'Warden', role: 'Warden',
      phones: residence.wardenPhone ? [residence.wardenPhone] : [],
    },
    (residence.providerName || providerPhones.length > 0) && {
      id: 'provider', name: residence.providerName || 'Hostel provider', role: 'Hostel provider',
      phones: providerPhones,
    },
  ].filter(Boolean);

  return (
    <div className="pp-page">
      <div className="pp-grid pp-grid-hostel-top">
        <Card className="pp-hostel-hero">
          <div className="pp-card-head">
            <h2>Residence</h2>
            <button type="button" className="pp-btn pp-btn-primary pp-btn-leave" onClick={() => setLeaveOpen(true)}>
              <Icon.Calendar width={16} height={16} /> Request Leave
            </button>
          </div>
          <div className="pp-hostel-name">
            <span className="pp-hostel-icon"><Icon.Home /></span>
            <div>
              <strong>{residence.name}</strong>
              <small><Icon.Pin width={14} height={14} /> {residence.address}</small>
            </div>
          </div>
          <div className="pp-room-tiles">
            <div className="pp-room-tile is-dark">
              <small>Room</small>
              <strong>{room.number || '—'}</strong>
              <span>{[room.block ? `Block ${room.block}` : null, room.floor != null ? `Floor ${room.floor}` : null].filter(Boolean).join(' · ') || room.type || ''}</span>
            </div>
            <div className="pp-room-tile">
              <small>Monthly fee</small>
              <strong>{rent.monthlyAmount != null ? formatINR(rent.monthlyAmount) : '—'}</strong>
              <span>{rent.deposit ? `Deposit ${formatINR(rent.deposit)}` : ''}</span>
            </div>
            <div className="pp-room-tile">
              <small>Joined On</small>
              <strong>{checkInOn ? formatDate(checkInOn, { year: undefined }) : '—'}</strong>
              <span>{[checkInOn ? new Date(checkInOn).getFullYear() : null, room.bed && room.mess ? `Mess: ${room.mess}` : null].filter(Boolean).join(' · ')}</span>
            </div>
          </div>
          {rent.includes?.length > 0 && (
            <div className="pp-hostel-amenities">
              <small className="pp-includes-label">Amenities</small>
              <ul className="pp-includes">
                {rent.includes.map((x) => <li key={x}><Icon.Check width={14} height={14} /> {x}</li>)}
              </ul>
            </div>
          )}
        </Card>

        <Card className="pp-hostel-contacts">
          <div className="pp-card-head">
            <h2>Contacts</h2>
            <span className="pp-kpi-icon"><Icon.Contacts width={16} height={16} /></span>
          </div>
          {contacts.length > 0 ? (
            <ul className="pp-contact-list">
              {contacts.map((c) => <HostelContact key={c.id} c={c} />)}
            </ul>
          ) : (
            <p className="pp-foot-note">No warden or provider contact is listed for this residence yet.</p>
          )}
        </Card>
      </div>

      <Card>
        <div className="pp-card-head">
          <h2>Rent payments</h2>
          <Pill tone="ghost">{withStatus.length} records</Pill>
        </div>

        {/* Desktop: table. Mobile: stacked rows (CSS switches). */}
        <div className="pp-table-wrap">
          <table className="pp-table pp-payments">
            <thead>
              <tr><th>Month</th><th>Amount</th><th>Due on</th><th>Paid on</th><th>Mode</th><th>Receipt</th><th>Status</th></tr>
            </thead>
            <tbody>
              {withStatus.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{formatMonth(p.month)}</strong>
                    {p.note && <small className="pp-td-note">{p.note}</small>}
                  </td>
                  <td className="pp-td-amount">{formatINR(p.amount)}</td>
                  <td className="pp-td-muted">{formatDate(p.dueOn)}</td>
                  <td>{p.paidOn ? formatDate(p.paidOn) : <span className="pp-td-muted">—</span>}{p.late && <small className="pp-td-note is-warn">Paid late</small>}</td>
                  <td className="pp-td-muted">{p.mode || '—'}</td>
                  <td className="pp-td-muted">{p.receiptNo || '—'}</td>
                  <td><Pill tone={STATUS_TONE[p.status] || 'ghost'}>{cap(p.status)}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="pp-payment-list">
          {withStatus.map((p) => (
            <li key={p.id} className="pp-payment">
              <div className="pp-payment-row">
                <strong>{formatMonth(p.month)}</strong>
                <Pill tone={STATUS_TONE[p.status] || 'ghost'}>{cap(p.status)}</Pill>
              </div>
              <div className="pp-payment-row">
                <span className="pp-td-amount">{formatINR(p.amount)}</span>
                <small>Due {formatDate(p.dueOn, { year: undefined })}</small>
              </div>
              <div className="pp-payment-row pp-payment-meta">
                <small>{p.paidOn ? `Paid ${formatDate(p.paidOn, { year: undefined })} · ${p.mode}` : 'Not paid yet'}{p.late ? ' · late' : ''}</small>
                <small>{p.receiptNo || ''}</small>
              </div>
              {p.note && <small className="pp-td-note">{p.note}</small>}
            </li>
          ))}
        </ul>

        <p className="pp-foot-note">
          Pay at the residence office or via the payment link shared on WhatsApp. Receipts are issued within 24 hours.
        </p>
      </Card>

      <Card className="pp-leave-card">
        <div className="pp-card-head">
          <h2>Hostel Leave Requests</h2>
          <button type="button" className="pp-btn pp-btn-primary pp-btn-leave" onClick={() => setLeaveOpen(true)}>
            <Icon.Calendar width={16} height={16} /> Request Leave
          </button>
        </div>

        {leavesQ.loading && leaves.length === 0 ? (
          <p className="pp-leave-empty">Loading leave requests…</p>
        ) : leaves.length === 0 ? (
          <p className="pp-leave-empty">No leave requests yet. Use <b>Request Leave</b> when {child?.name?.split(' ')[0] || 'your child'} needs a few days away from the hostel.</p>
        ) : (
          <ul className="pp-leave-rows">
            {leaves.map((l) => <LeaveRow key={l.id} l={l} />)}
          </ul>
        )}

        <p className="pp-foot-note">
          The hostel provider is notified the moment a request is sent and confirms it from their side. Approved leaves still need the warden's sign-out at the gate.
        </p>
      </Card>

      <LeaveRequestDialog
        open={leaveOpen}
        childId={child?.id}
        childName={child?.name}
        onClose={() => setLeaveOpen(false)}
        onCreated={(req) => {
          setAdded((a) => [req, ...a]);
          setLeaveOpen(false);
          toast('Leave request sent. The hostel provider has been notified.');
        }}
      />
    </div>
  );
}
