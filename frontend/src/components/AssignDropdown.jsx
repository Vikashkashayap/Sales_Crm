import React from 'react';

export default function AssignDropdown({ users, value, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="app-select"
      style={{ minWidth: 100, width: '100%', maxWidth: 120 }}
    >
      <option value="">Unassigned</option>
      {(users || []).map((u) => (
        <option key={u._id} value={u._id}>{u.name}</option>
      ))}
    </select>
  );
}
