import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate } from '../lib/format';

const PAD = { top: 14, right: 40, bottom: 26, left: 34 };
const HEIGHT = 220;
const Y_TICKS = [0, 25, 50, 75, 100];

const pctOf = (v, max) => (max > 0 ? Math.max(0, Math.min(100, (Number(v) / max) * 100)) : null);

/**
 * Student marks vs class average across the last exams, as two lines on one
 * percentage axis (mocks and unit tests have different totals). Hover shows
 * a crosshair and a tooltip with the raw marks; a hidden table carries the
 * same data for screen readers.
 * exams: [{ id, name, date, score, max, classAverage }] oldest first.
 */
export default function ExamTrendChart({ exams, studentLabel = 'Student' }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(480);
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const points = useMemo(() => exams
    .filter((e) => Number(e.max) > 0)
    .map((e) => ({ ...e, pct: pctOf(e.score, e.max), avgPct: e.classAverage != null ? pctOf(e.classAverage, e.max) : null })), [exams]);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2);
  const y = (p) => PAD.top + innerH - (p / 100) * innerH;

  const path = (key) => points
    .map((p, i) => (p[key] == null ? null : `${i === 0 || points[i - 1][key] == null ? 'M' : 'L'}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`))
    .filter(Boolean).join(' ');

  // Every label at wide widths, every 2nd / 3rd on narrow cards, always the last.
  const step = innerW / Math.max(1, points.length - 1) >= 44 ? 1 : innerW / Math.max(1, points.length - 1) >= 26 ? 2 : 3;
  const showTick = (i) => i === points.length - 1 || (points.length - 1 - i) % step === 0;

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setHover(best);
  }

  const last = points[points.length - 1];
  const h = hover != null ? points[hover] : null;
  const tipLeft = h ? Math.min(Math.max(x(hover) - 75, 0), width - 160) : 0;

  return (
    <div className="pp-trend-chart" ref={wrapRef}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img" aria-label={`${studentLabel}'s marks and class average across the last ${points.length} exams`}>
        {Y_TICKS.map((t) => (
          <g key={t}>
            <line className="pp-trend-grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="pp-trend-axis" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">{t}%</text>
          </g>
        ))}
        {points.map((p, i) => showTick(i) && (
          <text key={p.id} className="pp-trend-axis" x={x(i)} y={HEIGHT - 8} textAnchor="middle">{formatDate(p.date, { year: undefined })}</text>
        ))}

        {h && <line className="pp-trend-cross" x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} />}

        <path className="pp-trend-line is-class" d={path('avgPct')} />
        <path className="pp-trend-line is-student" d={path('pct')} />

        {points.map((p, i) => (
          <g key={p.id}>
            {p.avgPct != null && <circle className="pp-trend-dot is-class" cx={x(i)} cy={y(p.avgPct)} r={hover === i ? 5 : 4} />}
            <circle className="pp-trend-dot is-student" cx={x(i)} cy={y(p.pct)} r={hover === i ? 5.5 : 4} />
          </g>
        ))}
        {last && (
          <text className="pp-trend-end" x={x(points.length - 1) + 9} y={y(last.pct) + 4}>{Math.round(last.pct)}%</text>
        )}

        <rect className="pp-trend-hit" x={PAD.left - 10} y={0} width={innerW + 20} height={HEIGHT} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchStart={onMove} onTouchMove={onMove} />
      </svg>

      {h && (
        <div className="pp-trend-tip" style={{ left: tipLeft, top: Math.max(0, y(Math.max(h.pct, h.avgPct ?? 0)) - 92) }}>
          <strong>{h.name}</strong>
          <small>{formatDate(h.date)}</small>
          <div><i className="is-student" />{studentLabel}<b>{h.score} / {h.max}</b></div>
          {h.classAverage != null && <div><i className="is-class" />Class avg<b>{Math.round(h.classAverage)} / {h.max}</b></div>}
        </div>
      )}

      <div className="pp-trend-legend" aria-hidden="true">
        <span><i className="is-student" />{studentLabel}</span>
        <span><i className="is-class" />Class average</span>
      </div>

      <table className="pp-sr-only">
        <caption>Exam marks, oldest first</caption>
        <thead><tr><th>Exam</th><th>Date</th><th>{studentLabel}</th><th>Class average</th></tr></thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}><td>{p.name}</td><td>{formatDate(p.date)}</td><td>{p.score} / {p.max}</td><td>{p.classAverage ?? '—'} / {p.max}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
