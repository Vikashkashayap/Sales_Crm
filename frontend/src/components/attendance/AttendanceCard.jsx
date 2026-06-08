import React from 'react';

function formatTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatHours(hours) {
  const safe = Number(hours) || 0;
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  return `${h}h ${m}m`;
}

export default function AttendanceCard({
  today,
  loading,
  actionLoading,
  onCheckIn,
  onCheckOut,
}) {
  const record = today?.record;
  const clockedIn = today?.clockedIn;
  const clockedOut = today?.clockedOut;
  const liveHours = today?.liveHours || 0;

  const statusLabel = !clockedIn
    ? 'Not Clocked In'
    : clockedOut
      ? 'Shift Completed'
      : 'Currently Working';

  const statusClass = !clockedIn
    ? 'attendance-status--absent'
    : clockedOut
      ? 'attendance-status--done'
      : 'attendance-status--present';

  return (
    <div className="app-card attendance-card">
      <div className="attendance-card-header">
        <div>
          <h2 className="attendance-card-title">Today&apos;s Attendance</h2>
          <p className="muted-text attendance-card-date">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <span className={`attendance-status-badge ${statusClass}`}>{statusLabel}</span>
      </div>

      {loading ? (
        <div className="attendance-loading">Loading today&apos;s status…</div>
      ) : (
        <>
          <div className="attendance-stats-row">
            <div className="attendance-stat">
              <span className="muted-text">Clock In</span>
              <strong>{formatTime(record?.clockIn)}</strong>
            </div>
            <div className="attendance-stat">
              <span className="muted-text">Clock Out</span>
              <strong>{formatTime(record?.clockOut)}</strong>
            </div>
            <div className="attendance-stat">
              <span className="muted-text">Working Hours</span>
              <strong className="attendance-hours-value">{formatHours(liveHours)}</strong>
            </div>
          </div>

          <div className="attendance-actions">
            <button
              type="button"
              className="app-btn app-btn-primary attendance-btn-checkin"
              disabled={clockedIn || actionLoading}
              onClick={onCheckIn}
            >
              {actionLoading ? 'Processing…' : 'Clock In'}
            </button>
            <button
              type="button"
              className="app-btn attendance-btn-checkout"
              disabled={!clockedIn || clockedOut || actionLoading}
              onClick={onCheckOut}
            >
              {actionLoading ? 'Processing…' : 'Clock Out'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
