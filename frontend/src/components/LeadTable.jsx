import React, { useState, useEffect, useMemo } from 'react';
import StatusDropdown from './StatusDropdown';
import FollowUpDatePicker from './FollowUpDatePicker';
import NotesSection from './NotesSection';
import AssignDropdown from './AssignDropdown';
import api from '../api/axios';
import { CONVERTED_STATUSES } from '../utils/studentConstants';

const isConvertedLead = (status) => CONVERTED_STATUSES.includes(status);

export default function LeadTable({
  leads,
  onRefresh,
  isAdmin,
  salesUsers = [],
  onViewLead,
  onEditLead,
  onStatusChange,
  registeredLeadIds = new Set(),
  onRegisterStudent,
}) {
  const [saving, setSaving] = useState(false);
  const [leadPatches, setLeadPatches] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAssignTo, setBulkAssignTo] = useState('');

  const leadIds = useMemo(() => leads.map((l) => l._id), [leads]);

  const showOptionalCols = useMemo(() => {
    const has = (fn) => leads.some(fn);
    return {
      platform: has((l) => l.platform),
      targetYear: has((l) => l.targetYear),
      requirement: has((l) => l.requirement),
      dateOfBirth: has((l) => l.dateOfBirth),
      gender: has((l) => l.gender),
    };
  }, [leads]);

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

  useEffect(() => {
    setLeadPatches({});
  }, [leadIds.join(',')]);

  const getPatchedLead = (lead) => ({
    ...lead,
    ...(leadPatches[lead._id] || {}),
  });

  const handleInlineUpdate = async (id, payload, lead) => {
    const prevStatus = leadPatches[id]?.status ?? lead.status;
    const prevPatch = leadPatches[id] || {};

    setLeadPatches((prev) => ({ ...prev, [id]: { ...prev[id], ...payload } }));

    try {
      await api.put(`/leads/${id}`, payload);

      if (
        payload.status &&
        payload.status !== prevStatus &&
        CONVERTED_STATUSES.includes(payload.status)
      ) {
        onStatusChange?.({ ...lead, ...prevPatch, ...payload }, payload.status);
      }
    } catch (err) {
      setLeadPatches((prev) => {
        const next = { ...prev };
        const reverted = { ...(prev[id] || {}) };
        Object.keys(payload).forEach((key) => {
          if (key in prevPatch) reverted[key] = prevPatch[key];
          else delete reverted[key];
        });
        if (Object.keys(reverted).length) next[id] = reverted;
        else delete next[id];
        return next;
      });
      alert(err.response?.data?.message || 'Update failed');
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
              <th className="col-contact">Contact</th>
              {showOptionalCols.platform && <th>Platform</th>}
              {showOptionalCols.targetYear && <th>Target Year</th>}
              {showOptionalCols.requirement && <th>Why Prepare</th>}
              {showOptionalCols.dateOfBirth && <th>DOB</th>}
              {showOptionalCols.gender && <th>Gender</th>}
              <th>Status</th>
              {isAdmin && <th>Assigned To</th>}
              <th className="col-notes">Notes</th>
              <th>Follow-up</th>
              <th>Fee</th>
              <th>Admission</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const row = getPatchedLead(lead);
              return (
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
                <td className="col-contact">
                  <div className="contact-cell">
                    {lead.mobile && !lead.mobile.includes('@') && (
                      <span className="contact-phone">{lead.mobile}</span>
                    )}
                    {(lead.email || lead.mobile?.includes('@')) && (
                      <span className="table-email" title={lead.email || lead.mobile}>
                        {lead.email || lead.mobile}
                      </span>
                    )}
                    {!lead.mobile && !lead.email && <span className="muted-text">—</span>}
                  </div>
                </td>
                {showOptionalCols.platform && <td>{lead.platform || '—'}</td>}
                {showOptionalCols.targetYear && <td>{lead.targetYear || '—'}</td>}
                {showOptionalCols.requirement && (
                  <td className="col-truncate" title={lead.requirement || ''}>
                    {lead.requirement
                      ? lead.requirement.length > 40
                        ? `${lead.requirement.slice(0, 40)}…`
                        : lead.requirement
                      : '—'}
                  </td>
                )}
                {showOptionalCols.dateOfBirth && <td>{lead.dateOfBirth || '—'}</td>}
                {showOptionalCols.gender && <td>{lead.gender || '—'}</td>}
                <td>
                  <StatusDropdown
                    value={row.status}
                    onChange={(status) => handleInlineUpdate(lead._id, { status }, lead)}
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
                <td className="col-notes">
                  <NotesSection
                    compact
                    notes={row.notes}
                    onAddNote={(notes) => handleInlineUpdate(lead._id, { notes }, lead)}
                  />
                </td>
                <td>
                  <FollowUpDatePicker
                    value={row.followupDate}
                    onChange={(followupDate) => handleInlineUpdate(lead._id, { followupDate }, lead)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    placeholder="Fee"
                    key={`fee-${lead._id}-${row.dealValue ?? ''}`}
                    defaultValue={row.dealValue ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value;
                      handleInlineUpdate(lead._id, { dealValue: v === '' ? null : Number(v) }, lead);
                    }}
                    className="app-input"
                    style={{ width: 90 }}
                  />
                </td>
                <td>
                  {registeredLeadIds.has(String(lead._id)) ? (
                    <span className="badge badge-student-active">Registered</span>
                  ) : isConvertedLead(row.status) ? (
                    <button
                      type="button"
                      className="app-btn app-btn-primary app-btn-sm"
                      onClick={() => onRegisterStudent?.({ ...lead, ...row })}
                    >
                      Register
                    </button>
                  ) : (
                    <span className="muted-text">—</span>
                  )}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
