import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import LeadTable from '../../components/LeadTable';
import RegisterStudentModal from '../../components/admissions/RegisterStudentModal';
import { useStudentRegistration } from '../../hooks/useStudentRegistration';
import { formatCompactINR } from '../../utils/formatCurrency';
import TargetBarChart from '../../components/charts/TargetBarChart';

function ProgressBar({ current, target, label, isMoney = false }) {
  const safeTarget = Number(target) || 0;
  const safeCurrent = Number(current) || 0;
  const pct = safeTarget > 0 ? Math.min(100, Math.round((safeCurrent / safeTarget) * 100)) : 0;
  const met = safeTarget > 0 ? safeCurrent >= safeTarget : false;

  return (
    <div className="bda-progress-row">
      <div className="bda-progress-header">
        <span>{label}</span>
        <span className={met ? 'bda-progress-met' : ''}>
          {isMoney
            ? `${formatCompactINR(safeCurrent)}/${formatCompactINR(safeTarget)}`
            : `${safeCurrent}/${safeTarget}`}
          {met && <span className="bda-check" aria-hidden> ✓</span>}
        </span>
      </div>
      <div className="bda-progress-track">
        <div
          className={`bda-progress-fill ${met ? 'bda-progress-fill-met' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function SalesDashboardPage() {
  const [data, setData] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targetView, setTargetView] = useState('weekly'); // weekly | monthly

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

  const {
    registerLead,
    setRegisterLead,
    registeredLeadIds,
    handleStatusChange,
    handleRegisterClick,
    handleRegistrationSuccess,
  } = useStudentRegistration(fetchAll);

  const targets = data?.targets || {};
  const progress = data?.targetProgress || {};

  const targetUi =
    targetView === 'monthly'
      ? {
          label: 'This Month',
          admissionsTarget: targets.monthlyAdmissionTarget ?? 0,
          revenueTarget: targets.monthlyRevenueTarget ?? 0,
          admissions: progress.monthly?.admissions ?? 0,
          revenue: progress.monthly?.revenue ?? 0,
        }
      : {
          label: 'This Week',
          admissionsTarget: targets.weeklyAdmissionTarget ?? 0,
          revenueTarget: targets.weeklyRevenueTarget ?? 0,
          admissions: progress.weekly?.admissions ?? 0,
          revenue: progress.weekly?.revenue ?? 0,
        };

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

      <div className="app-card sales-targets-card">
        <div className="sales-targets-head">
          <div className="sales-targets-title">
            <h2 className="section-heading" style={{ marginBottom: 2 }}>My Targets</h2>
            <p className="muted-text" style={{ marginTop: 0 }}>{targetUi.label}</p>
          </div>
          <div className="period-toggle">
            <button
              type="button"
              className={targetView === 'weekly' ? 'active' : ''}
              onClick={() => setTargetView('weekly')}
            >
              Weekly
            </button>
            <button
              type="button"
              className={targetView === 'monthly' ? 'active' : ''}
              onClick={() => setTargetView('monthly')}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="sales-targets-grid">
          <div className="sales-targets-chart">
            <TargetBarChart
              admissions={targetUi.admissions}
              admissionsTarget={targetUi.admissionsTarget}
              revenue={targetUi.revenue}
              revenueTarget={targetUi.revenueTarget}
              revenueLabel={formatCompactINR}
              height={170}
            />
          </div>

          <div className="sales-targets-metrics">
            <div className="sales-targets-metric">
              <div className="sales-targets-metric-label">Admissions</div>
              <div className="sales-targets-metric-value">
                {targetUi.admissions}/{targetUi.admissionsTarget}
              </div>
              <ProgressBar
                current={targetUi.admissions}
                target={targetUi.admissionsTarget}
                label=""
              />
            </div>

            <div className="sales-targets-metric">
              <div className="sales-targets-metric-label">Revenue</div>
              <div className="sales-targets-metric-value">
                {formatCompactINR(targetUi.revenue)} / {formatCompactINR(targetUi.revenueTarget)}
              </div>
              <ProgressBar
                current={targetUi.revenue}
                target={targetUi.revenueTarget}
                label=""
                isMoney
              />
            </div>
          </div>
        </div>
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
        <LeadTable
          leads={leads}
          onRefresh={fetchAll}
          isAdmin={false}
          registeredLeadIds={registeredLeadIds}
          onStatusChange={handleStatusChange}
          onRegisterStudent={handleRegisterClick}
        />
      </div>

      <RegisterStudentModal
        open={!!registerLead}
        lead={registerLead}
        isAlreadyRegistered={
          registerLead ? registeredLeadIds.has(String(registerLead._id)) : false
        }
        onClose={() => setRegisterLead(null)}
        onSuccess={handleRegistrationSuccess}
      />
    </div>
  );
}
