import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

export default function AdminFollowUpsPage() {
  const toast = useToast();
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const markComplete = async (id) => {
    try {
      await api.put(`/followups/${id}`, { status: 'completed' });
      toast.success('Follow-up completed');
      fetchData();
    } catch {
      toast.error('Update failed');
    }
  };

  return (
    <div className="app-card">
      <h2 className="section-heading">Follow-ups & Calendar</h2>
      {loading ? (
        <div className="skeleton-loader">Loading...</div>
      ) : followups.length === 0 ? (
        <p className="muted-text empty-state">No follow-ups scheduled</p>
      ) : (
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Assigned To</th>
                <th>Scheduled</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {followups.map((f) => (
                <tr key={f._id}>
                  <td>{f.lead?.name} ({f.lead?.mobile})</td>
                  <td>{f.user?.name}</td>
                  <td>{new Date(f.scheduledAt).toLocaleString()}</td>
                  <td>{f.type}</td>
                  <td><span className={`badge badge-${f.status}`}>{f.status}</span></td>
                  <td>
                    {f.status === 'pending' && (
                      <button type="button" className="app-btn app-btn-primary app-btn-sm" onClick={() => markComplete(f._id)}>
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
  );
}
