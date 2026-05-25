import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import LeadTable from '../components/LeadTable';
import UploadExcel from '../components/UploadExcel';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'sales' });
  const [userMsg, setUserMsg] = useState('');
  const [userLoading, setUserLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [leadsRes, usersRes, statsRes] = await Promise.all([
        api.get('/leads'),
        api.get('/users'),
        api.get('/dashboard/stats'),
      ]);
      setLeads(leadsRes.data);
      setSalesUsers(usersRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserMsg('');
    setUserLoading(true);
    try {
      await api.post('/auth/register', newUser);
      setUserMsg('User created.');
      setNewUser({ name: '', email: '', password: '', role: 'sales' });
      const usersRes = await api.get('/users');
      setSalesUsers(usersRes.data);
    } catch (err) {
      setUserMsg(err.response?.data?.message || 'Failed to create user');
    } finally {
      setUserLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Dashboard</h1>
          <p style={styles.user}>Welcome, {user?.name}</p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {stats && (
        <div style={styles.stats}>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.totalLeads}</span><span>Total Leads</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.totalWon}</span><span>Won</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.totalLost}</span><span>Lost</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.todayFollowups}</span><span>Today Follow-ups</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>₹{stats.totalRevenue?.toLocaleString() ?? 0}</span><span>Revenue</span></div>
        </div>
      )}

      <div style={styles.createUser}>
        <h3 style={{ marginBottom: 12 }}>Create User</h3>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input type="text" placeholder="Name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required style={styles.input} />
          <input type="email" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required style={styles.input} />
          <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} style={styles.input} />
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} style={styles.input}>
            <option value="sales">Sales</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={userLoading} style={styles.btn}>Create</button>
        </form>
        {userMsg && <p style={{ marginTop: 8, color: userMsg.startsWith('User') ? '#059669' : '#b91c1c' }}>{userMsg}</p>}
      </div>

      <UploadExcel onSuccess={fetchData} />

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>All Leads</h2>
        {loading ? (
          <p>Loading leads...</p>
        ) : (
          <LeadTable leads={leads} onRefresh={fetchData} isAdmin={true} salesUsers={salesUsers} />
        )}
      </section>
    </div>
  );
}

const styles = {
  page: { maxWidth: 1400, margin: '0 auto', padding: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, marginBottom: 4 },
  user: { color: '#6b7280', fontSize: 14 },
  headerRight: { display: 'flex', gap: 12 },
  logoutBtn: { padding: '8px 16px', background: '#374151', color: '#fff', border: 'none', borderRadius: 6 },
  stats: { display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 },
  statCard: { padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minWidth: 120, display: 'flex', flexDirection: 'column', gap: 4 },
  statValue: { fontSize: 20, fontWeight: 700, color: '#111' },
  section: { background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  sectionTitle: { marginBottom: 16, fontSize: 18 },
  createUser: { padding: 16, background: '#f0fdf4', borderRadius: 8, marginBottom: 24 },
  input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, minWidth: 120 },
  btn: { padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6 },
};
