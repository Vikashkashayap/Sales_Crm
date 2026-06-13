export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'DNP',
  'Follow-up',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Reject',
  'Lost',
  'Converted',
];

export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const STATUS_COLORS = {
  New: '#2563EB',
  Contacted: '#7C3AED',
  Interested: '#0891B2',
  Qualified: '#4F46E5',
  'Proposal Sent': '#0D9488',
  Negotiation: '#D97706',
  Reject: '#991B1B',
  Converted: '#16A34A',
  Lost: '#6B7280',
  'Follow-up': '#EA580C',
  DNP: '#DC2626',
};

export const getStatusColor = (status) => STATUS_COLORS[status] || 'inherit';

export const getStatusSelectStyle = (status) => {
  const color = STATUS_COLORS[status];
  if (!color) return {};
  return {
    backgroundColor: color,
    borderColor: color,
    color: '#FFFFFF',
    fontWeight: 600,
  };
};

export const KANBAN_COLUMNS = [
  'New',
  'Contacted',
  'Interested',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Converted',
  'Lost',
];

export const statusBadgeClass = (s) => {
  const v = (s || 'New').toLowerCase().replace(/\s+/g, '-');
  if (v === 'follow-up') return 'badge-follow-up';
  if (v === 'proposal-sent') return 'badge-proposal';
  if (v === 'won' || v === 'converted') return 'badge-won';
  if (v === 'reject') return 'badge-reject';
  if (v === 'dnp') return 'badge-dnp';
  return `badge-${v}`;
};

export const priorityBadgeClass = (p) => {
  const v = (p || 'medium').toLowerCase();
  return `badge-priority-${v}`;
};
