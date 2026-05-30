import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { statusBadgeClass } from '../../utils/constants';
import { useToast } from '../../context/ToastContext';

export default function LeadDetailDrawer({ leadId, onClose, onRefresh }) {
  const toast = useToast();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState([]);
  const [activities, setActivities] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteType, setNoteType] = useState('internal');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    Promise.all([
      api.get(`/leads/${leadId}`),
      api.get(`/notes/${leadId}`),
      api.get(`/leads/${leadId}/history`),
    ])
      .then(([leadRes, notesRes, actRes]) => {
        setLead(leadRes.data);
        setNotes(notesRes.data);
        setActivities(actRes.data);
      })
      .catch(() => toast.error('Could not load lead details'))
      .finally(() => setLoading(false));
  }, [leadId]);

  if (!leadId) return null;

  const addNote = async () => {
    if (!noteText.trim()) return;
    try {
      await api.post(`/notes/${leadId}`, { content: noteText, type: noteType });
      setNoteText('');
      const notesRes = await api.get(`/notes/${leadId}`);
      setNotes(notesRes.data);
      const actRes = await api.get(`/leads/${leadId}/history`);
      setActivities(actRes.data);
      onRefresh?.();
      toast.success('Note added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add note');
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h2>{loading ? 'Loading...' : lead?.name}</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        {lead && (
          <div className="drawer-body">
            <div className="drawer-meta">
              <span className={`badge ${statusBadgeClass(lead.status)}`}>{lead.status}</span>
              {lead.priority && <span className="badge">{lead.priority}</span>}
            </div>
            <div className="detail-grid">
              <div><label>Phone</label><p>{lead.mobile}</p></div>
              <div><label>Email</label><p>{lead.email || '—'}</p></div>
              <div><label>Platform</label><p>{lead.platform || '—'}</p></div>
              <div><label>Target Year</label><p>{lead.targetYear || '—'}</p></div>
              <div><label>Date of Birth</label><p>{lead.dateOfBirth || '—'}</p></div>
              <div><label>Gender</label><p>{lead.gender || '—'}</p></div>
              <div><label>Company</label><p>{lead.company || '—'}</p></div>
              <div><label>City</label><p>{lead.city || '—'}</p></div>
              <div><label>Source</label><p>{lead.source || '—'}</p></div>
              <div><label>Assigned</label><p>{lead.assignedTo?.name || 'Unassigned'}</p></div>
              <div><label>Follow-up</label><p>{lead.followupDate ? new Date(lead.followupDate).toLocaleString() : '—'}</p></div>
              <div><label>Deal Value</label><p>{lead.dealValue != null ? `₹${lead.dealValue}` : '—'}</p></div>
            </div>
            {lead.requirement && (
              <div className="detail-section">
                <label>Requirement</label>
                <p>{lead.requirement}</p>
              </div>
            )}

            <div className="detail-section">
              <h3>Notes & Feedback</h3>
              <div className="note-form">
                <select className="app-select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  <option value="internal">Internal</option>
                  <option value="call">Call</option>
                  <option value="meeting">Meeting</option>
                  <option value="feedback">Feedback</option>
                </select>
                <textarea className="app-input" rows={2} placeholder="Add a note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                <button type="button" className="app-btn app-btn-primary app-btn-sm" onClick={addNote}>Add Note</button>
              </div>
              <ul className="notes-list">
                {notes.map((n) => (
                  <li key={n._id}>
                    <span className="note-type-badge">{n.type}</span>
                    <p>{n.content}</p>
                    <small>{n.user?.name} · {new Date(n.createdAt).toLocaleString()}</small>
                  </li>
                ))}
                {notes.length === 0 && <p className="muted-text">No notes yet</p>}
              </ul>
            </div>

            <div className="detail-section">
              <h3>Activity Timeline</h3>
              <ul className="activity-timeline">
                {activities.map((a) => (
                  <li key={a._id}>
                    <div className="activity-dot" />
                    <div>
                      <p>{a.description}</p>
                      <small>{a.user?.name} · {new Date(a.createdAt).toLocaleString()}</small>
                    </div>
                  </li>
                ))}
                {activities.length === 0 && <p className="muted-text">No activity yet</p>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
