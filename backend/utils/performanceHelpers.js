const CONTACTED_STATUSES = [
  'Contacted',
  'Interested',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Converted',
  'Won',
  'Follow-up',
  'Lost',
];

export const CONVERTED_STATUSES = ['Converted', 'Won'];

export const isContactedStatus = (status) => CONTACTED_STATUSES.includes(status);

export const formatPeriodLabel = (start, end, period) => {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const s = start.toLocaleDateString('en-IN', opts);
  const e = end.toLocaleDateString('en-IN', opts);
  if (period === 'this_month' || period === 'last_month') {
    return start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }
  return `Week of ${s} – ${e}`;
};

const startOfMondayWeek = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getPerformancePeriodRange = (period, customStart, customEnd) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (period) {
    case 'last_week': {
      const thisMonday = startOfMondayWeek(now);
      const start = new Date(thisMonday);
      start.setDate(start.getDate() - 7);
      const weekEnd = new Date(thisMonday);
      weekEnd.setMilliseconds(-1);
      return { start, end: weekEnd };
    }
    case 'biweekly': {
      const start = new Date(now);
      start.setDate(start.getDate() - 13);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start, end: monthEnd };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : startOfMondayWeek(now);
      const customEnd = customEnd ? new Date(customEnd) : end;
      start.setHours(0, 0, 0, 0);
      customEnd.setHours(23, 59, 59, 999);
      return { start, end: customEnd };
    }
    case 'this_week':
    default: {
      const start = startOfMondayWeek(now);
      return { start, end };
    }
  }
};

export const inDateRange = (date, start, end) => {
  if (!date) return false;
  const d = new Date(date);
  return d >= start && d <= end;
};

export const formatCompactINR = (amount) => {
  const n = Math.round(Number(amount) || 0);
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`.replace(/\.00L$/, 'L');
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n.toLocaleString('en-IN')}`;
};
