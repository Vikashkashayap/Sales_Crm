import React, { useMemo } from 'react';
import { STATUS_COLORS } from '../../utils/constants';

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 21V9" />
    </svg>
  );
}

function KanbanIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="6" height="18" rx="1" />
      <rect x="11" y="3" width="6" height="12" rx="1" />
      <rect x="19" y="3" width="2" height="8" rx="1" />
    </svg>
  );
}

export default function LeadsPageHeader({
  title,
  subtitle,
  total = 0,
  leads = [],
  view,
  onViewChange,
  actions,
}) {
  const statusCounts = useMemo(() => {
    const counts = {};
    leads.forEach((l) => {
      const s = l.status === 'Won' ? 'Converted' : (l.status || 'New');
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  return (
    <div className="leads-page-header">
      <div className="leads-hero">
        <div className="leads-hero-text">
          <h1 className="leads-hero-title">{title}</h1>
          {subtitle && <p className="leads-hero-subtitle">{subtitle}</p>}
        </div>
        <div className="leads-hero-actions">
          <div className="view-toggle view-toggle--modern">
            <button
              type="button"
              className={view === 'table' ? 'active' : ''}
              onClick={() => onViewChange('table')}
            >
              <TableIcon /> Table
            </button>
            <button
              type="button"
              className={view === 'kanban' ? 'active' : ''}
              onClick={() => onViewChange('kanban')}
            >
              <KanbanIcon /> Kanban
            </button>
          </div>
          {actions}
        </div>
      </div>

      <div className="leads-stat-row">
        <div className="leads-stat-card leads-stat-card--primary">
          <span className="leads-stat-num">{total}</span>
          <span className="leads-stat-lbl">Total Leads</span>
        </div>
        {statusCounts.map(([status, count]) => (
          <div
            key={status}
            className="leads-stat-card"
            style={{ '--stat-color': STATUS_COLORS[status] || '#64748B' }}
          >
            <span className="leads-stat-num">{count}</span>
            <span className="leads-stat-lbl">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
