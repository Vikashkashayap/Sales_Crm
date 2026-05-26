import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import RegisterStudentModal from '../components/admissions/RegisterStudentModal';
function StatusBadge({ value, type }) {
  const cls = type === 'payment'
    ? `badge badge-payment-${(value || '').toLowerCase()}`
    : `badge badge-student-${(value || '').toLowerCase()}`;
  return <span className={cls}>{value}</span>;
}

export default function AdmissionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [showRegister, setShowRegister] = useState(false);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const requests = [
        api.get('/students'),
        api.get('/students/stats'),
      ];
      if (isAdmin) requests.push(api.get('/users/sales'));
      const results = await Promise.all(requests);
      setStudents(results[0].data);
      setStats(results[1].data);
      if (isAdmin && results[2]) setSalesUsers(results[2].data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = students.filter((s) => {
    if (tab === 'onboarding' && s.status !== 'Onboarding') return false;
    if (tab === 'overdue' && s.paymentStatus !== 'Overdue') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.fullName?.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.programName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const onboardingCount = students.filter((s) => s.status === 'Onboarding').length;

  return (
    <div className="admissions-page">
      <div className="page-toolbar">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>Admissions</h2>
          <p className="muted-text" style={{ marginTop: 4 }}>
            {isAdmin ? 'Manage all registered students' : 'Students you registered from converted leads'}
          </p>
        </div>
        <button type="button" className="app-btn app-btn-primary" onClick={() => setShowRegister(true)}>
          + Register Student
        </button>
      </div>

      {stats && (
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          <div className="app-card stat-mini">
            <span className="muted-text">Total Students</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="app-card stat-mini">
            <span className="muted-text">Onboarding</span>
            <strong>{stats.onboarding}</strong>
          </div>
          <div className="app-card stat-mini">
            <span className="muted-text">Pending Payment</span>
            <strong>{stats.pending}</strong>
          </div>
          <div className="app-card stat-mini">
            <span className="muted-text">Overdue</span>
            <strong className="text-danger">{stats.overdue}</strong>
          </div>
        </div>
      )}

      <div className="app-card">
        <div className="admissions-toolbar">
          <div className="view-toggle">
            <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
              All ({students.length})
            </button>
            <button type="button" className={tab === 'onboarding' ? 'active' : ''} onClick={() => setTab('onboarding')}>
              Onboarding ({onboardingCount})
            </button>
            <button type="button" className={tab === 'overdue' ? 'active' : ''} onClick={() => setTab('overdue')}>
              Overdue
            </button>
          </div>
          <input
            className="app-input"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
        </div>

        {loading ? (
          <div className="skeleton-loader">Loading students…</div>
        ) : filtered.length === 0 ? (
          <p className="muted-text" style={{ padding: 24 }}>No students found.</p>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Program</th>
                  <th>BDA</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Payment</th>
                  {isAdmin && <th>Registered By</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <strong>{s.fullName}</strong>
                      <div className="muted-text" style={{ fontSize: 12 }}>{s.phone}</div>
                    </td>
                    <td>
                      {s.programName || '—'}
                      {s.courseType && <div className="muted-text" style={{ fontSize: 12 }}>{s.courseType}</div>}
                    </td>
                    <td>{s.assignedBda?.name || s.leadBdaName || '—'}</td>
                    <td>₹{(s.finalFee || 0).toLocaleString('en-IN')}</td>
                    <td><StatusBadge value={s.status} /></td>
                    <td><StatusBadge value={s.paymentStatus} type="payment" /></td>
                    {isAdmin && <td>{s.registeredBy?.name || '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RegisterStudentModal
        open={showRegister}
        lead={null}
        salesUsers={salesUsers}
        onClose={() => setShowRegister(false)}
        onSuccess={fetchData}
      />
    </div>
  );
}
