import React from 'react';
import { KANBAN_COLUMNS, statusBadgeClass, STATUS_COLORS } from '../../utils/constants';
import StatusDropdown from '../StatusDropdown';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { CONVERTED_STATUSES } from '../../utils/studentConstants';

export default function KanbanBoard({ leads, onRefresh, isAdmin, salesUsers, onStatusChange }) {
  const toast = useToast();

  const byStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col] = leads.filter((l) => {
      const s = l.status || 'New';
      if (col === 'Converted') return s === 'Converted' || s === 'Won';
      return s === col;
    });
    return acc;
  }, {});

  const handleStatus = async (lead, status) => {
    const prevStatus = lead.status;
    try {
      await api.put(`/leads/${lead._id}`, { status });
      onRefresh?.();
      if (
        status !== prevStatus &&
        CONVERTED_STATUSES.includes(status) &&
        lead
      ) {
        onStatusChange?.(lead, status);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  return (
    <div className="kanban-board">
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col}
          className="kanban-column"
          style={{ '--col-accent': STATUS_COLORS[col] || 'var(--primary)' }}
        >
          <div className="kanban-column-header">
            <span className={`badge ${statusBadgeClass(col)}`}>{col}</span>
            <span className="kanban-count">{byStatus[col]?.length || 0}</span>
          </div>
          <div className="kanban-cards">
            {(byStatus[col] || []).map((lead) => (
              <div key={lead._id} className="kanban-card">
                <strong>{lead.name}</strong>
                {lead.email && <p className="muted-text">{lead.email}</p>}
                {lead.mobile && !lead.mobile.includes('@') && (
                  <p className="muted-text">{lead.mobile}</p>
                )}
                {lead.company && <p className="muted-text">{lead.company}</p>}
                {lead.priority && (
                  <span className={`badge badge-priority-${(lead.priority || '').toLowerCase()}`}>{lead.priority}</span>
                )}
                <StatusDropdown
                  value={lead.status === 'Won' ? 'Converted' : lead.status}
                  onChange={(status) => handleStatus(lead, status)}
                />
                {isAdmin && lead.assignedTo && (
                  <p className="muted-text" style={{ marginTop: 6, fontSize: 12 }}>
                    {lead.assignedTo?.name || 'Assigned'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
