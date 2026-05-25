import Activity from '../models/Activity.js';

export const logActivity = async ({
  leadId,
  userId,
  type,
  description,
  metadata = {},
}) => {
  try {
    await Activity.create({
      lead: leadId || null,
      user: userId,
      type,
      description,
      metadata,
    });
  } catch (err) {
    console.error('Activity log failed:', err.message);
  }
};
