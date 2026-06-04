import React, { useCallback, useEffect, useState } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminEmailLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/email-logs', { params: { page, limit: 50, type: 'daily_material' } });
      setLogs(res.data?.logs || []);
      setPages(res.data?.pages || 1);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load email logs');
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="dashboard-page">
      <div className="app-card">
        <h2 className="section-heading">Email logs</h2>
        <p className="muted-text" style={{ marginBottom: '1rem' }}>
          Delivery history for daily study material emails ({total} total).
        </p>

        {loading ? (
          <p className="muted-text">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="muted-text">No logs yet.</p>
        ) : (
          <>
            <div className="app-table-wrap">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Email</th>
                    <th>Material</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Sent at</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{log.leadName || '—'}</td>
                      <td>{log.email}</td>
                      <td>{log.materialTitle || '—'}</td>
                      <td style={{ maxWidth: 220 }}>{log.subject}</td>
                      <td>
                        <span
                          className={`status-pill ${log.status === 'sent' ? 'status-pill-won' : 'status-pill-lost'}`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td>{formatDateTime(log.sentAt)}</td>
                      <td className="muted-text" style={{ fontSize: 12, maxWidth: 200 }}>
                        {log.errorMessage || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pages > 1 && (
              <div className="pagination-bar" style={{ marginTop: '1rem', display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="app-btn app-btn-secondary app-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="muted-text" style={{ alignSelf: 'center' }}>
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  className="app-btn app-btn-secondary app-btn-sm"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
