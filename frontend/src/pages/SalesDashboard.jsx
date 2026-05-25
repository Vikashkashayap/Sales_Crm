import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import LeadTable from '../components/LeadTable';

export default function SalesDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.get('/leads'),
        api.get('/dashboard/stats'),
      ]);
      setLeads(leadsRes.data);
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

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Sales Dashboard</h1>
          <p style={styles.user}>Welcome, {user?.name} (Assigned leads only)</p>
        </div>
        <div style={styles.headerRight}>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      {stats && (
        <div style={styles.stats}>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.totalLeads}</span><span>My Leads</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.totalWon}</span><span>Won</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.totalLost}</span><span>Lost</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>{stats.todayFollowups}</span><span>Today Follow-ups</span></div>
          <div style={styles.statCard}><span style={styles.statValue}>₹{stats.totalRevenue?.toLocaleString() ?? 0}</span><span>My Revenue</span></div>
        </div>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Assigned Leads</h2>
        {loading ? (
          <p>Loading leads...</p>
        ) : (
          <LeadTable leads={leads} onRefresh={fetchData} isAdmin={false} />
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
};
