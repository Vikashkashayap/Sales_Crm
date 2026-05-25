import React from 'react';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '../../utils/constants';

export default function LeadFilters({ filters, onChange, salesUsers = [], isAdmin }) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="lead-filters">
      <input
        type="search"
        placeholder="Search name, mobile, email..."
        className="app-input"
        value={filters.search || ''}
        onChange={(e) => set('search', e.target.value)}
        style={{ maxWidth: 280 }}
      />
      <select
        className="app-select"
        value={filters.status || ''}
        onChange={(e) => set('status', e.target.value)}
      >
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <select
        className="app-select"
        value={filters.priority || ''}
        onChange={(e) => set('priority', e.target.value)}
      >
        <option value="">All priorities</option>
        {LEAD_PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
      {isAdmin && (
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
      )}
    </div>
  );
};
