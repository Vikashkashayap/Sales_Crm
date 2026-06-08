import { startOfDay } from './dateHelpers.js';

export function normalizeAttendanceDate(date = new Date()) {
  return startOfDay(date);
}

export function calculateTotalHours(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const ms = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export function formatHoursDisplay(hours) {
  const safe = Number(hours) || 0;
  if (safe <= 0) return '0h 0m';
  const h = Math.floor(safe);
  const m = Math.round((safe - h) * 60);
  return `${h}h ${m}m`;
}

export function formatTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateDisplay(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getMonthRange(year, month) {
  const y = Number(year);
  const m = Number(month);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

export function deriveStatus(totalHours) {
  if (totalHours >= 4) return 'present';
  if (totalHours > 0) return 'half-day';
  return 'absent';
}

export function buildUserFilter(user, queryUserId) {
  if (user.role === 'admin') {
    return queryUserId ? { user: queryUserId } : {};
  }
  return { user: user._id };
}
