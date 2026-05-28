import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import StatCard from '../../components/StatCard';
import SetTargetModal from '../../components/performance/SetTargetModal';
import { formatCompactINR, formatINR } from '../../utils/formatCurrency';

const PERIODS = [
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'biweekly', label: 'Bi-Weekly' },
  { id: 'this_month', label: 'This Month' },
];

const TABS = ['Leaderboard', 'Individual Detail', 'Campaign Conversion', 'Target Tracking'];

function ProgressBar({ current, target, met, label }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="bda-progress-row">
      <div className="bda-progress-header">
        <span>{label}</span>
        <span className={met ? 'bda-progress-met' : ''}>
          {label.includes('Revenue')
            ? `${formatCompactINR(current)}/${formatCompactINR(target)}`
            : `${current}/${target}`}
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

function BDACard({ row, isLeader, onSetTarget, period }) {
  const initials = row.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const joined = row.joinedAt
    ? new Date(row.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : '—';

  const isMonthlyPeriod = period === 'this_month' || period === 'last_month';
  const admissionsTarget = isMonthlyPeriod ? row.monthlyAdmissionTarget : row.weeklyAdmissionTarget;
  const revenueTarget = isMonthlyPeriod ? row.monthlyRevenueTarget : row.weeklyRevenueTarget;

  return (
    <article className={`bda-card ${isLeader ? 'bda-card-leader' : ''}`}>
      <div className="bda-card-top">
        <div className="bda-card-profile">
          {isLeader && <span className="bda-trophy" title="Top performer">🏆</span>}
          <span className="bda-avatar">{initials}</span>
          <div>
            <strong className="bda-name">{row.name}</strong>
            <p className="muted-text bda-meta">
              {row.employeeId} · Joined {joined}
            </p>
          </div>
        </div>
        <div className="bda-card-actions">
          {row.neglected > 0 && (
            <span className="bda-neglected">
              <span className="bda-neglected-dot" />
              {row.neglected} neglected
            </span>
          )}
          <button type="button" className="app-btn app-btn-ghost app-btn-sm" onClick={() => onSetTarget(row)}>
            Set Target
          </button>
        </div>
      </div>

      <div className="bda-metrics">
        {[
          ['Leads', row.leads],
          ['Contacted', row.contacted],
          ['Sessions', row.sessions],
          ['Converted', row.converted],
          ['Revenue', formatCompactINR(row.revenue)],
          ['CVR', `${row.cvr}%`],
        ].map(([label, value]) => (
          <div key={label} className="bda-metric">
            <span className="bda-metric-value">{value}</span>
            <span className="bda-metric-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="bda-card-progress">
        <ProgressBar
          current={row.admissions}
          target={admissionsTarget}
          met={row.admissionTargetMet}
          label={isMonthlyPeriod ? 'Monthly Target (Adm)' : 'Weekly Target (Adm)'}
        />
        <ProgressBar
          current={row.revenue}
          target={revenueTarget}
          met={row.revenueTargetMet}
          label={isMonthlyPeriod ? 'Monthly Revenue' : 'Weekly Revenue'}
        />
      </div>
    </article>
  );
}

export default function AdminBDAPerformancePage() {
  const [period, setPeriod] = useState('this_week');
  const [activeTab, setActiveTab] = useState('Leaderboard');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetBda, setTargetBda] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/performance/bda', { params: { period } });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = () => {
    if (!data?.leaderboard?.length) return;
    const headers = [
      'Rank',
      'Name',
      'Employee ID',
      'Leads',
      'Contacted',
      'Sessions',
      'Converted',
      'Revenue',
      'CVR %',
      'Admissions',
      'Neglected',
    ];
    const rows = data.leaderboard.map((r) => [
      r.rank,
      r.name,
      r.employeeId,
      r.leads,
      r.contacted,
      r.sessions,
      r.converted,
      r.revenue,
      r.cvr,
      r.admissions,
      r.neglected,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bda-performance-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary;

  return (
    <div className="bda-performance-page">
      <header className="bda-page-header">
        <div>
          <h1 className="bda-page-title">BDA Performance</h1>
          <p className="muted-text">
            Track, compare and review team performance across time periods.
          </p>
        </div>
        <div className="bda-header-actions">
          <div className="period-toggle">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={period === p.id ? 'active' : ''}
                onClick={() => setPeriod(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button type="button" className="app-btn app-btn-ghost" onClick={handleExport}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export
          </button>
        </div>
      </header>

      {data?.periodLabel && (
        <p className="bda-period-label">{data.periodLabel}</p>
      )}

      {loading ? (
        <div className="skeleton-loader">Loading performance data…</div>
      ) : (
        <>
          <div className="stats-grid bda-summary-grid">
            <StatCard title="Total Leads" value={summary?.totalLeads ?? 0} icon="leads" />
            <StatCard title="Contacted" value={summary?.contacted ?? 0} icon="leads" />
            <StatCard title="Converted" value={summary?.converted ?? 0} icon="won" />
            <StatCard title="Avg CVR" value={`${summary?.avgCvr ?? 0}%`} icon="won" />
            <StatCard
              title="Revenue"
              value={formatCompactINR(summary?.revenue ?? 0)}
              icon="revenue"
            />
          </div>

          <div className="bda-tabs">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                className={activeTab === tab ? 'active' : ''}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'Leaderboard' && (
            <div className="bda-leaderboard">
              {data?.leaderboard?.length ? (
                data.leaderboard.map((row, i) => (
                  <BDACard
                    key={row.userId}
                    row={row}
                    isLeader={i === 0}
                    onSetTarget={setTargetBda}
                    period={period}
                  />
                ))
              ) : (
                <p className="muted-text app-card">No BDA performance data for this period.</p>
              )}
            </div>
          )}

          {activeTab === 'Individual Detail' && (
            <div className="app-card">
              <h2 className="section-heading">Individual breakdown</h2>
              <div className="app-table-wrap">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>BDA</th>
                      <th>Leads</th>
                      <th>Contacted</th>
                      <th>Sessions</th>
                      <th>Converted</th>
                      <th>Admissions</th>
                      <th>Revenue</th>
                      <th>CVR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.leaderboard || []).map((r) => (
                      <tr key={r.userId}>
                        <td>
                          <strong>{r.name}</strong>
                          <br />
                          <span className="muted-text">{r.employeeId}</span>
                        </td>
                        <td>{r.leads}</td>
                        <td>{r.contacted}</td>
                        <td>{r.sessions}</td>
                        <td>{r.converted}</td>
                        <td>{r.admissions}</td>
                        <td>{formatINR(r.revenue)}</td>
                        <td>{r.cvr}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'Target Tracking' && (
            <div className="bda-leaderboard">
              {(data?.leaderboard || []).map((row) => (
                <div key={row.userId} className="app-card bda-target-card">
                  <div className="bda-target-card-head">
                    <strong>{row.name}</strong>
                    <button
                      type="button"
                      className="app-btn app-btn-ghost app-btn-sm"
                      onClick={() => setTargetBda(row)}
                    >
                      Edit targets
                    </button>
                  </div>
                  <ProgressBar
                    current={row.admissions}
                    target={row.admissionTargetForPeriod ?? row.weeklyAdmissionTarget}
                    met={row.admissionTargetMet}
                    label={(period === 'this_month' || period === 'last_month') ? 'Monthly admissions' : 'Weekly admissions'}
                  />
                  <ProgressBar
                    current={row.revenue}
                    target={row.revenueTargetForPeriod ?? row.weeklyRevenueTarget}
                    met={row.revenueTargetMet}
                    label={(period === 'this_month' || period === 'last_month') ? 'Monthly revenue' : 'Weekly revenue'}
                  />
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Campaign Conversion' && (
            <div className="app-card">
              <p className="muted-text">
                Campaign-level conversion breakdown will appear here when lead sources are tagged
                consistently. Use the Leads page source filter to review campaigns meanwhile.
              </p>
            </div>
          )}
        </>
      )}

      <SetTargetModal
        open={!!targetBda}
        bda={targetBda}
        onClose={() => setTargetBda(null)}
        onSaved={fetchData}
      />
    </div>
  );
}
