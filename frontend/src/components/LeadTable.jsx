import React, { useState, useEffect, useMemo } from 'react';
import StatusDropdown from './StatusDropdown';
import FollowUpDatePicker from './FollowUpDatePicker';
import NotesSection from './NotesSection';
import AssignDropdown from './AssignDropdown';
import api from '../api/axios';

export default function LeadTable({
  leads,
  onRefresh,
  isAdmin,
  salesUsers = [],
  onViewLead,
  onEditLead,
}) {
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState('');

  const leadIds = useMemo(() => leads.map((l) => l._id), [leads]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => leadIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [leadIds]);

  const allSelected = leads.length > 0 && selectedIds.size === leads.length;
  const someSelected = selectedIds.size > 0;

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(leadIds));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleUpdate = async (id, payload) => {
    setSaving(true);
    try {
      await api.put(`/leads/${id}`, payload);
      onRefresh?.();
      setEditingId(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin || !window.confirm('Delete this lead?')) return;
    try {
      await api.delete(`/leads/${id}`);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!isAdmin || count === 0) return;
    if (!window.confirm(`Delete ${count} selected lead(s)? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await api.post('/leads/bulk-delete', { ids: [...selectedIds] });
      clearSelection();
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (id, assignedTo) => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await api.put(`/leads/assign/${id}`, { assignedTo: assignedTo || null });
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Assign failed');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!isAdmin || selectedIds.size === 0) return;
    setSaving(true);
    try {
      await api.post('/leads/bulk-assign', {
        ids: [...selectedIds],
        assignedTo: bulkAssignTo || null,
      });
      clearSelection();
      setBulkAssignTo('');
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk assign failed');
    } finally {
      setSaving(false);
    }
  };

  if (!leads?.length) {
    return <p className="muted-text" style={{ padding: 24 }}>No leads found.</p>;
  }

  return (
    <div>
      {isAdmin && someSelected && (
        <div className="bulk-actions-bar">
          <span className="bulk-actions-count">{selectedIds.size} selected</span>
          <div className="bulk-actions-controls">
            <AssignDropdown
              users={salesUsers}
              value={bulkAssignTo}
              onChange={(v) => setBulkAssignTo(v || '')}
            />
            <button
              type="button"
              className="app-btn app-btn-primary app-btn-sm"
              disabled={saving}
              onClick={handleBulkAssign}
            >
              Assign selected
            </button>
            <button
              type="button"
              className="app-btn app-btn-danger app-btn-sm"
              disabled={saving}
              onClick={handleBulkDelete}
            >
              Delete selected
            </button>
            <button
              type="button"
              className="app-btn app-btn-ghost app-btn-sm"
              onClick={clearSelection}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="app-table-wrap app-table-compact">
        <table className="app-table">
          <thead>
            <tr>
              {isAdmin && (
                <th className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    aria-label="Select all leads"
                  />
                </th>
              )}
              <th>Full Name</th>
              <th>Phone</th>
              <th className="col-email">Email</th>
              <th>Platform</th>
              <th>Target Year</th>
              <th>Why Prepare</th>
              <th>Date of Birth</th>
              <th>Gender</th>
              <th>Source</th>
              <th>Priority</th>
              <th>Status</th>
              {isAdmin && <th>Assigned To</th>}
              <th>Follow-up</th>
              <th>Deal Value</th>
              <th>Loss Reason</th>
              <th>Notes</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead._id}
                className={selectedIds.has(lead._id) ? 'row-selected' : undefined}
              >
                {isAdmin && (
                  <td className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead._id)}
                      onChange={() => toggleOne(lead._id)}
                      aria-label={`Select ${lead.name}`}
                    />
                  </td>
                )}
                <td>
                  <button type="button" className="link-btn" onClick={() => onViewLead?.(lead._id)}>
                    {lead.name}
                  </button>
                </td>
                <td>{lead.mobile?.includes('@') ? '—' : lead.mobile}</td>
                <td className="col-email">
                  {lead.email ? (
                    <span className="table-email" title={lead.email}>{lead.email}</span>
                  ) : lead.mobile?.includes('@') ? (
                    <span className="table-email" title={lead.mobile}>{lead.mobile}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{lead.platform || '-'}</td>
                <td>{lead.targetYear || '-'}</td>
                <td className="col-truncate" title={lead.requirement || ''}>
                  {lead.requirement ? (lead.requirement.length > 40 ? `${lead.requirement.slice(0, 40)}…` : lead.requirement) : '-'}
                </td>
                <td>{lead.dateOfBirth || '-'}</td>
                <td>{lead.gender || '-'}</td>
                <td>{lead.source || '-'}</td>
                <td>
                  {lead.priority && (
                    <span className={`badge badge-priority-${(lead.priority || '').toLowerCase()}`}>
                      {lead.priority}
                    </span>
                  )}
                </td>
                <td>
                  <StatusDropdown
                    value={lead.status}
                    onChange={(status) => handleUpdate(lead._id, { ...lead, status })}
                    disabled={saving}
                  />
                </td>
                {isAdmin && (
                  <td>
                    <AssignDropdown
                      users={salesUsers}
                      value={lead.assignedTo?._id || lead.assignedTo}
                      onChange={(assignedTo) => handleAssign(lead._id, assignedTo)}
                    />
                  </td>
                )}
                <td>
                  <FollowUpDatePicker
                    value={lead.followupDate}
                    onChange={(followupDate) => handleUpdate(lead._id, { ...lead, followupDate })}
                    disabled={saving}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    placeholder="Value"
                    defaultValue={lead.dealValue ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value;
                      handleUpdate(lead._id, { ...lead, dealValue: v === '' ? null : Number(v) });
                    }}
                    className="app-input"
                    style={{ width: 90 }}
                  />
                </td>
                <td>
                  {editingId === lead._id ? (
                    <input
                      type="text"
                      defaultValue={lead.lossReason}
                      onBlur={(e) => handleUpdate(lead._id, { ...lead, lossReason: e.target.value })}
                      className="app-input"
                      style={{ width: 120 }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingId(lead._id)}
                      style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)' }}
                    >
                      {lead.lossReason || 'Set reason'}
                    </span>
                  )}
                </td>
                <td style={{ minWidth: 180 }}>
                  <NotesSection
                    notes={lead.notes}
                    onAddNote={(notes) => handleUpdate(lead._id, { ...lead, notes })}
                    disabled={saving}
                  />
                </td>
                {isAdmin && (
                  <td className="actions-cell">
                    {onEditLead && (
                      <button type="button" onClick={() => onEditLead(lead)} className="app-btn app-btn-ghost app-btn-sm">
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(lead._id)}
                      className="app-btn app-btn-danger app-btn-sm"
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
