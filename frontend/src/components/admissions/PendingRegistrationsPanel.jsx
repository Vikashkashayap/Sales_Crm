import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import RegistrationApprovalModal from './RegistrationApprovalModal';

const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

export default function PendingRegistrationsPanel({ onCountChange }) {
  const toast = useToast();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchPending = useCallback(async () => {
    try {
      const res = await api.get('/students/pending-approvals');
      const list = Array.isArray(res.data) ? res.data : [];
      setPending(list);
      onCountChange?.(list.length);
    } catch (err) {
      console.error(err);
      onCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleDelete = async (student) => {
    const label = student.fullName || 'this registration';
    if (
      !window.confirm(
        `Delete pending registration for "${label}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(student._id);
    try {
      await api.delete(`/students/${student._id}`);
      if (selected?._id === student._id) setSelected(null);
      toast.success('Pending registration deleted');
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete registration');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) return null;
  if (pending.length === 0) return null;

  return (
    <>
      <div className="app-card pending-approvals-card">
        <div className="pending-approvals-header">
          <div>
            <h2 className="section-heading" style={{ margin: 0 }}>Pending registrations</h2>
            <p className="muted-text" style={{ marginTop: 4 }}>
              Sales team submissions awaiting your approval. The student receives the welcome email after you approve.
            </p>
          </div>
          <span className="badge badge-pending-approval">{pending.length} pending</span>
        </div>

        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Program</th>
                <th>Fee</th>
                <th>Submitted by</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pending.map((s) => (
                <tr key={s._id}>
                  <td>
                    <strong>{s.fullName}</strong>
                    <div className="muted-text" style={{ fontSize: 12 }}>{s.phone}</div>
                  </td>
                  <td>{s.programName || '—'}</td>
                  <td>{fmtInr(s.finalFee)}</td>
                  <td>{s.registeredBy?.name || '—'}</td>
                  <td>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="app-btn app-btn-primary app-btn-sm"
                        onClick={() => setSelected(s)}
                      >
                        Review & approve
                      </button>
                      <button
                        type="button"
                        className="app-btn app-btn-danger app-btn-sm"
                        disabled={deletingId === s._id}
                        onClick={() => handleDelete(s)}
                      >
                        {deletingId === s._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <RegistrationApprovalModal
        open={Boolean(selected)}
        student={selected}
        onClose={() => setSelected(null)}
        onApproved={fetchPending}
        onRejected={fetchPending}
      />
    </>
  );
}
