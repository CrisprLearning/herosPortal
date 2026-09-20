import React, { useEffect, useState } from 'react';
import { getContacts } from '../lib/parentApi';
import { useChildData } from '../components/StudentProvider';
import Avatar from '../components/Avatar';
import { Card, PageState, Pill } from '../components/ui';
import { Icon } from '../components/Icons';

// "96331 04657" style for display; links use the raw digits.
function prettyPhone(digits = '') {
  const d = String(digits).replace(/\D/g, '');
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return digits;
}

// Office hours are 8:00 am to 5:00 pm IST. Outside that window the contact
// book shows a banner steering parents to WhatsApp. Evaluated in IST whatever
// the parent's device timezone is.
const OFFICE_OPENS = 8;
const OFFICE_CLOSES = 17;
export function isOutsideOfficeHours(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false }).format(now));
  return hour >= OFFICE_CLOSES || hour < OFFICE_OPENS;
}

function AfterHoursBanner() {
  const [outside, setOutside] = useState(() => isOutsideOfficeHours());
  useEffect(() => {
    const t = setInterval(() => setOutside(isOutsideOfficeHours()), 60 * 1000);
    return () => clearInterval(t);
  }, []);
  if (!outside) return null;
  return (
    <div className="pp-hours-banner" role="status">
      <Icon.Clock width={18} height={18} />
      <p>Office hours are 9:00 am to 5:00 pm, Monday to Saturday. For any non-urgent matters outside these hours, communication via WhatsApp is preferred.</p>
    </div>
  );
}

// One line of the contact book: photo, name + role, then the ways to reach them.
function ContactRow({ c }) {
  const digits = c.phone ? String(c.phone).replace(/\D/g, '') : '';
  const tel = digits ? `tel:+91${digits}` : null;
  const wa = digits ? `https://wa.me/91${digits}` : null;
  const mail = c.email ? `mailto:${c.email}` : null;
  const reach = [tel && `+91 ${prettyPhone(digits)}`, c.email].filter(Boolean).join(' · ');

  return (
    <li className="pp-contact-row">
      <Avatar src={c.photo} name={c.name} size={44} radius="14px" />
      <div className="pp-contact-meta">
        <strong>{c.name}</strong>
        <small>{c.role}{c.note ? ` · ${c.note}` : ''}</small>
        {reach && <span>{reach}</span>}
      </div>
      <div className="pp-contact-actions">
        {tel && <a className="pp-icon-btn is-call" href={tel} aria-label={`Call ${c.name}`} title="Call"><Icon.Phone width={17} height={17} /></a>}
        {wa && <a className="pp-icon-btn is-wa" href={wa} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} title="WhatsApp"><Icon.WhatsApp width={17} height={17} /></a>}
        {mail && <a className="pp-icon-btn" href={mail} aria-label={`Email ${c.name}`} title="Email"><Icon.Mail width={17} height={17} /></a>}
      </div>
    </li>
  );
}

function ContactGroup({ title, badge, contacts }) {
  if (!contacts.length) return null;
  return (
    <Card className="pp-contact-group">
      <div className="pp-card-head">
        <h2>{title}</h2>
        {badge}
      </div>
      <ul className="pp-contact-list">
        {contacts.map((c) => <ContactRow key={c.id} c={c} />)}
      </ul>
    </Card>
  );
}

export default function ContactsPage() {
  const { data, loading, error, child } = useChildData(getContacts);

  if (loading || error) return <PageState loading={loading} error={error} />;

  const contacts = data || [];
  if (!contacts.length) return <PageState empty="No contacts are listed for this student yet." />;

  const primary = contacts.filter((c) => c.primary);
  const others = contacts.filter((c) => !c.primary);
  const first = child?.name ? child.name.split(' ')[0] : '';

  return (
    <div className="pp-page pp-contact-book">
      <AfterHoursBanner />
      <ContactGroup
        title={first ? `${first}'s class teacher` : 'Class teacher'}
        contacts={primary}
      />
      <ContactGroup
        title="Crispr Learning"
        badge={<Pill tone="ghost">{others.length} contacts</Pill>}
        contacts={others}
      />
    </div>
  );
}
