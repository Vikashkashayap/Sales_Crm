export const LEAD_STATUSES = [
  'New',
  'Contacted',
  'Interested',
  'Qualified',
  'Proposal Sent',
  'Negotiation',
  'Converted',
  'Lost',
  // Legacy — kept for existing records
  'Follow-up',
  'Won',
];

export const LEAD_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const ACTIVITY_TYPES = [
  'lead_created',
  'lead_updated',
  'lead_assigned',
  'status_changed',
  'note_added',
  'followup_scheduled',
  'followup_completed',
  'document_uploaded',
  'lead_deleted',
];

export const NOTIFICATION_TYPES = [
  'lead_assigned',
  'followup_reminder',
  'followup_missed',
  'task_due',
  'system',
];
