import React from 'react';

export default function FollowUpDatePicker({ value, onChange, disabled }) {
  const str = value ? new Date(value).toISOString().slice(0, 16) : '';
  return (
    <input
      type="datetime-local"
      value={str}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
      disabled={disabled}
      className="app-input"
      style={{ width: '100%', minWidth: 130, maxWidth: 155 }}
    />
  );
}
