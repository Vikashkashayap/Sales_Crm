import nodemailer from 'nodemailer';

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

  // Works for Gmail + Google Workspace accounts using an app password.
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
}) {
  const transporter = createTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;

  const info = await transporter.sendMail({
    from: `Mentors Daily <${from}>`,
    to,
    subject: 'Fee Payment Receipt - Mentors Daily',
    html: buildReceiptEmailHtml({ studentName, amountPaid }),
    attachments: [
      {
        filename: `Receipt-${receiptNumber}.pdf`,
        path: pdfPath,
        contentType: 'application/pdf',
      },
    ],
  });

  return info;
}

