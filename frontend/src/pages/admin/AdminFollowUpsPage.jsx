import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import LeadDetailDrawer from '../../components/leads/LeadDetailDrawer';
import { statusBadgeClass } from '../../utils/constants';

const NOTE_SEP = ' • ';

function parseLeadNote(note) {
  const idx = note.indexOf(NOTE_SEP);
  if (idx > 0 && /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(note.slice(0, idx))) {
    return { timestamp: note.slice(0, idx), text: note.slice(idx + NOTE_SEP.length) };
  }
  return { timestamp: null, text: note };
}

function getConversationText(f) {
  if (f.latestConversation) return f.latestConversation;
  if (f.notes) return f.notes;
  const notes = f.lead?.notes;
  if (Array.isArray(notes) && notes.length) {
    return parseLeadNote(notes[notes.length - 1]).text;
  }
  return '';
}

function ConversationCell({ followup }) {
  const text = getConversationText(followup);
  const allNotes = followup.lead?.notes || [];

  if (!text && !allNotes.length) return '—';

  return (
    <div className="followup-conversation">
      {text && <p className="followup-conversation-latest">{text}</p>}
      {allNotes.length > 1 && (
        <details className="followup-conversation-more">
          <summary>{allNotes.length} notes — view all</summary>
          <ul>
            {[...allNotes].reverse().map((n, i) => {
              const { timestamp, text: noteText } = parseLeadNote(n);
              return (
                <li key={i}>
                  {timestamp && <span className="note-ts">{timestamp}</span>}
                  {noteText}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

function groupByBda(followups) {
  const map = new Map();
  followups.forEach((f) => {
    const userId = f.user?._id;
    if (!userId) return;
    if (!map.has(userId)) {
      map.set(userId, {
        userId,
        name: f.user.name,
        email: f.user.email,
        followups: [],
        pending: 0,
        completed: 0,
        missed: 0,
        cancelled: 0,
      });
    }
    const entry = map.get(userId);
    entry.followups.push(f);
    if (f.status === 'pending') entry.pending += 1;
    else if (f.status === 'completed') entry.completed += 1;
    else if (f.status === 'missed') entry.missed += 1;
    else if (f.status === 'cancelled') entry.cancelled += 1;
  });
  return [...map.values()].sort((a, b) => b.followups.length - a.followups.length);
}

function BdaFollowUpDrawer({ bda, onClose, onMarkComplete, onViewLead }) {
  if (!bda) return null;

  const initials = bda.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content drawer-content-wide" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="bda-drawer-head">
            <span className="bda-avatar">{initials}</span>
            <div>
              <h2>{bda.name}</h2>
              <p className="muted-text">{bda.email}</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-body">
          <div className="bda-followup-stats">
            <div className="bda-followup-stat">
              <span className="bda-followup-stat-value">{bda.followups.length}</span>
              <span className="bda-followup-stat-label">Total</span>
            </div>
            <div className="bda-followup-stat">
              <span className="bda-followup-stat-value">{bda.pending}</span>
              <span className="bda-followup-stat-label">Pending</span>
            </div>
            <div className="bda-followup-stat">
              <span className="bda-followup-stat-value">{bda.completed}</span>
              <span className="bda-followup-stat-label">Completed</span>
            </div>
            <div className="bda-followup-stat">
              <span className="bda-followup-stat-value">{bda.missed}</span>
              <span className="bda-followup-stat-label">Missed</span>
            </div>
          </div>

          <h3 className="section-heading">All Follow-ups</h3>
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Lead Status</th>
                  <th>Scheduled</th>
                  <th>Type</th>
                  <th>Conversation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bda.followups.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => onViewLead(f.lead?._id)}
                      >
                        {f.lead?.name}
                      </button>
                      <br />
                      <span className="muted-text">{f.lead?.mobile}</span>
                    </td>
                    <td>
                      {f.lead?.status ? (
                        <span className={`badge ${statusBadgeClass(f.lead.status)}`}>
                          {f.lead.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{new Date(f.scheduledAt).toLocaleString()}</td>
                    <td>{f.type}</td>
                    <td><ConversationCell followup={f} /></td>
                    <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                    <td>
                      {f.status === 'pending' && (
                        <button
                          type="button"
                          className="app-btn app-btn-primary app-btn-sm"
                          onClick={() => onMarkComplete(f._id)}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminFollowUpsPage() {
  const toast = useToast();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBdaId, setSelectedBdaId] = useState(null);
  const [detailBda, setDetailBda] = useState(null);
  const [detailLeadId, setDetailLeadId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/followups');
      setFollowups(res.data);
    } catch {
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const bdaSummaries = useMemo(() => groupByBda(followups), [followups]);

  useEffect(() => {
    if (!detailBda) return;
    const updated = bdaSummaries.find((b) => b.userId === detailBda.userId);
    if (updated) setDetailBda(updated);
  }, [bdaSummaries]);

  const filteredFollowups = useMemo(() => {
    let list = followups;
    if (selectedBdaId) {
      list = list.filter((f) => f.user?._id === selectedBdaId);
    }
    if (statusFilter) {
      list = list.filter((f) => f.status === statusFilter);
    }
    return list;
  }, [followups, selectedBdaId, statusFilter]);

  const markComplete = async (id) => {
    try {
      await api.put(`/followups/${id}`, { status: 'completed' });
      toast.success('Follow-up completed');
      fetchData();
    } catch {
      toast.error('Update failed');
    }
  };

  const openBdaDetail = (bda) => {
    setDetailBda(bda);
    setSelectedBdaId(bda.userId);
  };

  const clearBdaFilter = () => {
    setSelectedBdaId(null);
    setDetailBda(null);
  };

  return (
    <div className="followups-admin-page">
      <div className="app-card">
        <h2 className="section-heading">Sales BDA Follow-ups</h2>
        <p className="muted-text followups-admin-sub">
          BDAs who moved leads to Follow-up status. Click a name to see conversation details and all follow-ups.
        </p>

        {loading ? (
          <div className="skeleton-loader">Loading...</div>
        ) : bdaSummaries.length === 0 ? (
          <p className="muted-text empty-state">No BDA follow-ups yet</p>
        ) : (
          <div className="bda-followup-grid">
            {bdaSummaries.map((bda) => {
              const initials = bda.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const isActive = selectedBdaId === bda.userId;

              return (
                <button
                  key={bda.userId}
                  type="button"
                  className={`bda-followup-card ${isActive ? 'bda-followup-card-active' : ''}`}
                  onClick={() => openBdaDetail(bda)}
                >
                  <div className="bda-followup-card-top">
                    <span className="bda-avatar">{initials}</span>
                    <div className="bda-followup-card-info">
                      <strong>{bda.name}</strong>
                      <span className="muted-text">{bda.email}</span>
                    </div>
                  </div>
                  <div className="bda-followup-card-counts">
                    <span><strong>{bda.followups.length}</strong> total</span>
                    <span className="bda-count-pending">{bda.pending} pending</span>
                    <span className="bda-count-done">{bda.completed} done</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="app-card">
        <div className="followups-table-header">
          <h2 className="section-heading">
            {selectedBdaId
              ? `Follow-ups — ${bdaSummaries.find((b) => b.userId === selectedBdaId)?.name || 'BDA'}`
              : 'All Follow-ups'}
          </h2>
          <div className="followups-table-filters">
            <select
              className="app-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {selectedBdaId && (
              <button type="button" className="app-btn app-btn-ghost app-btn-sm" onClick={clearBdaFilter}>
                Show all BDAs
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="skeleton-loader">Loading...</div>
        ) : filteredFollowups.length === 0 ? (
          <p className="muted-text empty-state">No follow-ups found</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Assigned To</th>
                  <th>Scheduled</th>
                  <th>Type</th>
                  <th>Conversation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => setDetailLeadId(f.lead?._id)}
                      >
                        {f.lead?.name}
                      </button>
                      <span className="muted-text"> ({f.lead?.mobile})</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => {
                          const bda = bdaSummaries.find((b) => b.userId === f.user?._id);
                          if (bda) openBdaDetail(bda);
                        }}
                      >
                        {f.user?.name}
                      </button>
                    </td>
                    <td>{new Date(f.scheduledAt).toLocaleString()}</td>
                    <td>{f.type}</td>
                    <td><ConversationCell followup={f} /></td>
                    <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                    <td>
                      {f.status === 'pending' && (
                        <button
                          type="button"
                          className="app-btn app-btn-primary app-btn-sm"
                          onClick={() => markComplete(f._id)}
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detailBda && (
        <BdaFollowUpDrawer
          bda={detailBda}
          onClose={() => setDetailBda(null)}
          onMarkComplete={markComplete}
          onViewLead={(id) => {
            setDetailBda(null);
            setDetailLeadId(id);
          }}
        />
      )}

      {detailLeadId && (
        <LeadDetailDrawer
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
