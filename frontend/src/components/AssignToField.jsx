import React from 'react';
import AssignDropdown from './AssignDropdown';

/** Shared "Assign to BDA" field for upload / manual lead forms (admin). */
export default function AssignToField({ salesUsers = [], value, onChange, label = 'Assign to BDA (optional)' }) {
  return (
    <div className="assign-to-field">
      <label className="assign-to-label">{label}</label>
      <AssignDropdown
        users={salesUsers}
        value={value}
        onChange={(v) => onChange(v || '')}
        allowUnassigned
        placeholder="Unassigned"
      />
      <p className="muted-text assign-to-hint">
        Imported leads will be assigned to this person. Leave unassigned to distribute later from Leads.
      </p>
    </div>
  );
}
