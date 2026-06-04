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

/** Persist daily material campaign email outcome. */
export async function logMaterialEmail({
  leadId,
  marketingRecipientId,
  recipientName = '',
  email,
  materialId,
  subject,
  status,
  errorMessage = '',
}) {
  try {
    await EmailLog.create({
      leadId: leadId || undefined,
      marketingRecipientId: marketingRecipientId || undefined,
      studentName: recipientName || '',
      materialId: materialId || undefined,
      email: email || '',
      emailType: 'daily_material',
      subject: subject || '',
      status,
      error: errorMessage || '',
      sentAt: new Date(),
    });
  } catch (err) {
    console.error('[email-log] Failed to persist material log:', err.message);
  }
}
