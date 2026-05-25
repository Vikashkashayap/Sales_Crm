export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Converted',
  'Lost',
  'Follow-up',
  'Won',
];

export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

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
  return `badge-${v}`;
};

export const priorityBadgeClass = (p) => {
  const v = (p || 'medium').toLowerCase();
  return `badge-priority-${v}`;
};
