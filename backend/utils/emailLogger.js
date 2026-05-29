import EmailLog from '../models/EmailLog.js';

export async function logEmail({
  studentId,
  studentName,
  email,
  emailType,
  medium = '',
  attachmentsSent = [],
  status,
  error = '',
}) {
  try {
    await EmailLog.create({
      studentId: studentId || undefined,
      studentName: studentName || '',
      email: email || '',
      emailType,
      medium,
      attachmentsSent,
      status,
      error: error || '',
      sentAt: new Date(),
    });
  } catch (err) {
    console.error('[email-log] Failed to persist log:', err.message);
  }
}
