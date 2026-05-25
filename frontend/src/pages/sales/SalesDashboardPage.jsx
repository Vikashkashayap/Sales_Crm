import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import LeadTable from '../../components/LeadTable';

export default function SalesDashboardPage() {
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [dashRes, leadsRes] = await Promise.all([
        api.get('/dashboard/sales'),
        api.get('/leads'),
      ]);
      setData(dashRes.data);
      const leadData = Array.isArray(leadsRes.data) ? leadsRes.data : leadsRes.data.leads || [];
      setLeads(leadData.slice(0, 10));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) return <div className="skeleton-loader">Loading...</div>;
  if (!data) return <p className="muted-text">Could not load dashboard.</p>;

  return (
    <div className="dashboard-page">
      <div className="stats-grid">
        <StatCard title="My Leads" value={data.assignedLeads} icon="leads" />
        <StatCard title="Converted" value={data.converted} icon="won" />
        <StatCard title="Conversion Rate" value={`${data.conversionRate}%`} icon="won" />
        <StatCard title="Today's Follow-ups" value={data.todayFollowups} icon="followup" />
        <StatCard title="Pending Tasks" value={data.pendingTasks} icon="followup" />
      </div>

      {data.upcomingFollowups?.length > 0 && (
        <div className="app-card">
          <h2 className="section-heading">Upcoming Follow-ups</h2>
          <ul className="followup-list">
            {data.upcomingFollowups.map((f) => (
              <li key={f._id}>
                <strong>{f.lead?.name}</strong>
                <span>{new Date(f.scheduledAt).toLocaleString()}</span>
                <span className="badge">{f.type}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.recentActivities?.length > 0 && (
        <div className="app-card">
          <h2 className="section-heading">Recent Activity</h2>
          <ul className="activity-timeline compact">
            {data.recentActivities.map((a) => (
              <li key={a._id}>
                <p>{a.description}</p>
                <small>{new Date(a.createdAt).toLocaleString()}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="app-card">
        <h2 className="section-heading">My Assigned Leads</h2>
        <LeadTable leads={leads} onRefresh={fetchAll} isAdmin={false} />
      </div>
    </div>
  );
}
