import ReminderLog from '../models/ReminderLog.js';

export async function logReminder({
  studentId,
  installmentId,
  installmentNumber,
  type,
  email,
  status,
  error = '',
  dueDate = null,
}) {
  try {
    await ReminderLog.create({
      studentId,
      installmentId,
      installmentNumber,
      type,
      email,
      status,
      error: error || '',
      sentAt: new Date(),
      dueDate,
    });
  } catch (err) {
    if (err.code === 11000) {
      return;
    }
    console.error('[reminder-log] Failed to persist log:', err.message);
  }
}

export async function wasReminderSent({ studentId, installmentNumber, type }) {
  const existing = await ReminderLog.findOne({ studentId, installmentNumber, type }).select('_id').lean();
  return Boolean(existing);
}
