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
};

export default function StatCard({ title, value, icon = 'leads' }) {
  const cardClass = ['stat-card'];
  if (icon === 'won') cardClass.push('stat-card-won');
  else if (icon === 'lost') cardClass.push('stat-card-lost');
  else if (icon === 'followup') cardClass.push('stat-card-followup');
  else if (icon === 'revenue') cardClass.push('stat-card-revenue');

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
