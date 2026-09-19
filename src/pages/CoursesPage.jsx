import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getCourses, getCoursePayments } from '../lib/parentApi';
import { useChildData } from '../components/StudentProvider';
import { Card, PageState, Pill } from '../components/ui';
import { Icon } from '../components/Icons';
import { daysUntil, formatDate, formatINR } from '../lib/format';

// Access status from the end date: expired / expiring (<= 30 days) / active.
function accessStatus(course) {
  const d = daysUntil(course.accessEndsOn);
  if (d === null) return { tone: 'ghost', label: 'No end date', days: null };
  if (d < 0) return { tone: 'muted', label: 'Expired', days: d };
  if (d <= 30) return { tone: 'orange', label: `Ends in ${d} day${d === 1 ? '' : 's'}`, days: d };
  return { tone: 'lime', label: 'Active', days: d };
}

// ── Course payments ───────────────────────────────────────────────────────
const METHOD_LABEL = {
  upi: 'UPI', card: 'Card', netbanking: 'Net banking', bank_transfer: 'Bank transfer',
  cash: 'Cash', cheque: 'Cheque', dd: 'Demand draft', wallet: 'Wallet',
};
const PAY_STATUS = {
  paid: { label: 'Paid', tone: 'lime' },
  scheduled: { label: 'Upcoming', tone: 'sky' },
  pending: { label: 'Pending', tone: 'sky' },
  overdue: { label: 'Overdue', tone: 'orange' },
  failed: { label: 'Failed', tone: 'orange' },
};

// 'scheduled' past its due date is overdue, whatever the server says.
function payStatus(p) {
  if ((p.status === 'scheduled' || p.status === 'pending') && (daysUntil(p.dueOn) ?? 0) < 0) return 'overdue';
  return p.status;
}

function dueText(iso) {
  const d = daysUntil(iso);
  if (d === null) return '';
  if (d < 0) return `overdue by ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'}`;
  if (d === 0) return 'due today';
  return `due in ${d} day${d === 1 ? '' : 's'}`;
}

// Normalised orders: statuses resolved, installments in order.
function useOrders() {
  const state = useChildData(getCoursePayments);
  const orders = useMemo(() => (state.data || []).map((o) => ({
    ...o,
    payments: [...(o.payments || [])]
      .map((p) => ({ ...p, status: payStatus(p) }))
      .sort((a, b) => (a.installmentNo || 0) - (b.installmentNo || 0)),
  })), [state.data]);
  return { ...state, orders };
}

// The order for a course: by course id, else by name (older orders carry only the name).
function orderForCourse(orders, course) {
  return orders.find((o) => String(o.courseId) === String(course.id))
    || orders.find((o) => o.courseName === course.name)
    || null;
}

// One order: summary strip, progress bar and one line per installment.
function OrderDetails({ order: o }) {
  const oPaid = o.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const balance = Math.max(0, o.totalAmount - oPaid);
  const pct = o.totalAmount ? Math.round((oPaid / o.totalAmount) * 100) : 0;
  const hasOverdue = o.payments.some((p) => p.status === 'overdue');
  const settled = oPaid >= o.totalAmount;
  const paidCount = o.payments.filter((p) => p.status === 'paid').length;
  const tone = settled ? 'lime' : hasOverdue ? 'orange' : 'dark';

  return (
    <div className="pp-fee">
      <div className="pp-fee-summary">
        <div><small>Total fee</small><strong>{formatINR(o.totalAmount)}</strong></div>
        <div><small>Paid</small><strong className="is-good">{formatINR(oPaid)}</strong></div>
        <div><small>Balance</small><strong className={hasOverdue ? 'is-bad' : ''}>{formatINR(balance)}</strong></div>
      </div>
      <div className="pp-fee-progress">
        <div className="pp-bar"><div className={`pp-bar-fill is-${tone}`} style={{ width: `${pct}%` }} /></div>
        <span>{pct}% paid · {paidCount} of {o.payments.length} {o.paymentMode === 'INSTALLMENTS' ? 'installments' : 'payments'}</span>
      </div>

      <ul className="pp-installments">
        {o.payments.map((p) => {
          const meta = PAY_STATUS[p.status] || { label: p.status, tone: 'ghost' };
          const when = p.status === 'paid'
            ? [`Paid ${formatDate(p.paidOn)}`, p.method && (METHOD_LABEL[p.method] || p.method), p.invoiceNo && `Invoice ${p.invoiceNo}`]
            : [`Due ${formatDate(p.dueOn)}`, dueText(p.dueOn)];
          return (
            <li key={p.id} className={`pp-installment is-${p.status}`}>
              <span className={`pp-installment-dot is-${p.status}`} aria-hidden="true">
                {p.status === 'paid' ? <Icon.Check width={12} height={12} /> : p.status === 'overdue' ? '!' : p.installmentNo}
              </span>
              <div className="pp-installment-main">
                <strong>{p.label}</strong>
                <small>{when.filter(Boolean).join(' · ')}</small>
              </div>
              <div className="pp-installment-side">
                <b>{formatINR(p.amount)}</b>
                <Pill tone={meta.tone} size="sm">{meta.label}</Pill>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="pp-fee-note">
        <Icon.Receipt width={14} height={14} />
        Paper invoices are handed over at the centre office when a payment is made. Please keep them for your records.
      </p>
    </div>
  );
}

// "Fee Details" popup for one course. Closes on Escape, backdrop tap or the X.
function FeeDetailsDialog({ course, order, onClose }) {
  const closeRef = useRef(null);
  const open = Boolean(course);

  useEffect(() => {
    if (!open) return undefined;
    closeRef.current?.focus();
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const oPaid = order ? order.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0) : 0;
  const settled = order ? oPaid >= order.totalAmount : false;
  const hasOverdue = order ? order.payments.some((p) => p.status === 'overdue') : false;

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="pp-modal pp-fee-modal" role="dialog" aria-modal="true" aria-labelledby="pp-fee-title">
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-fee-title">{course.name}</h2>
            <p>
              {order ? <>{order.orderNumber} · {formatDate(order.orderDate)}</> : 'Fee details'}
              {order && (
                <Pill tone={settled ? 'lime' : hasOverdue ? 'orange' : 'sky'} size="sm" className="pp-fee-status">
                  {settled ? 'Settled' : hasOverdue ? 'Overdue' : 'In progress'}
                </Pill>
              )}
            </p>
          </div>
          <button ref={closeRef} type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close">
            <Icon.X width={18} height={18} />
          </button>
        </div>
        {order
          ? <OrderDetails order={order} />
          : <p className="pp-empty">No fee records are on file for this course. Please check with the centre office.</p>}
      </div>
    </div>
  );
}

// One table row per course. `Fee Details` opens the order popup; rows whose
// access has ended sit at the bottom, dimmed, with the button disabled.
function CourseRow({ c, order, feesLoading, onFees }) {
  const status = accessStatus(c);
  const isSeries = c.type === 'test-series';
  const expired = status.days !== null && status.days < 0;
  return (
    <tr className={`pp-course-row ${expired ? 'is-expired' : ''}`} aria-disabled={expired || undefined}>
      <td>
        <div className="pp-course-cell">
          <span className={`pp-course-icon ${isSeries ? 'is-series' : ''}`}>
            {isSeries ? <Icon.Receipt width={18} height={18} /> : <Icon.Book width={18} height={18} />}
          </span>
          <div className="pp-course-title">
            <strong>{c.name}</strong>
            <small>{[isSeries ? 'Test series' : 'Course', c.mode].filter(Boolean).join(' · ')}</small>
          </div>
        </div>
      </td>
      <td className="pp-td-muted pp-td-date">{formatDate(c.enrolledOn)}</td>
      <td className={`pp-td-date ${status.tone === 'orange' ? 'pp-td-warn' : 'pp-td-muted'}`}>{formatDate(c.accessEndsOn)}</td>
      <td><Pill tone={status.tone} size="sm">{status.label}</Pill></td>
      <td className="text-right">
        <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => onFees(c)} disabled={feesLoading || expired} aria-label={`Fee details for ${c.name}`}>
          <Icon.Receipt width={14} height={14} /> Fee Details
        </button>
      </td>
    </tr>
  );
}

function CoursesTable({ courses, orders, feesLoading, onFees }) {
  return (
    <div className="pp-table-wrap">
      <table className="pp-table pp-courses-table">
        <thead>
          <tr>
            <th>Course</th><th>Enrolled</th><th>Access ends</th><th>Status</th><th className="text-right">Fees</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <CourseRow key={c.id} c={c} order={orderForCourse(orders, c)} feesLoading={feesLoading} onFees={onFees} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CoursesPage() {
  const { data, loading, error, child } = useChildData(getCourses);
  const { orders, loading: feesLoading } = useOrders();
  const [feeCourse, setFeeCourse] = useState(null);

  if (loading || error) return <PageState loading={loading} error={error} />;

  const courses = data || [];
  const active = courses.filter((c) => (daysUntil(c.accessEndsOn) ?? 1) >= 0);
  const expired = courses.filter((c) => (daysUntil(c.accessEndsOn) ?? 1) < 0);

  if (!courses.length) {
    return (
      <div className="pp-page">
        <Card className="pp-state"><p>{child?.name} is not enrolled in any course yet.</p></Card>
      </div>
    );
  }

  return (
    <div className="pp-page">
      <FeeDetailsDialog
        course={feeCourse}
        order={feeCourse ? orderForCourse(orders, feeCourse) : null}
        onClose={() => setFeeCourse(null)}
      />

      <Card>
        <div className="pp-card-head">
          <h2>Enrolled courses</h2>
          <div className="pp-course-counts">
            <Pill tone="ghost">{active.length} active</Pill>
            {expired.length > 0 && <Pill tone="muted">{expired.length} ended</Pill>}
          </div>
        </div>
        {/* Active first, then the ones whose access has ended. */}
        <CoursesTable courses={[...active, ...expired]} orders={orders} feesLoading={feesLoading} onFees={setFeeCourse} />
      </Card>
    </div>
  );
}
