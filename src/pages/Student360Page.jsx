import React, { useEffect, useMemo, useState } from 'react';
import { getStudent360, getProgressReports, getCourseProgress } from '../lib/parentApi';
import { useChildData } from '../components/StudentProvider';
import Avatar from '../components/Avatar';
import ExamStatsDialog from '../components/ExamStatsDialog';
import ExamTrendChart from '../components/ExamTrendChart';
import ReportsDialog from '../components/ReportsDialog';
import SubjectProgressDialog from '../components/SubjectProgressDialog';
import { Icon } from '../components/Icons';
import { formatDate } from '../lib/format';
import { Card, KpiCard, PageState, Pill, Trend } from '../components/ui';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? '' : 's'}`;
const num1 = (v) => { const n = Number(v); return Number.isInteger(n) ? String(n) : n.toFixed(1); };

// Attendance: ≥85 High, 70–84 Fair, else Low.
const attTone = (p) => (p >= 85 ? 'lime' : p >= 70 ? 'sky' : 'orange');
const attLabel = (p) => (p >= 85 ? 'High' : p >= 70 ? 'Fair' : 'Low');
// Scores: ≥75 green, 50–74 amber, else red.
const toneFor = (p) => (p >= 75 ? 'lime' : p >= 50 ? 'sky' : 'orange');

// ── Attendance calendar (Mon–Sun columns, one row per week) ────────────────
function AttendanceGrid({ month }) {
  const cells = useMemo(() => {
    if (!month?.days?.length) return [];
    // JS weekday 0=Sun; shift so Monday is column 0.
    const lead = (month.days[0].weekday + 6) % 7;
    return [...Array.from({ length: lead }, () => null), ...month.days];
  }, [month]);

  if (!month) return null;
  return (
    <div className="pp-att">
      <div className="pp-att-head">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="pp-att-grid">
        {cells.map((c, i) => {
          if (!c) return <span key={`pad-${i}`} className="pp-att-cell is-empty" />;
          const title = `${formatDate(c.date, { year: undefined })} · ${c.status}`;
          return (
            <span key={c.date} className={`pp-att-cell is-${c.status}`} title={title} aria-label={title}>
              <small>{c.day}</small>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Ring chart: an SVG circle stroked to `percent`, with the number in the middle.
const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;
function RingChart({ percent, tone, label }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <svg className={`pp-donut-svg is-${tone}`} viewBox="0 0 100 100" role="img" aria-label={`${label}: ${pct}%`}>
      <circle className="pp-donut-track" cx="50" cy="50" r={RING_R} />
      <circle
        className="pp-donut-fill"
        cx="50" cy="50" r={RING_R}
        strokeDasharray={RING_C}
        strokeDashoffset={RING_C * (1 - pct / 100)}
      />
      <text className="pp-donut-value" x="50" y="50" textAnchor="middle" dominantBaseline="central">{pct}%</text>
    </svg>
  );
}

function ScoreBar({ percent, tone }) {
  return (
    <div className="pp-bar" aria-hidden="true">
      <div className={`pp-bar-fill is-${tone}`} style={{ width: `${Math.max(2, Math.min(100, percent))}%` }} />
    </div>
  );
}

// ── Course progress: how much of each subject's videos has been watched ──
function CourseProgressCard({ childName }) {
  const { data, loading, error } = useChildData(getCourseProgress);
  const [open, setOpen] = useState(null); // subject whose chapters are shown
  const subjects = data?.subjects || [];
  const first = childName ? childName.split(' ')[0] : 'the student';

  return (
    <Card className="pp-progress-card">
      <SubjectProgressDialog subject={open} childName={childName} onClose={() => setOpen(null)} />
      <div className="pp-card-head">
        <div className="pp-card-head-text">
          <h2>Lectures Watched</h2>
          <p>{data?.courseName || 'Modules watched per subject'}</p>
        </div>
      </div>
      {loading && <div className="pp-skeleton pp-skeleton-inline" aria-busy="true" />}
      {error && <p className="pp-empty">{error}</p>}
      {!loading && !error && subjects.length === 0 && (
        <p className="pp-empty">No video progress yet. It appears here once {first} starts watching course modules.</p>
      )}
      {!loading && !error && subjects.length > 0 && (
        <ul className="pp-progress-list">
          {subjects.map((s) => (
            <li key={s.id}>
              <button type="button" className="pp-progress-row" onClick={() => setOpen(s)} aria-label={`${s.name}: ${s.percent}% complete. Show chapters`}>
                <strong>{s.name}</strong>
                <span className="pp-progress-val">
                  <b>{s.percent}%</b>
                  <Icon.ChevronDown width={16} height={16} className="pp-progress-chev" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Progress reports (PDFs issued by the centre): latest one featured ──
function ProgressReportsCard({ childName }) {
  const { data, loading, error } = useChildData(getProgressReports);
  const [open, setOpen] = useState(false);
  const reports = data || [];
  const latest = reports[0];
  const first = childName ? childName.split(' ')[0] : 'the student';
  const clickable = !loading && !error && Boolean(latest);

  // The whole tile opens the report list; the download button is the one
  // control inside it that does its own thing.
  function onTileKey(e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(true); }
  }

  // The dialog lives beside the tile, not inside it: clicks in the popup
  // (close, backdrop) must not bubble into the tile and reopen it.
  return (
    <>
    <ReportsDialog open={open} reports={reports} childName={childName} onClose={() => setOpen(false)} />
    <Card
      className={`pp-reports-card ${clickable ? 'is-clickable' : ''}`}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Progress reports: ${plural(reports.length, 'report')}. Show all` : undefined}
      onClick={clickable ? () => setOpen(true) : undefined}
      onKeyDown={clickable ? onTileKey : undefined}
    >
      {loading && <div className="pp-skeleton pp-skeleton-inline" aria-busy="true" />}
      {error && <p className="pp-empty">{error}</p>}
      {!loading && !error && (
        <div className="pp-reports-compact">
          {latest ? (
            <span className="pp-doc-sheet is-sm" aria-hidden="true">
              <span className="pp-doc-fold" />
              <span className="pp-doc-badge">{(latest.fileType || 'pdf').toUpperCase()}</span>
              <span className="pp-doc-lines"><i /><i /><i /><i /></span>
              {reports.length > 1 && <span className="pp-doc-count">{reports.length > 99 ? '99+' : reports.length}</span>}
            </span>
          ) : (
            <span className="pp-kpi-icon"><Icon.FileText width={16} height={16} /></span>
          )}
          <div className="pp-reports-text">
            <h2>Progress reports</h2>
            {latest ? (
              <>
                <strong title={latest.title}>{latest.title}</strong>
                <span>Latest · issued {formatDate(latest.issuedOn)}</span>
              </>
            ) : (
              <span>None issued for {first} yet. They appear here once the centre publishes one.</span>
            )}
          </div>
          {latest && (
            <div className="pp-reports-actions">
              <a
                className="pp-icon-btn is-primary"
                href={latest.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Download ${latest.title}`}
                title="Download latest"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <Icon.Download width={17} height={17} />
              </a>
            </div>
          )}
        </div>
      )}
    </Card>
    </>
  );
}

/**
 * Student 360: the consolidated performance view. Merges the candidate
 * portal's Performance page (summary tiles, quiz scores with class stats,
 * progress reports) and Attendance page (30-day / month / year / streak
 * tiles, calendar, month-by-month summary) with the parent-only cards
 * (last tests, subject-wise).
 */
export default function Student360Page() {
  const { data, loading, error, child } = useChildData(getStudent360);
  const [monthKey, setMonthKey] = useState('');
  const [statsFor, setStatsFor] = useState(null); // quiz row whose class stats are open

  const months = data?.attendance?.months || [];
  useEffect(() => { setMonthKey(months[0]?.key || ''); setStatsFor(null); }, [data]);
  const month = months.find((m) => m.key === monthKey) || months[0];

  // Consolidated figures across every month returned (academic year so far).
  const overallAtt = useMemo(() => {
    const present = months.reduce((s, m) => s + (m.present || 0), 0);
    const absent = months.reduce((s, m) => s + (m.absent || 0), 0);
    const counted = present + absent;
    return { present, absent, counted, percent: counted ? Math.round((present / counted) * 100) : 0 };
  }, [months]);

  // Current run of consecutive present class days, newest first.
  const streak = useMemo(() => {
    const days = months.flatMap((m) => m.days || []).filter((d) => d.status === 'present' || d.status === 'absent');
    days.sort((a, b) => (a.date < b.date ? 1 : -1));
    let n = 0;
    for (const d of days) { if (d.status === 'present') n += 1; else break; }
    return n;
  }, [months]);

  if (loading || error || !data) {
    return <PageState loading={loading} error={error} empty={!data && !loading && !error ? 'No performance data yet.' : ''} />;
  }

  const {
    attendance, summary = {}, quizzes = [], subjects = [], examTrend = [], batch,
  } = data;
  const first = child?.name ? child.name.split(' ')[0] : 'Student';
  const tracked = attendance?.tracked !== false && months.length > 0;
  const sinceLabel = months.length ? (months[months.length - 1].label || '').split(' ')[0] : '';

  return (
    <div className="pp-page pp-s360">
      <ExamStatsDialog report={statsFor} childId={child?.id} childName={child?.name} onClose={() => setStatsFor(null)} />

      {/* ── PERFORMANCE: student hero + summary tiles ── */}
      <div className="pp-grid pp-grid-360-hero">
        <Card className="is-dark pp-hero-card">
          <div className="pp-hero">
            <Avatar src={child?.photo} name={child?.name} size={64} className="pp-hero-avatar" />
            <div className="pp-hero-text">
              <small>{batch?.name || child?.primaryCourse?.name || 'Student'}</small>
              <h2>{child?.name}</h2>
              {summary.aspiration && <Pill tone="sky">{summary.aspiration}</Pill>}
            </div>
          </div>
        </Card>

        <ProgressReportsCard childName={child?.name} />
      </div>

      {/* ── ACADEMIC PROGRESS ── */}
      <div className="pp-section-head pp-s360-section">
        <div className="pp-section-head-text">
          <h2>Academic Progress</h2>
          <p>Lectures watched and subject-wise scores</p>
        </div>
      </div>

      {/* ── Course progress + subject-wise, 1:2 ── */}
      <div className="pp-grid pp-grid-360-progress">
        <CourseProgressCard childName={child?.name} />

        <Card>
          <div className="pp-card-head">
            <h2>Subject Strength</h2>
            <Pill tone="ghost">last 5 tests</Pill>
          </div>
          {subjects.length === 0 && <p className="pp-empty">Subject strength appears after the first test.</p>}
          <ul className="pp-donuts">
            {subjects.map((s) => (
              <li key={s.name} className="pp-donut">
                <RingChart percent={s.percent} tone={toneFor(s.percent)} label={s.name} />
                <strong>{s.name}</strong>
                <Trend delta={s.delta} compact />
              </li>
            ))}
          </ul>
        </Card>

      </div>

      {/* ── EXAMS ── */}
      <div className="pp-section-head pp-s360-section">
        <div className="pp-section-head-text">
          <h2>Exams</h2>
          <p>Mock tests, unit tests and weekly quizzes</p>
        </div>
      </div>

      {/* ── Exam trend (+ strike rate / avg score) then quiz scores, 1:2 ── */}
      <div className="pp-grid pp-grid-360-quiz">
        <div className="pp-stack pp-exam-col">
        <Card className="pp-exam-card">
          <div className="pp-card-head">
            <div className="pp-card-head-text">
              <h2>Exam Progress</h2>
              <p>{first}'s marks vs class average, last {plural(examTrend.length, 'exam')}</p>
            </div>
          </div>
          {examTrend.length < 2 ? (
            <p className="pp-empty">The trend appears after {first} has written at least two exams.</p>
          ) : (
            <ExamTrendChart exams={examTrend} studentLabel={first} />
          )}
        </Card>

        <div className="pp-kpi-grid pp-exam-kpis">
          <KpiCard
            title="Strike Rate"
            icon={<Icon.Flash width={16} height={16} />}
            value={summary.strikeRateFrom > 0 ? `${num1(summary.strikeRate)}%` : 'NA'}
            sub={summary.strikeRateFrom > 0 ? <>from <b>{summary.strikeRateFrom}</b> attempted tests</> : 'no tests attempted'}
          />
          <KpiCard
            title="Avg Score"
            icon={<Icon.BarChart width={16} height={16} />}
            value={summary.averageScoreFrom > 0 ? <>{Math.round(summary.averageScore)} <small>/ {summary.averageScoreBase}</small></> : 'NA'}
            sub={summary.averageScoreFrom > 0 ? <>from <b>{summary.averageScoreFrom}</b> attempted tests</> : 'no tests attempted'}
          />
        </div>
        </div>

      <Card className="pp-quiz-card">
        <div className="pp-card-head">
          <div className="pp-card-head-text">
            <h2>Quiz scores</h2>
            <p>{first}'s scores from attempted weekly quizzes</p>
          </div>
          <Pill tone="ghost">{plural(quizzes.length, 'attempt')}</Pill>
        </div>
        {quizzes.length === 0 ? (
          <p className="pp-empty">No quizzes attempted yet. Weekly quiz scores appear here once {first} attempts one.</p>
        ) : (
          <div className="pp-table-wrap">
            <table className="pp-table pp-quizzes">
              <thead>
                <tr><th>Quiz</th><th>Date</th><th>Score</th><th>Accuracy</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {quizzes.map((q) => (
                  <tr key={q.attemptId}>
                    <td><strong>{q.title}</strong></td>
                    <td className="pp-td-muted pp-td-nowrap">{formatDate(q.dateOfExam)}</td>
                    <td className="is-num">{q.score}{q.max ? <span className="pp-td-muted pp-td-max"> / {q.max}</span> : null}</td>
                    <td><Pill tone={toneFor(Number(q.accuracy))} size="sm">{q.accuracy}%</Pill></td>
                    <td className="pp-td-actions">
                      <button type="button" className="pp-btn pp-btn-ghost pp-btn-sm" onClick={() => setStatsFor(q)}>
                        <Icon.BarChart width={14} height={14} /> Class stats
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      </div>

      {/* ── ATTENDANCE ── */}
      <div className="pp-section-head pp-s360-section">
        <div className="pp-section-head-text">
          <h2>Attendance</h2>
          <p>Classroom attendance marked by the centre</p>
        </div>
      </div>

      {!tracked ? (
        <Card className="pp-state">
          <span className="pp-state-icon"><Icon.Calendar /></span>
          <strong>Attendance is not tracked for {first} yet</strong>
          <p>Offline attendance appears here once the centre starts marking it for this batch.</p>
        </Card>
      ) : (
        <>
          {/* Last 3 months · calendar · attendance tiles, 1:1:1 */}
          <div className="pp-grid pp-grid-attendance">
            <Card className="pp-att-summary-card">
              <div className="pp-card-head">
                <h2>Last 3 months</h2>
                <Pill tone="ghost">{plural(Math.min(months.length, 3), 'month')}</Pill>
              </div>
              {/* months[] is newest first, so the first three are the latest. */}
              <ul className="pp-att-months">
                {months.slice(0, 3).map((m) => (
                  <li key={m.key} className={`pp-att-month ${m.key === month?.key ? 'is-active' : ''}`}>
                    <button type="button" className="pp-att-month-btn" onClick={() => setMonthKey(m.key)}>
                      <div className="pp-att-month-row">
                        <strong>{m.label}</strong>
                        <span className="pp-att-month-val">
                          {m.total > 0 ? <b>{m.percent}%</b> : <small>No classes</small>}
                        </span>
                      </div>
                      <div className="pp-bar" aria-hidden="true">
                        <div className={`pp-bar-fill is-${attTone(m.percent)}`} style={{ width: `${m.total ? Math.max(2, Math.min(100, m.percent)) : 0}%` }} />
                      </div>
                      <small className="pp-att-month-meta">{m.present} present · {m.absent} absent · {plural(m.total, 'class day')}</small>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="pp-att-total">
                <span>Academic year so far</span>
                <strong>{overallAtt.present} / {overallAtt.counted} <small>({overallAtt.percent}%)</small></strong>
              </div>
            </Card>

            <Card className="pp-att-card">
              <div className="pp-card-head">
                <h2>Class attendance</h2>
                <label className="pp-select-wrap">
                  <select value={monthKey} onChange={(e) => setMonthKey(e.target.value)} aria-label="Attendance month">
                    {months.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                  <Icon.ChevronDown width={16} height={16} />
                </label>
              </div>
              <AttendanceGrid month={month} />
              <div className="pp-att-legend">
                <span><i className="is-present" /> Present {month?.present ?? 0}</span>
                <span><i className="is-absent" /> Absent {month?.absent ?? 0}</span>
                {/* Uncircled days are either upcoming (current month) or holidays / off; name whichever applies. */}
                {month?.days?.some((d) => d.status === 'upcoming')
                  ? <span><i className="is-upcoming" /> Upcoming</span>
                  : <span><i className="is-off" /> Holiday / off</span>}
              </div>
            </Card>

            <div className="pp-kpi-grid pp-att-kpis">
              <Card>
                <div className="pp-kpi-head">
                  <h2>Last 30 days</h2>
                  <span className="pp-kpi-icon"><Icon.Calendar width={16} height={16} /></span>
                </div>
                <div className="pp-kpi-value">
                  <strong>{attendance.percent}%</strong>
                  <Pill tone={attTone(attendance.percent)}>{attLabel(attendance.percent)}</Pill>
                </div>
                <p className="pp-kpi-sub">
                  {attendance.percentDelta ? <><Trend delta={attendance.percentDelta} /> vs the previous 30 days</> : 'same as the previous 30 days'}
                </p>
              </Card>
              <Card>
                <div className="pp-kpi-head">
                  <h2>This month</h2>
                  <span className="pp-kpi-icon"><Icon.Check width={16} height={16} /></span>
                </div>
                <div className="pp-kpi-value"><strong>{months[0]?.present ?? 0} <small>/ {months[0]?.total ?? 0}</small></strong></div>
                <p className="pp-kpi-sub">classes attended in {months[0]?.label}</p>
              </Card>
              <Card>
                <div className="pp-kpi-head">
                  <h2>{sinceLabel ? `Since ${sinceLabel}` : 'Academic year'}</h2>
                  <span className="pp-kpi-icon"><Icon.BarChart width={16} height={16} /></span>
                </div>
                <div className="pp-kpi-value"><strong>{overallAtt.percent}%</strong></div>
                <p className="pp-kpi-sub"><b>{overallAtt.present}</b> present · <b>{overallAtt.absent}</b> absent of {overallAtt.counted} class days</p>
              </Card>
              <Card>
                <div className="pp-kpi-head">
                  <h2>Current streak</h2>
                  <span className="pp-kpi-icon"><Icon.Flash width={16} height={16} /></span>
                </div>
                <div className="pp-kpi-value"><strong>{streak} <small>day{streak === 1 ? '' : 's'}</small></strong></div>
                <p className="pp-kpi-sub">consecutive classes attended</p>
              </Card>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
