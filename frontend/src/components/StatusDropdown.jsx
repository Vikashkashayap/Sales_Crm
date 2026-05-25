import React from 'react';
import { LEAD_STATUSES } from '../utils/constants';

export default function StatusDropdown({ value, onChange, disabled }) {
  return (
    <select
      value={value || 'New'}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="app-select"
      style={{ minWidth: 110, width: '100%', maxWidth: 130 }}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
