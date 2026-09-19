import React, { useEffect } from 'react';
import { Icon } from './Icons';

// Completion ring state: ≥ 90 done (green), 1–89 in progress (amber slice), 0 untouched (grey).
const ringState = (p) => (p >= 90 ? 'is-done' : p > 0 ? 'is-partial' : 'is-none');

/**
 * Chapter-by-chapter progress for one subject of the course progress card.
 * Each chapter row carries a completion ring and its watched percentage.
 * subject: { name, percent, modulesDone, modulesTotal, watchHours, chapters: [{ id, name, percent }] }
 */
export default function SubjectProgressDialog({ subject, childName, onClose }) {
  useEffect(() => {
    if (!subject) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [subject, onClose]);

  if (!subject) return null;

  const first = childName ? childName.split(' ')[0] : 'Student';
  const chapters = subject.chapters || [];

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="pp-modal pp-chapters-modal" role="dialog" aria-modal="true" aria-labelledby="pp-chapters-title">
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-chapters-title">{subject.name}</h2>
            <p>{first}'s progress · {chapters.length} chapter{chapters.length === 1 ? '' : 's'}</p>
          </div>
          <button type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close"><Icon.X width={18} height={18} /></button>
        </div>

        <div className="pp-chapters-summary">
          <b>{subject.percent}%</b>
          <div className="pp-bar" aria-hidden="true">
            <div className="pp-bar-fill is-dark" style={{ width: `${Math.max(2, Math.min(100, subject.percent))}%` }} />
          </div>
          <small>{subject.modulesDone} / {subject.modulesTotal} modules · {subject.watchHours}h watched</small>
        </div>

        <ul className="pp-chapters">
          {chapters.map((c, i) => (
            <li key={c.id} className="pp-chapter">
              <div className="pp-chapter-row">
                <span className={`pp-ring ${ringState(c.percent)}`} style={{ '--p': c.percent }} aria-hidden="true" />
                <strong><span>Chapter {i + 1}:</span>{c.name}</strong>
                <small>{c.percent > 0 ? `${c.percent}% completed` : 'Not started'}</small>
              </div>
            </li>
          ))}
        </ul>

        <div className="pp-legend pp-chapters-legend">
          <span><i className="pp-ring is-done" />Completed</span>
          <span><i className="pp-ring is-partial" style={{ '--p': 60 }} />In progress</span>
          <span><i className="pp-ring is-none" />Not started</span>
        </div>
      </div>
    </div>
  );
}
