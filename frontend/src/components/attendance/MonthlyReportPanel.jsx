import React from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyReportPanel({
  report,
  loading,
  month,
  year,
  onMonthChange,
  onYearChange,
  onExportExcel,
  onExportPdf,
  exportLoading,
  salesUsers,
  isAdmin,
  selectedUserId,
  onUserChange,
}) {
  const summary = report?.summary;

  return (
    <div className="app-card attendance-monthly-card">
      <div className="attendance-monthly-header">
        <div>
          <h3>Monthly Report</h3>
          <p className="muted-text">View and export attendance for a selected month</p>
        </div>
        <div className="attendance-monthly-filters">
          {isAdmin && (
            <select
              className="app-input attendance-filter-select"
              value={selectedUserId}
              onChange={(e) => onUserChange(e.target.value)}
            >
              <option value="">All Employees</option>
              {salesUsers.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
          )}
          <select
            className="app-input attendance-filter-select"
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="app-input attendance-filter-select"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="attendance-loading">Loading monthly report…</div>
      ) : (
        <>
          <div className="attendance-monthly-stats">
            <div className="attendance-monthly-stat">
              <span className="muted-text">Days Present</span>
              <strong>{summary?.presentDays ?? 0}</strong>
            </div>
            <div className="attendance-monthly-stat">
              <span className="muted-text">Half Days</span>
              <strong>{summary?.halfDays ?? 0}</strong>
            </div>
            <div className="attendance-monthly-stat">
              <span className="muted-text">Total Days</span>
              <strong>{summary?.totalDays ?? 0}</strong>
            </div>
            <div className="attendance-monthly-stat">
              <span className="muted-text">Total Hours</span>
              <strong>{summary?.totalHoursDisplay ?? '0h 0m'}</strong>
            </div>
          </div>

          <div className="attendance-export-actions">
            <button
              type="button"
              className="app-btn app-btn-primary"
              disabled={exportLoading}
              onClick={onExportExcel}
            >
              {exportLoading ? 'Exporting…' : 'Export to Excel'}
            </button>
            <button
              type="button"
              className="app-btn"
              disabled={exportLoading}
              onClick={onExportPdf}
            >
              {exportLoading ? 'Exporting…' : 'Export to PDF'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
