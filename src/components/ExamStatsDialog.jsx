import React, { useEffect, useState } from 'react';
import { Icon } from './Icons';
import { getQuizStats } from '../lib/parentApi';
import { formatDate } from '../lib/format';

// Marks can carry decimals (94.8); show one decimal at most, whole numbers as they are.
const marks = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '–';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
};
const num = (value) => (value !== null && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null);
const ceilNum = (value) => { const n = num(value); return n == null ? null : Math.ceil(n); };
const pctOf = (value, max) => (max > 0 ? Math.max(2, Math.min(100, Math.round((value / max) * 100))) : 0);

/**
 * Class statistics for one quiz, ported from the candidate portal:
 * { maxScore, myScore, myRank, classStrength, topScore, classAverage,
 *   subjects: [{ name, myScore, classAverage, topScore, maxScore }] }
 * `report` is a row of student-360 `quizzes[]`; `childId` scopes the call.
 */
export default function ExamStatsDialog({ report, childId, childName, onClose }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!report) return undefined;
    let alive = true;
    setStats(null); setError('');
    getQuizStats(childId, report)
      .then((data) => { if (alive) setStats(data && typeof data === 'object' ? data : {}); })
      .catch((e) => { if (alive) setError(e?.message || 'Could not load the class statistics.'); });
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { alive = false; document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [report, childId, onClose]);

  if (!report) return null;

  const first = childName ? childName.split(' ')[0] : 'Student';
  const maxScore = num(stats?.maxScore) || num(report.max) || 0;
  const topScore = num(stats?.topScore);
  const classAverage = ceilNum(stats?.classAverage);
  const myRank = num(stats?.myRank);
  const classStrength = num(stats?.classStrength);
  const myScore = num(stats?.myScore) ?? num(report.score);

  const subjects = Array.isArray(stats?.subjects)
    ? stats.subjects.filter((s) => s && (num(s.myScore) != null || num(s.classAverage) != null))
    : [];

  let myScoreNote = 'in this quiz';
  if (myScore != null && classAverage != null) {
    const gap = Math.round(Math.abs(myScore - classAverage));
    myScoreNote = gap === 0 ? 'same as class avg' : `${gap} ${myScore > classAverage ? 'above' : 'below'} class avg`;
  }

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="pp-modal pp-stats-modal" role="dialog" aria-modal="true" aria-labelledby="pp-stats-title">
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-stats-title">Class stats</h2>
            <p>{report.title}{report.dateOfExam ? ` · ${formatDate(report.dateOfExam)}` : ''}</p>
          </div>
          <button type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close"><Icon.X width={18} height={18} /></button>
        </div>

        {error && <div className="pp-alert pp-alert-error" role="alert">{error}</div>}
        {!stats && !error && <div className="pp-skeleton" style={{ minHeight: 220 }} aria-busy="true" />}

        {stats && (
          <>
            <div className="pp-stats-tiles">
              {myScore != null && (
                <div className="pp-stat-tile is-dark">
                  <small>{first}'s score</small>
                  <strong>{marks(myScore)}<span> / {marks(maxScore)}</span></strong>
                  <em>{myScoreNote}</em>
                </div>
              )}
              <div className="pp-stat-tile is-warn">
                <small>Class average</small>
                <strong>{marks(classAverage)}<span> / {marks(maxScore)}</span></strong>
                <em>{classStrength != null ? `${classStrength} student${classStrength === 1 ? '' : 's'}` : 'total marks'}</em>
              </div>
              {myRank != null ? (
                <div className="pp-stat-tile">
                  <small>Rank</small>
                  <strong>{myRank}{classStrength != null && <span> / {classStrength}</span>}</strong>
                  <em>in this quiz</em>
                </div>
              ) : (
                <div className="pp-stat-tile">
                  <small>Attempted</small>
                  <strong>{classStrength ?? '–'}</strong>
                  <em>student{classStrength === 1 ? '' : 's'} took this quiz</em>
                </div>
              )}
              <div className="pp-stat-tile is-sky">
                <small>Topper's score</small>
                <strong>{marks(topScore)}<span> / {marks(maxScore)}</span></strong>
                <em>highest in class</em>
              </div>
            </div>

            {subjects.length > 0 && (
              <>
                <h3 className="pp-stats-sub">Subject-wise: {first} vs class average</h3>
                <ul className="pp-stats-subjects">
                  {subjects.map((s, i) => {
                    const name = s.name || `Subject ${i + 1}`;
                    const max = num(s.maxScore) || 0;
                    const me = num(s.myScore);
                    const avg = ceilNum(s.classAverage);
                    const top = num(s.topScore);
                    return (
                      <li key={`${name}-${i}`}>
                        <div className="pp-stats-row">
                          <strong>{name}</strong>
                          <small>out of {marks(max)}{top != null ? ` · top ${marks(top)}` : ''}</small>
                        </div>
                        <div className="pp-duo-bar">
                          {me != null && (
                            <div className="pp-duo-line is-me" aria-label={`${first}: ${marks(me)} out of ${marks(max)}`}>
                              <div className="pp-duo-track"><div className="pp-duo-fill is-me" style={{ width: `${pctOf(me, max)}%` }} /></div>
                              <b>{marks(me)}</b>
                            </div>
                          )}
                          {avg != null && (
                            <div className="pp-duo-line is-class" aria-label={`Class average: ${marks(avg)} out of ${marks(max)}`}>
                              <div className="pp-duo-track"><div className="pp-duo-fill is-class" style={{ width: `${pctOf(avg, max)}%` }} /></div>
                              <b>{marks(avg)}</b>
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="pp-legend">
                  <span><i className="is-me" />{first}</span>
                  <span><i className="is-class" />Class average</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
