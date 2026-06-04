import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import { buildWelcomeKitAttachments, getStudentMedium } from '../utils/welcomeKitAttachments.js';
import { buildWelcomeReceiptAttachment } from '../utils/welcomeReceiptAttachment.js';
import {
  buildWelcomeEmailHtml,
  buildWelcomeEmailSubject,
  buildWelcomeEmailText,
} from './welcomeEmailTemplate.js';
import {
  buildPaymentReminderEmailHtml,
  buildPaymentReminderEmailSubject,
  buildPaymentReminderEmailText,
} from './paymentReminderEmailTemplate.js';
import {
  buildBdaConfirmationEmailHtml,
  buildBdaConfirmationEmailSubject,
  buildBdaConfirmationEmailText,
} from './bdaConfirmationEmailTemplate.js';
import { logEmail } from '../utils/emailLogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WELCOME_LOGO_CID = 'mentorsdaily-logo@welcome';
const REMINDER_LOGO_CID = 'mentorsdaily-logo@reminder';

function getWelcomeLogoPath() {
  const candidates = [
    path.join(__dirname, '..', 'assets', 'mentors-daily-logo.png'),
    path.join(process.cwd(), 'backend', 'assets', 'mentors-daily-logo.png'),
  ];
  return (
    candidates.find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    }) || null
  );
}

const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env ${key}`);
  return v;
};

export function buildReceiptEmailHtml({ studentName, amountPaid }) {
  const name = studentName || 'Student';
  const amt = Number(amountPaid || 0).toLocaleString('en-IN');
  return `
  <div style="font-family:Arial,Helvetica,sans-serif; background:#f8fafc; padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#0ea5e9;color:#ffffff;padding:18px 22px;">
        <div style="font-size:18px;font-weight:700;">Mentors Daily</div>
        <div style="font-size:13px;opacity:0.95;">Fee Payment Receipt</div>
      </div>
      <div style="padding:20px 22px;color:#0f172a;">
        <p style="margin:0 0 12px;">Hi <strong>${name}</strong>,</p>
        <p style="margin:0 0 12px;">
          Your fee payment was successful. We have attached your receipt PDF for your records.
        </p>
        <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:12px 14px;margin:14px 0;">
          <div style="font-size:13px;color:#334155;">Amount Paid</div>
          <div style="font-size:20px;font-weight:800;margin-top:4px;">₹${amt}</div>
        </div>
        <p style="margin:0 0 6px;color:#334155;font-size:13px;">
          If you have any questions, reply to this email or contact our support.
        </p>
        <p style="margin:0;color:#64748b;font-size:12px;">
          Thank you,<br/>Mentors Daily Team
        </p>
      </div>
      <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;">
        This is an automated email. Please keep the attached receipt for future reference.
      </div>
    </div>
  </div>
  `.trim();
}

function createTransporter() {
  const user = required('EMAIL_USER');
  const pass = required('EMAIL_PASS');

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
  });
}

export async function sendReceiptEmail({
  to,
  studentName,
  amountPaid,
  pdfPath,
  receiptNumber,
  extraAttachments = [],
  student = null,
}) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const attachments = [
    {
      filename: `Receipt-${receiptNumber}.pdf`,
      path: pdfPath,
      contentType: 'application/pdf',
    },
    ...extraAttachments,
  ];

  const attachmentNames = attachments.map((a) => a.filename);

  try {
    const info = await transporter.sendMail({
      from: `Mentors Daily <${from}>`,
      to,
      subject: 'Fee Payment Receipt - Mentors Daily',
      html: buildReceiptEmailHtml({ studentName, amountPaid }),
      attachments,
    });

    if (student?._id) {
      await logEmail({
        studentId: student._id,
        studentName: student.fullName,
        email: to,
        emailType: 'receipt',
        medium: getStudentMedium(student),
        attachmentsSent: attachmentNames,
        status: 'sent',
      });
    }

    return info;
  } catch (err) {
    if (student?._id) {
      await logEmail({
        studentId: student._id,
        studentName: student.fullName,
        email: to,
        emailType: 'receipt',
        medium: getStudentMedium(student),
        attachmentsSent: attachmentNames,
        status: 'failed',
        error: err.message,
      });
    }
    throw err;
  }
}

export async function sendWelcomeEmail(student, options = {}) {
  const to = student?.email?.trim();
  if (!to) {
    throw new Error('Student email is missing');
  }

  const medium = getStudentMedium(student);
  const logoPath = getWelcomeLogoPath();
  const logoCid = logoPath ? WELCOME_LOGO_CID : null;
  const html = buildWelcomeEmailHtml(student, { logoCid });
  const text = buildWelcomeEmailText(student);
  const subject = buildWelcomeEmailSubject(student);

  const { attachments: kitAttachments, missing, foundPdfs } = buildWelcomeKitAttachments(medium);
  if (missing.length) {
    console.warn(
      `[welcome-email] Missing PDFs for ${medium} (${missing.length}):`,
      missing.join(', ')
    );
  }
  console.log('[welcome-email] Found PDFs:', foundPdfs);

  let receiptAttachment = null;
  let receiptNumber = null;
  try {
    const receipt = await buildWelcomeReceiptAttachment(student, options);
    receiptAttachment = receipt.attachment;
    receiptNumber = receipt.receiptNumber;
    if (receipt.generated) {
      console.log('[welcome-email] Generated fee receipt:', receiptNumber);
    }
  } catch (err) {
    console.error('[welcome-email] Fee receipt generation failed:', err.message);
  }

  const attachments = [
    ...(logoPath
      ? [{ filename: 'mentors-daily-logo.png', path: logoPath, cid: WELCOME_LOGO_CID }]
      : []),
    ...(receiptAttachment ? [receiptAttachment] : []),
    ...kitAttachments,
  ];

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const attachmentNames = attachments.map((a) => a.filename);

  try {
    const info = await transporter.sendMail({
      from: `Mentors Daily <${from}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });

    await logEmail({
      studentId: student._id,
      studentName: student.fullName,
      email: to,
      emailType: 'welcome',
      medium,
      attachmentsSent: attachmentNames,
      status: 'sent',
    });

    return {
      info,
      medium,
      attachmentCount: attachments.length,
      missingAttachments: missing,
      receiptAttached: Boolean(receiptAttachment),
      receiptNumber,
    };
  } catch (err) {
    await logEmail({
      studentId: student._id,
      studentName: student.fullName,
      email: to,
      emailType: 'welcome',
      medium,
      attachmentsSent: attachmentNames,
      status: 'failed',
      error: err.message,
    });
    throw err;
  }
}

/** BDA who sold / owns the registration (assigned BDA, else who registered). */
export function resolveSellingBda(student) {
  const pick = (user) => {
    if (!user || typeof user !== 'object') return null;
    const email = String(user.email || '').trim();
    if (!email) return null;
    return { name: String(user.name || '').trim() || 'Team member', email };
  };
  return pick(student?.assignedBda) || pick(student?.registeredBy);
}

export async function sendBdaSaleConfirmationEmail(student, { studentEmail, receiptAttached = false } = {}) {
  const bda = resolveSellingBda(student);
  if (!bda?.email) {
    return { sent: false, reason: 'no_bda_email' };
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const subject = buildBdaConfirmationEmailSubject(student);
  const payload = {
    bdaName: bda.name,
    student,
    studentEmail: studentEmail || student?.email?.trim() || '',
    receiptAttached,
  };

  try {
    const info = await transporter.sendMail({
      from: `Mentors Daily <${from}>`,
      to: bda.email,
      subject,
      text: buildBdaConfirmationEmailText(payload),
      html: buildBdaConfirmationEmailHtml(payload),
    });

    await logEmail({
      studentId: student._id,
      studentName: student.fullName,
      email: bda.email,
      emailType: 'bda_confirmation',
      status: 'sent',
    });

    return { sent: true, to: bda.email, info };
  } catch (err) {
    await logEmail({
      studentId: student._id,
      studentName: student.fullName,
      email: bda.email,
      emailType: 'bda_confirmation',
      status: 'failed',
      error: err.message,
    });
    console.error('[bda-confirmation-email] Failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

export async function sendPaymentReminderEmail({
  student,
  installment,
  type,
  amountDue,
  balanceDue,
  medium = 'English',
  daysBefore = 3,
}) {
  const to = student?.email?.trim();
  if (!to) {
    throw new Error('Student email is missing');
  }

  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const logoPath = getWelcomeLogoPath();
  const logoCid = logoPath ? REMINDER_LOGO_CID : null;

  const templatePayload = {
    student,
    installment,
    type,
    amountDue,
    balanceDue,
    medium,
    daysBefore,
    logoCid,
  };

  const attachments = logoPath
    ? [{ filename: 'mentors-daily-logo.png', path: logoPath, cid: REMINDER_LOGO_CID }]
    : [];

  const info = await transporter.sendMail({
    from: `Mentors Daily <${from}>`,
    to,
    subject: buildPaymentReminderEmailSubject({ installment, type, medium }),
    text: buildPaymentReminderEmailText(templatePayload),
    html: buildPaymentReminderEmailHtml(templatePayload),
    attachments,
  });

  return info;
}
