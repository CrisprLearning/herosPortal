import React from 'react';
import { Icon } from './Icons';

// Shared page primitives: cards, pills, trend chips, KPI tiles, loading/error/empty states.

export function Card({ children, className = '', as: Tag = 'section', ...rest }) {
  return <Tag className={`pp-card ${className}`} {...rest}>{children}</Tag>;
}

export function Pill({ tone = 'ghost', size = '', children, className = '', ...rest }) {
  return (
    <span className={`pp-pill is-${tone} ${size === 'sm' ? 'pp-pill-sm' : ''} ${className}`} {...rest}>
      <span>{children}</span>
    </span>
  );
}

export function Trend({ delta, compact = false }) {
  if (delta === null || delta === undefined) return null;
  const up = delta >= 0;
  return (
    <span className={`pp-trend ${up ? 'is-up' : 'is-down'} ${compact ? 'is-compact' : ''}`}>
      {up ? <Icon.ArrowUpRight width={14} height={14} /> : <Icon.ArrowDownRight width={14} height={14} />}
      {Math.abs(delta)}%
    </span>
  );
}

export function PageState({ loading, error, empty, action }) {
  if (loading) {
    return (
      <div className="pp-page" aria-busy="true">
        <div className="pp-grid pp-grid-skeleton">
          <div className="pp-card pp-skeleton" />
          <div className="pp-card pp-skeleton" />
          <div className="pp-card pp-skeleton pp-skeleton-tall" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pp-page">
        <div className="pp-card pp-state">
          <strong>Couldn't load this page</strong>
          <p>{error}</p>
          <button type="button" className="pp-btn pp-btn-primary" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="pp-page">
        <div className="pp-card pp-state">
          <p>{empty}</p>
          {action}
        </div>
      </div>
    );
  }
  return null;
}

export function KpiCard({ title, icon, value, sub, ...rest }) {
  return (
    <Card {...rest}>
      <div className="pp-kpi-head">
        <h2>{title}</h2>
        {icon && <span className="pp-kpi-icon">{icon}</span>}
      </div>
      <div className="pp-kpi-value"><strong>{value}</strong></div>
      {sub && <p className="pp-kpi-sub">{sub}</p>}
    </Card>
  );
}
