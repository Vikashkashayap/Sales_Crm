import React, { useState, useEffect, useMemo } from 'react';
import StatusDropdown from './StatusDropdown';
import FollowUpDatePicker from './FollowUpDatePicker';
import NotesSection from './NotesSection';
import AssignDropdown from './AssignDropdown';
import api from '../api/axios';
import { CONVERTED_STATUSES } from '../utils/studentConstants';
import { getStatusColor } from '../utils/constants';

const isConvertedLead = (status) => CONVERTED_STATUSES.includes(status);

export default function LeadTable({
  leads,
  onRefresh,
  onLeadPatched,
  onLeadsRemoved,
  isAdmin,
  canTransferLeads = false,
  currentUserId,
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
  const showSelection = isAdmin || canTransferLeads;
  const showAssignColumn = isAdmin || canTransferLeads;
  const assignUsers = useMemo(() => {
    if (isAdmin || !canTransferLeads || !currentUserId) return salesUsers;
    return salesUsers.filter((u) => String(u._id) !== String(currentUserId));
  }, [salesUsers, isAdmin, canTransferLeads, currentUserId]);

  const showPlatformCol = useMemo(() => leads.some((l) => l.platform), [leads]);

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
    onLeadPatched?.(id, payload);

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
          else if (key in lead) reverted[key] = lead[key];
          else delete reverted[key];
        });
        if (Object.keys(reverted).length) next[id] = reverted;
        else delete next[id];
        return next;
      });
      const rollback = {};
      Object.keys(payload).forEach((key) => {
        rollback[key] = key in prevPatch ? prevPatch[key] : lead[key];
      });
      onLeadPatched?.(id, rollback);
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
      onLeadsRemoved?.([id]);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!isAdmin || count === 0) return;
    if (!window.confirm(`Delete ${count} selected lead(s)? This cannot be undone.`)) return;
    setSaving(true);
    const ids = [...selectedIds];
    try {
      await api.post('/leads/bulk-delete', { ids });
      clearSelection();
      onLeadsRemoved?.(ids);
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (id, assignedTo) => {
    if (!isAdmin && !canTransferLeads) return;
    if (canTransferLeads && !isAdmin && !assignedTo) return;
    const lead = leads.find((l) => String(l._id) === String(id));
    const prevAssigned = lead?.assignedTo;
    const nextAssigned = assignedTo
      ? salesUsers.find((u) => String(u._id) === String(assignedTo)) || assignedTo
      : null;

    onLeadPatched?.(id, { assignedTo: nextAssigned });

    try {
      await api.put(`/leads/assign/${id}`, { assignedTo: assignedTo || null });
      if (
        canTransferLeads &&
        !isAdmin &&
        assignedTo &&
        String(assignedTo) !== String(currentUserId)
      ) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        onLeadsRemoved?.([id]);
      }
    } catch (err) {
      onLeadPatched?.(id, { assignedTo: prevAssigned });
      alert(err.response?.data?.message || 'Transfer failed');
    }
  };

  const handleBulkAssign = async () => {
    if ((!isAdmin && !canTransferLeads) || selectedIds.size === 0) return;
    if (canTransferLeads && !isAdmin && !bulkAssignTo) {
      alert('Select a BDA to transfer leads to');
      return;
    }
    setSaving(true);
    const ids = [...selectedIds];
    const nextAssigned = bulkAssignTo
      ? salesUsers.find((u) => String(u._id) === String(bulkAssignTo)) || bulkAssignTo
      : null;
    try {
      await api.post('/leads/bulk-assign', {
        ids,
        assignedTo: bulkAssignTo || null,
      });
      ids.forEach((id) => onLeadPatched?.(id, { assignedTo: nextAssigned }));
      if (canTransferLeads && !isAdmin && bulkAssignTo) {
        onLeadsRemoved?.(ids);
      }
      clearSelection();
      setBulkAssignTo('');
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk transfer failed');
    } finally {
      setSaving(false);
    }
  };

  if (!leads?.length) {
    return (
      <div className="empty-state empty-state--leads">
        <div className="empty-state-icon" aria-hidden>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
          </svg>
        </div>
        <h3>No leads found</h3>
        <p className="muted-text">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div>
      {showSelection && someSelected && (
        <div className="bulk-actions-bar bulk-actions-bar-sticky" role="region" aria-label="Bulk lead actions">
          <span className="bulk-actions-count">{selectedIds.size} lead(s) selected</span>
          <div className="bulk-actions-controls">
            <AssignDropdown
              users={assignUsers}
              value={bulkAssignTo}
              onChange={(v) => setBulkAssignTo(v || '')}
              allowUnassigned={isAdmin}
              placeholder={canTransferLeads && !isAdmin ? 'Transfer to…' : 'Unassigned'}
            />
            <button
              type="button"
              className="app-btn app-btn-primary app-btn-sm"
              disabled={saving}
              onClick={handleBulkAssign}
            >
              {canTransferLeads && !isAdmin ? 'Transfer selected' : 'Assign selected'}
            </button>
            {isAdmin && (
              <button
                type="button"
                className="app-btn app-btn-danger app-btn-sm"
                disabled={saving}
                onClick={handleBulkDelete}
              >
                Delete selected
              </button>
            )}
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
              {showSelection && (
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
              <th>Email</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>Target Year</th>
              <th className="col-requirement">Requirement</th>
              {showPlatformCol && <th>Platform</th>}
              <th>Status</th>
              {showAssignColumn && <th>{canTransferLeads && !isAdmin ? 'Transfer To' : 'Assigned To'}</th>}
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
              const rowStatus = row.status === 'Won' ? 'Converted' : (row.status || 'New');
              return (
              <tr
                key={lead._id}
                className={`lead-row${selectedIds.has(lead._id) ? ' row-selected' : ''}`}
                style={{ '--row-accent': getStatusColor(rowStatus) }}
              >
                {showSelection && (
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
                <td>
                  {lead.mobile && !lead.mobile.includes('@') ? (
                    <span className="contact-phone">{lead.mobile}</span>
                  ) : (
                    <span className="muted-text">—</span>
                  )}
                </td>
                <td>
                  {(lead.email || lead.mobile?.includes('@')) ? (
                    <span className="table-email" title={lead.email || lead.mobile}>
                      {lead.email || lead.mobile}
                    </span>
                  ) : (
                    <span className="muted-text">—</span>
                  )}
                </td>
                <td>{lead.gender || '—'}</td>
                <td>{lead.dateOfBirth || '—'}</td>
                <td>{lead.targetYear || '—'}</td>
                <td className="col-requirement col-truncate" title={lead.requirement || ''}>
                  {lead.requirement
                    ? lead.requirement.length > 50
                      ? `${lead.requirement.slice(0, 50)}…`
                      : lead.requirement
                    : '—'}
                </td>
                {showPlatformCol && <td>{lead.platform || '—'}</td>}
                <td>
                  <StatusDropdown
                    value={row.status === 'Won' ? 'Converted' : row.status}
                    onChange={(status) => handleInlineUpdate(lead._id, { status }, lead)}
                  />
                </td>
                {showAssignColumn && (
                  <td className="col-assign">
                    {canTransferLeads && !isAdmin ? (
                      <AssignDropdown
                        users={assignUsers}
                        value=""
                        onChange={(assignedTo) => handleAssign(lead._id, assignedTo)}
                        allowUnassigned={false}
                        placeholder="Transfer to…"
                      />
                    ) : (
                      <AssignDropdown
                        users={assignUsers}
                        value={lead.assignedTo?._id || lead.assignedTo}
                        onChange={(assignedTo) => handleAssign(lead._id, assignedTo)}
                        allowUnassigned={isAdmin}
                        placeholder="Unassigned"
                      />
                    )}
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
                    key={`fee-${lead._id}`}
                    defaultValue={row.dealValue ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value;
                      const newVal = v === '' ? null : Number(v);
                      const current = row.dealValue ?? null;
                      if (newVal === current) return;
                      if (newVal === null && (current === null || current === '' || current === undefined)) return;
                      handleInlineUpdate(lead._id, { dealValue: newVal }, lead);
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
