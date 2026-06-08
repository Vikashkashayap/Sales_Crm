import React from 'react';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function TeamStatusBadge({ isPresent, status }) {
  if (!isPresent) {
    return <span className="badge badge-lost">Absent</span>;
  }
  if (status === 'present') {
    return <span className="badge badge-won">Present</span>;
  }
  if (status === 'half-day') {
    return <span className="badge badge-follow-up">Half Day</span>;
  }
  return <span className="badge badge-won">Working</span>;
}

export default function AdminTeamAttendance({ teamData, loading }) {
  if (loading) {
    return <div className="attendance-loading app-card">Loading team attendance…</div>;
  }

  const summary = teamData?.summary || { total: 0, present: 0, absent: 0 };
  const team = teamData?.team || [];

  return (
    <div className="attendance-team-section">
      <div className="attendance-team-summary">
        <div className="app-card stat-mini attendance-team-stat">
          <span className="muted-text">Total Employees</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="app-card stat-mini attendance-team-stat attendance-team-stat--present">
          <span className="muted-text">Present Today</span>
          <strong style={{ color: 'var(--success)' }}>{summary.present}</strong>
        </div>
        <div className="app-card stat-mini attendance-team-stat attendance-team-stat--absent">
          <span className="muted-text">Absent Today</span>
          <strong className="text-danger">{summary.absent}</strong>
        </div>
      </div>

      <div className="app-card app-card--table">
        <div className="attendance-table-header">
          <h3>Team Attendance — Today</h3>
          <span className="muted-text">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="app-table-wrap">
          <table className="app-table attendance-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Status</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Hours Today</th>
              </tr>
            </thead>
            <tbody>
              {team.map((row) => (
                <tr key={row.user._id}>
                  <td>
                    <div className="attendance-employee-cell">
                      <span className="attendance-avatar">{row.user.name?.charAt(0)?.toUpperCase()}</span>
                      <div>
                        <strong>{row.user.name}</strong>
                        <span className="muted-text attendance-email">{row.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{row.user.employeeId || '—'}</td>
                  <td><TeamStatusBadge isPresent={row.isPresent} status={row.status} /></td>
                  <td>{formatTime(row.clockIn)}</td>
                  <td>{formatTime(row.clockOut)}</td>
                  <td>{row.totalHoursDisplay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
