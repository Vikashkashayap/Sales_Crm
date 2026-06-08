import React from 'react';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatHours(hours) {
  const safe = Number(hours) || 0;
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  return `${h}h ${m}m`;
}

function StatusBadge({ status }) {
  const cls =
    status === 'present'
      ? 'badge-won'
      : status === 'half-day'
        ? 'badge-follow-up'
        : 'badge-lost';
  const label = status === 'half-day' ? 'Half Day' : status === 'present' ? 'Present' : 'Absent';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export default function AttendanceHistoryTable({
  records,
  loading,
  page,
  pages,
  total,
  isAdmin,
  onPageChange,
}) {
  if (loading) {
    return <div className="attendance-loading app-card">Loading attendance history…</div>;
  }

  if (!records.length) {
    return (
      <div className="app-card empty-state">
        <p className="muted-text">No attendance records found for this period.</p>
      </div>
    );
  }

  return (
    <div className="app-card app-card--table attendance-history-card">
      <div className="attendance-table-header">
        <h3>Attendance History</h3>
        <span className="muted-text">{total} record{total !== 1 ? 's' : ''}</span>
      </div>
      <div className="app-table-wrap">
        <table className="app-table attendance-table">
          <thead>
            <tr>
              <th>Date</th>
              {isAdmin && <th>Employee</th>}
              <th>Clock In</th>
              <th>Clock Out</th>
              <th>Total Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r._id}>
                <td>{formatDate(r.date)}</td>
                {isAdmin && <td>{r.user?.name || '—'}</td>}
                <td>{formatTime(r.clockIn)}</td>
                <td>{formatTime(r.clockOut)}</td>
                <td>{formatHours(r.totalHours)}</td>
                <td><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Prev
          </button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}
