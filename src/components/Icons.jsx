import React from 'react';

// Tiny inline icon set (stroke icons, currentColor) so the portal has no icon
// font dependency — keeps first paint fast on mobile data.
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
};

export const Icon = {
  Flash: (p) => (<svg {...base} {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>),
  BarChart: (p) => (<svg {...base} {...p}><path d="M4 20h16" /><rect x="6" y="10" width="3" height="7" rx="1" /><rect x="11" y="5" width="3" height="12" rx="1" /><rect x="16" y="13" width="3" height="4" rx="1" /></svg>),
  Star: (p) => (<svg {...base} {...p}><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" /></svg>),
  Grid: (p) => (
    <svg {...base} {...p}><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
  ),
  Book: (p) => (
    <svg {...base} {...p}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5V5.5" /><path d="M8 7h8M8 11h6" /></svg>
  ),
  Home: (p) => (
    <svg {...base} {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>
  ),
  Logout: (p) => (
    <svg {...base} {...p}><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></svg>
  ),
  ChevronDown: (p) => (
    <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
  ),
  Check: (p) => (
    <svg {...base} {...p}><path d="m5 12 5 5L20 7" /></svg>
  ),
  X: (p) => (
    <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
  ),
  ArrowUpRight: (p) => (
    <svg {...base} {...p}><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
  ),
  ArrowDownRight: (p) => (
    <svg {...base} {...p}><path d="M7 7l10 10" /><path d="M17 8v9H8" /></svg>
  ),
  Phone: (p) => (
    <svg {...base} {...p}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>
  ),
  Calendar: (p) => (
    <svg {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
  ),
  Clock: (p) => (
    <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  ),
  Pin: (p) => (
    <svg {...base} {...p}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
  ),
  Bed: (p) => (
    <svg {...base} {...p}><path d="M3 18V8" /><path d="M3 12h18v6" /><path d="M3 16h18" /><path d="M7 12V9h5v3" /></svg>
  ),
  Receipt: (p) => (
    <svg {...base} {...p}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><path d="M9 8h6M9 12h6" /></svg>
  ),
  User: (p) => (
    <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  Shield: (p) => (
    <svg {...base} {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  Contacts: (p) => (
    <svg {...base} {...p}><rect x="5" y="3" width="15" height="18" rx="3" /><path d="M3 8h2M3 12h2M3 16h2" /><circle cx="12.5" cy="10" r="2.3" /><path d="M8.5 17a4 4 0 0 1 8 0" /></svg>
  ),
  Mail: (p) => (
    <svg {...base} {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 8 9 6 9-6" /></svg>
  ),
  Chat: (p) => (
    <svg {...base} {...p}><path d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H9l-5 4z" /></svg>
  ),
  Download: (p) => (
    <svg {...base} {...p}><path d="M12 4v11" /><path d="m7 10 5 5 5-5" /><path d="M4 19h16" /></svg>
  ),
  FileText: (p) => (
    <svg {...base} {...p}><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /><path d="M9.5 13h5M9.5 17h5" /></svg>
  ),
  Menu: (p) => (
    <svg {...base} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  ),
};
