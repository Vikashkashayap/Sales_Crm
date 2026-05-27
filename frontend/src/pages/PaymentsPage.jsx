import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'all', label: 'All Time' },
];

function FinanceStatCard({ title, value, subtext, variant }) {
  return (
    <div className={`app-card finance-stat-card finance-stat-${variant}`}>
      <span className="finance-stat-label">{title}</span>
      <strong className="finance-stat-value">{value}</strong>
      {subtext && <span className="finance-stat-sub">{subtext}</span>}
    </div>
  );
}

function BarChartPanel({ title, items, valueKey, labelKey, maxKey }) {
  return (
    <div className="app-card finance-chart-card">
      <h3 className="finance-chart-title">{title}</h3>
      {items.length === 0 ? (
        <p className="muted-text" style={{ padding: 16 }}>No data yet.</p>
      ) : (
        <ul className="finance-bar-list">
          {items.map((item) => {
            const val = item[valueKey] || 0;
            const max = item[maxKey] || val || 1;
            const pct = Math.round((val / max) * 100);
            return (
              <li key={item[labelKey] || item.name || item.courseType}>
                <div className="finance-bar-row">
                  <span className="finance-bar-label">{item[labelKey] || item.name || item.courseType}</span>
                  <span className="finance-bar-amount">{fmt(val)}</span>
                </div>
                <div className="finance-bar-track">
                  <div className="finance-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                {item.studentCount != null && (
                  <span className="finance-bar-meta">{item.studentCount} student{item.studentCount === 1 ? '' : 's'}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function InstallmentRow({ item, onMarkPaid, marking }) {
  const dueStr = item.dueDate
    ? new Date(item.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className={`finance-installment-row ${item.status === 'Overdue' ? 'overdue' : ''} ${item.status === 'Paid' ? 'paid' : ''}`}>
      <div className="finance-installment-main">
        <strong>{item.fullName}</strong>
        <span className="finance-installment-id">{item.studentCode || '—'}</span>
        <span className="muted-text">
          {item.courseType || '—'} · BDA: {item.bdaName}
        </span>
        <p className={`finance-installment-msg ${item.status === 'Overdue' ? 'text-danger' : ''}`}>
          {item.message}
        </p>
      </div>
      <div className="finance-installment-actions">
        <strong>{fmt(item.balanceDue != null && item.status === 'Partial' ? item.balanceDue : item.amount)}</strong>
        {item.status === 'Partial' && item.paidAmount > 0 && (
          <span className="muted-text">of {fmt(item.amount)} · {fmt(item.paidAmount)} paid</span>
        )}
        <span className="muted-text">Due {dueStr}</span>
        {item.status !== 'Paid' && item.status !== 'Refund' && item.installmentNumber > 0 && (
          <button
            type="button"
            className="app-btn app-btn-primary app-btn-sm"
            disabled={marking}
            onClick={() => onMarkPaid(item.studentId, item.installmentNumber)}
          >
            {item.status === 'Partial' ? 'Pay Remaining' : 'Mark Paid'}
          </button>
        )}
        {item.status === 'Paid' && <span className="badge badge-payment-paid">Paid</span>}
        {item.status === 'Partial' && <span className="badge badge-payment-partial">Partial</span>}
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === 'admin';
  const [period, setPeriod] = useState('this_month');
  const [tab, setTab] = useState('overdue');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payments/dashboard?period=${period}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [period, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkPaid = async (studentId, installmentNumber) => {
    setMarking(true);
    try {
      await api.post(`/payments/students/${studentId}/mark-paid`, { installmentNumber });
      toast.success('Payment marked as paid');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark paid');
    } finally {
      setMarking(false);
    }
  };

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ['Student', 'Code', 'Program', 'BDA', 'Installment', 'Amount', 'Due', 'Status'],
      ...data.allInstallments.map((i) => [
        i.fullName,
        i.studentCode,
        i.courseType,
        i.bdaName,
        i.installmentNumber,
        i.amount,
        i.dueDate,
        i.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export downloaded');
  };

  const listItems =
    tab === 'overdue'
      ? data?.overdue || []
      : tab === 'refund'
        ? (data?.refundEligible || []).map((r) => ({
            studentId: r.studentId,
            studentCode: r.studentCode,
            fullName: r.fullName,
            courseType: r.courseType,
            bdaName: r.bdaName,
            installmentNumber: 0,
            amount: r.balance,
            dueDate: null,
            status: 'Refund',
            message: `Refund eligible — balance ${fmt(r.balance)} of ${fmt(r.finalFee)}`,
          }))
        : data?.allInstallments || [];

  const bdaForChart = (data?.bdaRevenue || []).map((b) => ({
    ...b,
    label: b.name,
    maxAmount: data.bdaRevenue[0]?.maxAmount || b.amount,
  }));

  const programForChart = (data?.programSplit || []).map((p) => ({
    ...p,
    label: p.courseType,
    maxRevenue: data.programSplit[0]?.maxRevenue || p.revenue,
  }));

  return (
    <div className="payments-page">
      <div className="page-toolbar payments-header">
        <div>
          <h2 className="section-heading" style={{ margin: 0 }}>Payments & Finance</h2>
          <p className="muted-text payments-subtitle">
            {isAdmin
              ? 'Revenue tracking, installments, overdue alerts — all students'
              : 'Your students — revenue, installments & overdue'}
          </p>
        </div>
        <div className="toolbar-actions">
          <select
            className="app-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Period"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button type="button" className="app-btn app-btn-ghost" onClick={handleExport} disabled={!data}>
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-loader">Loading payments…</div>
      ) : data ? (
        <>
          <div className="finance-stats-grid">
            <FinanceStatCard
              title="Total Collected"
              value={fmt(data.summary.totalCollected)}
              subtext={data.summary.growthPercent !== 0 ? `↑ ${data.summary.growthPercent}% vs last month` : undefined}
              variant="collected"
            />
            <FinanceStatCard
              title="Pending / Balance Due"
              value={fmt(data.summary.pendingBalance)}
              subtext={`Across ${data.summary.pendingStudentCount} student${data.summary.pendingStudentCount === 1 ? '' : 's'}`}
              variant="pending"
            />
            <FinanceStatCard
              title="Overdue Installments"
              value={fmt(data.summary.overdueAmount)}
              subtext={`${data.summary.overdueStudentCount} student${data.summary.overdueStudentCount === 1 ? '' : 's'} overdue`}
              variant="overdue"
            />
            <FinanceStatCard
              title="Refund Eligible"
              value={fmt(data.summary.refundEligibleAmount)}
              subtext={`${data.summary.refundEligibleCount} scholarship student${data.summary.refundEligibleCount === 1 ? '' : 's'}`}
              variant="refund"
            />
          </div>

          <div className="finance-charts-grid">
            <BarChartPanel
              title="BDA-wise Revenue"
              items={bdaForChart}
              valueKey="amount"
              labelKey="label"
              maxKey="maxAmount"
            />
            <div className="app-card finance-chart-card">
              <h3 className="finance-chart-title">Program Split</h3>
              {programForChart.length === 0 ? (
                <p className="muted-text" style={{ padding: 16 }}>No data yet.</p>
              ) : (
                <>
                  <ul className="finance-bar-list">
                    {programForChart.map((item) => {
                      const pct = Math.round((item.revenue / item.maxRevenue) * 100);
                      return (
                        <li key={item.courseType}>
                          <div className="finance-bar-row">
                            <span className="finance-bar-label">
                              {item.courseType} ({fmt(item.revenue / Math.max(item.studentCount, 1))} avg)
                            </span>
                            <span className="finance-bar-amount">{fmt(item.revenue)}</span>
                          </div>
                          <div className="finance-bar-track">
                            <div
                              className={`finance-bar-fill ${item.courseType === 'Scholarship' ? 'scholarship' : 'standard'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="finance-bar-meta">{item.studentCount} students</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="finance-plan-footer muted-text">
                    Full Payment: {data.planBreakdown.fullPayment} students · Installment Plan: {data.planBreakdown.installment} students
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="app-card finance-list-card">
            <div className="admissions-toolbar">
              <div className="view-toggle">
                <button
                  type="button"
                  className={tab === 'overdue' ? 'active' : ''}
                  onClick={() => setTab('overdue')}
                >
                  Overdue ({data.overdue.length})
                </button>
                <button
                  type="button"
                  className={tab === 'all' ? 'active' : ''}
                  onClick={() => setTab('all')}
                >
                  All Installments
                </button>
                <button
                  type="button"
                  className={tab === 'refund' ? 'active' : ''}
                  onClick={() => setTab('refund')}
                >
                  Refund Eligible ({data.refundEligible.length})
                </button>
              </div>
            </div>

            {listItems.length === 0 ? (
              <p className="muted-text" style={{ padding: 24 }}>
                {tab === 'overdue' ? 'No overdue installments.' : 'No records in this tab.'}
              </p>
            ) : (
              <div className="finance-installment-list">
                {listItems.map((item) => (
                  <InstallmentRow
                    key={`${item.studentId}-${item.installmentNumber}-${item.status}`}
                    item={item}
                    onMarkPaid={handleMarkPaid}
                    marking={marking}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="muted-text">Could not load payment data.</p>
      )}
    </div>
  );
}
