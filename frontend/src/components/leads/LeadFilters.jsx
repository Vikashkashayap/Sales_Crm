import React from 'react';
import { LEAD_PRIORITIES } from '../../utils/constants';
import StatusDropdown from '../StatusDropdown';

const PRIORITY_CLASS = {
  Low: 'filter-priority--low',
  Medium: 'filter-priority--medium',
  High: 'filter-priority--high',
  Urgent: 'filter-priority--urgent',
};

export default function LeadFilters({ filters, onChange, salesUsers = [], isAdmin }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="lead-filters-panel">
      <div className="lead-filters-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3-3" strokeLinecap="round" />
        </svg>
        <span>Search &amp; Filter</span>
      </div>
      <div className="lead-filters">
        <label className="filter-field filter-field--search">
          <span className="filter-label">Search</span>
          <input
            type="search"
            placeholder="Name, mobile, email..."
            className="app-input"
            value={filters.search || ''}
            onChange={(e) => set('search', e.target.value)}
          />
        </label>
        <label className="filter-field">
          <span className="filter-label">Status</span>
          <StatusDropdown
            value={filters.status || ''}
            onChange={(status) => set('status', status)}
            includeEmpty
            emptyLabel="All statuses"
            style={{ maxWidth: '100%' }}
          />
        </label>
        <label className="filter-field">
          <span className="filter-label">Priority</span>
          <select
            className={`app-select ${filters.priority ? PRIORITY_CLASS[filters.priority] || '' : ''}`}
            value={filters.priority || ''}
            onChange={(e) => set('priority', e.target.value)}
          >
            <option value="">All priorities</option>
            {LEAD_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        {isAdmin && (
          <label className="filter-field">
            <span className="filter-label">Assignee</span>
            <select
              className="app-select"
              value={filters.assignedTo || ''}
              onChange={(e) => set('assignedTo', e.target.value)}
            >
              <option value="">All assignees</option>
              {salesUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
};
