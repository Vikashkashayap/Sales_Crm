import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import LeadTable from '../../components/LeadTable';
import PipelineChart from '../../components/charts/PipelineChart';
import SourceChart from '../../components/charts/SourceChart';
import TrendChart from '../../components/charts/TrendChart';
import PendingRegistrationsPanel from '../../components/admissions/PendingRegistrationsPanel';

const RECENT_LEADS_COUNT = 8;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [leads, setLeads] = useState([]);
  const [salesUsers, setSalesUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [statsRes, analyticsRes, leadsRes, usersRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/analytics'),
        api.get('/leads'),
        api.get('/users/sales'),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      const leadData = Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data.leads || [];
      setLeads(leadData.slice(0, RECENT_LEADS_COUNT));
      setSalesUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) return <div className="skeleton-loader">Loading dashboard...</div>;
  if (!stats) return <p className="muted-text">Could not load stats.</p>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div className="dashboard-welcome-text">
          <h1 className="dashboard-welcome-title">Sales Dashboard</h1>
          <p className="dashboard-welcome-sub">Overview of leads, conversions, and team performance</p>
        </div>
        <div className="dashboard-welcome-badges">
          <span className="dash-badge dash-badge--blue">{stats.totalLeads} Leads</span>
          <span className="dash-badge dash-badge--green">{stats.totalWon} Converted</span>
          <span className="dash-badge dash-badge--orange">{stats.todayFollowups} Follow-ups Today</span>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard title="Emails Sent Today" value={stats.emailsSentToday ?? 0} icon="email" />
        <StatCard title="Materials Uploaded" value={stats.totalMaterials ?? 0} icon="materials" />
        <StatCard title="Email List (uploaded)" value={stats.marketingRecipientsCount ?? stats.activeLeadsCount ?? 0} icon="leads" />
        <StatCard title="Total Leads" value={stats.totalLeads} icon="leads" />
        <StatCard title="Converted" value={stats.totalWon} icon="won" />
        <StatCard title="Lost" value={stats.totalLost} icon="lost" />
        <StatCard title="Conversion Rate" value={`${stats.conversionRate ?? 0}%`} icon="won" />
        <StatCard title="Today Follow-ups" value={stats.todayFollowups} icon="followup" />
        <StatCard title="Missed Follow-ups" value={stats.pendingFollowups ?? 0} icon="followup" />
        <StatCard title="New Leads" value={stats.newLeads ?? 0} icon="leads" />
        <StatCard title="Total Revenue" value={`₹${(stats.totalRevenue ?? 0).toLocaleString()}`} icon="revenue" />
      </div>

      <PendingRegistrationsPanel />

      <div className="charts-grid">
        <div className="app-card chart-card">
          <h3 className="chart-title">Pipeline by Status</h3>
          <PipelineChart data={stats.pipelineByStatus} />
        </div>
        <div className="app-card chart-card">
          <h3 className="chart-title">Leads by Source</h3>
          <SourceChart data={stats.leadsBySource} />
        </div>
        <div className="app-card chart-card chart-card-wide">
          <h3 className="chart-title">Conversion Trend (30 days)</h3>
          <TrendChart data={analytics?.conversionTrend || []} />
        </div>
      </div>

      {analytics?.teamPerformance?.length > 0 && (
        <div className="app-card">
          <h2 className="section-heading">Top Performers</h2>
          <div className="team-grid">
            {analytics.teamPerformance.slice(0, 5).map((m) => (
              <div key={m.userId} className="team-card">
                <strong>{m.name}</strong>
                <p className="muted-text">{m.email}</p>
                <div className="team-stats">
                  <span>{m.converted}/{m.total} converted</span>
                  <span className="badge badge-won">{m.conversionRate}%</span>
                </div>
                <p className="revenue-text">₹{(m.revenue || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="app-card">
        <h2 className="section-heading">Recent Leads</h2>
        <LeadTable leads={leads} onRefresh={fetchAll} isAdmin salesUsers={salesUsers} />
      </div>
    </div>
  );
}
