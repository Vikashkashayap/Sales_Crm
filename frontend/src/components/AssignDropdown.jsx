import React from 'react';

export default function AssignDropdown({
  users,
  value,
  onChange,
  allowUnassigned = true,
  placeholder = 'Unassigned',
}) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="app-select"
      style={{ minWidth: 100, width: '100%', maxWidth: 140 }}
    >
      {allowUnassigned && <option value="">{placeholder}</option>}
      {!allowUnassigned && !value && (
        <option value="" disabled>Select BDA…</option>
      )}
      {(users || []).map((u) => (
        <option key={u._id} value={u._id}>{u.name}</option>
      ))}
    </select>
  );
}
