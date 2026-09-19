import React, { useEffect } from 'react';
import { Icon } from './Icons';
import { formatDate } from '../lib/format';

/**
 * Every progress report issued to the child, as a table with a download
 * per row. Opened from the "N reports" button on the Progress reports card.
 * reports: [{ id, title, url, issuedOn, fileType }] newest first.
 */
export default function ReportsDialog({ open, reports = [], childName, onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const first = childName ? childName.split(' ')[0] : 'Student';

  return (
    <div className="pp-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="pp-modal pp-reports-modal" role="dialog" aria-modal="true" aria-labelledby="pp-reports-title">
        <div className="pp-modal-head">
          <div>
            <h2 id="pp-reports-title">Progress reports</h2>
            <p>{first}'s report cards issued by the centre, newest first</p>
          </div>
          <button type="button" className="pp-icon-btn" onClick={onClose} aria-label="Close"><Icon.X width={18} height={18} /></button>
        </div>

        <div className="pp-table-wrap">
          <table className="pp-table pp-reports-table">
            <thead>
              <tr><th>#</th><th>Report</th><th>Issued on</th><th>Type</th><th aria-label="Download" /></tr>
            </thead>
            <tbody>
              {reports.map((r, i) => (
                <tr key={r.id}>
                  <td className="pp-td-muted">{i + 1}</td>
                  <td>
                    <strong>{r.title}</strong>
                    {i === 0 && <small className="pp-td-note">Latest</small>}
                  </td>
                  <td className="pp-td-muted pp-td-nowrap">{formatDate(r.issuedOn)}</td>
                  <td><span className="pp-file-tag">{(r.fileType || 'pdf').toUpperCase()}</span></td>
                  <td className="pp-td-actions">
                    <a className="pp-icon-btn is-call" href={r.url} download target="_blank" rel="noopener noreferrer" aria-label={`Download ${r.title}`} title="Download">
                      <Icon.Download width={16} height={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
