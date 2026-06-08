import React from 'react';

const iconProps = { width: 18, height: 18 };

const ICONS = {
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...iconProps}>
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  ),
  won: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...iconProps}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lost: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...iconProps}>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  ),
  followup: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" />
    </svg>
  ),
  revenue: (
    <span style={{ fontSize: 16, fontWeight: 700 }}>₹</span>
  ),
  email: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...iconProps}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  materials: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...iconProps}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinejoin="round" />
      <path d="M14 2v6h6M10 13h4M10 17h4" strokeLinecap="round" />
    </svg>
  ),
};

export default function StatCard({ title, value, icon = 'leads' }) {
  const cardClass = ['stat-card'];
  if (icon === 'won') cardClass.push('stat-card-won');
  else if (icon === 'lost') cardClass.push('stat-card-lost');
  else if (icon === 'followup') cardClass.push('stat-card-followup');
  else if (icon === 'revenue') cardClass.push('stat-card-revenue');
  else if (icon === 'email') cardClass.push('stat-card-email');
  else if (icon === 'materials') cardClass.push('stat-card-materials');
  else if (icon === 'leads') cardClass.push('stat-card-leads');

  return (
    <div className={cardClass.join(' ')}>
      <div className="stat-card-content">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-title">{title}</span>
      </div>
      <span className="stat-card-icon" aria-hidden>
        {ICONS[icon] || ICONS.leads}
      </span>
    </div>
  );
}
