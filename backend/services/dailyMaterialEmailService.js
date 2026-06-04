import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import {
  buildDailyMaterialHtml,
  buildDailyMaterialSubject,
  buildDailyMaterialText,
} from './dailyMaterialEmailTemplate.js';
import { materialDiskPath } from '../utils/materialUpload.js';
import { logMaterialEmail } from '../utils/emailLogger.js';

function smtpUser() {
  return process.env.SMTP_USER || process.env.EMAIL_USER;
}

function smtpPass() {
  return process.env.SMTP_PASS || process.env.EMAIL_PASS;
}

function smtpFrom() {
  return process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser();
}

function createTransporter() {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) {
    throw new Error('SMTP credentials missing (SMTP_USER/SMTP_PASS or EMAIL_USER/EMAIL_PASS)');
  }

  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE) === 'true'
      : port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Send one daily material email to a marketing recipient. Logs success/failure to EmailLog.
 */
export async function sendDailyMaterialToRecipient({ recipient, material }) {
  const to = String(recipient?.email || '').trim();
  if (!to) {
    throw new Error('Recipient email is missing');
  }

  const pdfPath = materialDiskPath(material.pdfUrl);
  if (!pdfPath || !fs.existsSync(pdfPath)) {
    throw new Error(`PDF file not found for material: ${material.title}`);
  }

  const subject = buildDailyMaterialSubject(material.title);
  const leadName = recipient.name || 'there';
  const templatePayload = {
    leadName,
    title: material.title,
    description: material.description,
  };

  const attachmentFilename = path.basename(pdfPath);
  const attachments = [
    {
      filename: attachmentFilename,
      path: pdfPath,
      contentType: 'application/pdf',
    },
  ];

  const transporter = createTransporter();
  const from = smtpFrom();

  try {
    const info = await transporter.sendMail({
      from: `Mentors Daily <${from}>`,
      to,
      subject,
      text: buildDailyMaterialText(templatePayload),
      html: buildDailyMaterialHtml(templatePayload),
      attachments,
    });

    await logMaterialEmail({
      marketingRecipientId: recipient._id,
      recipientName: recipient.name,
      email: to,
      materialId: material._id,
      subject,
      status: 'sent',
    });

    return info;
  } catch (err) {
    await logMaterialEmail({
      marketingRecipientId: recipient._id,
      recipientName: recipient.name,
      email: to,
      materialId: material._id,
      subject,
      status: 'failed',
      errorMessage: err.message,
    });
    throw err;
  }
}
