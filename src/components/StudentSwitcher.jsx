import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import { Icon } from './Icons';
import { useStudent } from './StudentProvider';

/**
 * Top-right student chip: photo + name + course. Opens a menu listing every
 * child mapped to the parent so they can switch profiles in one tap.
 */
export default function StudentSwitcher() {
  const { children, child, selectChild, loading } = useStudent() || {};
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (loading && !child) {
    return <div className="pp-switcher pp-switcher-skeleton" aria-busy="true" />;
  }
  if (!child) return null;

  const multiple = (children?.length || 0) > 1;

  return (
    <div className="pp-switcher-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`pp-switcher ${open ? 'is-open' : ''}`}
        onClick={() => multiple && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Viewing ${child.name}. ${multiple ? 'Switch student' : ''}`}
      >
        <Avatar src={child.photo} name={child.name} size={40} />
        <span className="pp-switcher-meta">
          <strong>{child.name}</strong>
          <small>{child.primaryCourse?.name}</small>
        </span>
        {multiple && <Icon.ChevronDown className="pp-switcher-caret" />}
      </button>

      {open && (
        <div className="pp-switcher-menu" role="listbox" aria-label="Select student">
          <div className="pp-switcher-menu-title">Your children</div>
          {children.map((k) => {
            const active = String(k.id) === String(child.id);
            return (
              <button
                key={k.id}
                type="button"
                role="option"
                aria-selected={active}
                className={`pp-switcher-item ${active ? 'is-active' : ''}`}
                onClick={() => { selectChild(k.id); setOpen(false); }}
              >
                <Avatar src={k.photo} name={k.name} size={44} radius="14px" />
                <span className="pp-switcher-meta">
                  <strong>{k.name}</strong>
                  <small>{k.primaryCourse?.name}</small>
                  <small className="pp-switcher-sub">{k.primaryCourse?.batch} · {k.candidateKey}</small>
                </span>
                {active && <span className="pp-switcher-check"><Icon.Check width={16} height={16} /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
