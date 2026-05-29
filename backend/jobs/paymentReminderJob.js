import cron from 'node-cron';
import Student from '../models/Student.js';
import { getAppSettings } from '../models/Settings.js';
import { ensureStudentInstallments } from '../utils/paymentHelpers.js';
import { getStudentMedium } from '../utils/welcomeKitAttachments.js';
import { sendPaymentReminderEmail } from '../services/emailService.js';
import { logReminder, wasReminderSent } from '../utils/reminderLogger.js';

const TIMEZONE = process.env.PAYMENT_REMINDER_TIMEZONE || 'Asia/Kolkata';

function parseReminderSchedule() {
  const timeStr = String(process.env.PAYMENT_REMINDER_TIME || '').trim();
  if (timeStr.includes(':')) {
    const [h, m] = timeStr.split(':').map((v) => Number(v));
    if (Number.isFinite(h) && Number.isFinite(m)) {
      return { hour: h, minute: m };
    }
  }

  const hourRaw = process.env.PAYMENT_REMINDER_HOUR;
  const hour =
    typeof hourRaw === 'string' && hourRaw.includes(':')
      ? Number(hourRaw.split(':')[0])
      : Number(hourRaw);
  const minute = Number(process.env.PAYMENT_REMINDER_MINUTE ?? 0);

  return {
    hour: Number.isFinite(hour) ? hour : 10,
    minute: Number.isFinite(minute) ? minute : 0,
  };
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dayDiff(fromDate, toDate) {
  const from = startOfDay(fromDate).getTime();
  const to = startOfDay(toDate).getTime();
  return Math.round((to - from) / 86400000);
}

function getInstallmentId(studentId, inst) {
  if (inst?._id) return String(inst._id);
  return `${studentId}_${inst?.number || 0}`;
}

/**
 * Determines which reminder type applies for an installment on the given run date.
 * @returns {'reminder'|'due_today'|'overdue'|null}
 */
export function getReminderTypeForInstallment(dueDate, today, daysBefore) {
  const daysUntilDue = dayDiff(today, dueDate);
  if (daysUntilDue === daysBefore) return 'reminder';
  if (daysUntilDue === 0) return 'due_today';
  if (daysUntilDue === -1) return 'overdue';
  return null;
}

export async function runPaymentReminders({ triggeredBy = 'cron' } = {}) {
  const settings = await getAppSettings();

  if (!settings.paymentRemindersEnabled) {
    console.log(`[payment-reminder] Skipped (${triggeredBy}) — reminders disabled in settings`);
    return { skipped: true, reason: 'disabled', sent: 0, failed: 0, skippedCount: 0 };
  }

  const daysBefore = Math.max(0, Number(settings.reminderDaysBeforeDue ?? 3));
  const today = startOfDay(new Date());

  const students = await Student.find({
    email: { $exists: true, $nin: [null, ''] },
    status: { $ne: 'Dropped' },
    finalFee: { $gt: 0 },
  }).lean();

  let sent = 0;
  let failed = 0;
  let skippedCount = 0;

  console.log(
    `[payment-reminder] Run started (${triggeredBy}) — ${students.length} students, daysBefore=${daysBefore}`
  );

  for (const student of students) {
    const email = String(student.email || '').trim();
    if (!email) continue;

    const doc = ensureStudentInstallments(student);
    const medium = getStudentMedium(doc);
    const balanceDue = Math.max(0, (Number(doc.finalFee) || 0) - (Number(doc.amountPaid) || 0));

    for (const inst of doc.installments || []) {
      if (inst.status === 'Paid') continue;

      const amountDue = Math.max(0, (Number(inst.amount) || 0) - (Number(inst.paidAmount) || 0));
      if (amountDue <= 0) continue;

      const type = getReminderTypeForInstallment(inst.dueDate, today, daysBefore);
      if (!type) continue;

      const installmentId = getInstallmentId(student._id, inst);

      if (await wasReminderSent({ studentId: student._id, installmentNumber: inst.number, type })) {
        skippedCount += 1;
        continue;
      }

      try {
        await sendPaymentReminderEmail({
          student: doc,
          installment: inst,
          type,
          amountDue,
          balanceDue,
          medium,
          daysBefore,
        });

        await logReminder({
          studentId: student._id,
          installmentId,
          installmentNumber: inst.number,
          type,
          email,
          status: 'sent',
          dueDate: inst.dueDate,
        });

        sent += 1;
        console.log(
          `[payment-reminder] Sent ${type} to ${email} — installment #${inst.number}`
        );
      } catch (err) {
        await logReminder({
          studentId: student._id,
          installmentId,
          installmentNumber: inst.number,
          type,
          email,
          status: 'failed',
          error: err.message,
          dueDate: inst.dueDate,
        });

        failed += 1;
        console.error(
          `[payment-reminder] Failed ${type} for ${email} installment #${inst.number}:`,
          err.message
        );
      }
    }
  }

  console.log(
    `[payment-reminder] Run finished (${triggeredBy}) — sent=${sent}, failed=${failed}, skipped=${skippedCount}`
  );

  return { skipped: false, sent, failed, skippedCount };
}

let scheduledTask = null;

export function startPaymentReminderJob() {
  if (process.env.PAYMENT_REMINDERS === 'false') {
    console.log('[payment-reminder] Job not started — PAYMENT_REMINDERS=false');
    return null;
  }

  const { hour, minute } = parseReminderSchedule();
  const cronExpr = `${minute} ${hour} * * *`;

  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(
    cronExpr,
    () => {
      runPaymentReminders({ triggeredBy: 'cron' }).catch((err) => {
        console.error('[payment-reminder] Unhandled job error:', err.message);
      });
    },
    { timezone: TIMEZONE }
  );

  console.log(
    `[payment-reminder] Scheduled daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} (${TIMEZONE})`
  );

  return scheduledTask;
}

export function stopPaymentReminderJob() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
  }
}
