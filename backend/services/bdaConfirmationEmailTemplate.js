const fmtInr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN')}`;

export function buildBdaConfirmationEmailSubject(student) {
  const name = student?.fullName?.trim() || 'Student';
  return `Registration confirmed — Welcome email sent to ${name}`;
}

export function buildBdaConfirmationEmailHtml({ bdaName, student, studentEmail, receiptAttached }) {
  const name = student?.fullName?.trim() || 'Student';
  const code = student?.studentCode || '—';
  const program = student?.programName?.trim() || '—';
  const finalFee = fmtInr(student?.finalFee);
  const paid = fmtInr(student?.amountPaid);
  const receiptLine = receiptAttached
    ? '<li>Fee invoice PDF was attached to the student welcome email.</li>'
    : '';

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#059669;color:#ffffff;padding:18px 22px;">
        <div style="font-size:18px;font-weight:700;">Mentors Daily — Sales CRM</div>
        <div style="font-size:13px;opacity:0.95;">Student registration confirmation</div>
      </div>
      <div style="padding:20px 22px;color:#0f172a;">
        <p style="margin:0 0 12px;">Hi <strong>${bdaName}</strong>,</p>
        <p style="margin:0 0 12px;">
          Your student registration is complete. The <strong>welcome kit email has been sent</strong> to the student.
        </p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:14px 0;">
          <div style="font-size:13px;color:#166534;font-weight:700;margin-bottom:8px;">Email delivered to student</div>
          <div style="font-size:14px;color:#14532d;">${studentEmail}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#64748b;">Student</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Student ID</td><td style="padding:6px 0;">${code}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Program</td><td style="padding:6px 0;">${program}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Final fee</td><td style="padding:6px 0;">${finalFee}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;">Paid at registration</td><td style="padding:6px 0;">${paid}</td></tr>
        </table>
        <ul style="margin:0;padding-left:20px;color:#334155;font-size:13px;">
          <li>Welcome email with onboarding documents was sent successfully.</li>
          ${receiptLine}
        </ul>
        <p style="margin:16px 0 0;color:#64748b;font-size:12px;">
          You can view this student in the Admissions section of the CRM.
        </p>
      </div>
      <div style="padding:14px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;">
        This is an automated confirmation from Mentors Daily CRM.
      </div>
    </div>
  </div>
  `.trim();
}

export function buildBdaConfirmationEmailText({ bdaName, student, studentEmail, receiptAttached }) {
  const name = student?.fullName?.trim() || 'Student';
  const code = student?.studentCode || '—';
  const program = student?.programName?.trim() || '—';
  const receiptNote = receiptAttached ? '\n- Fee invoice was attached to the student email.' : '';

  return `Hi ${bdaName},

Your student registration is complete. The welcome kit email has been sent to the student.

Student email: ${studentEmail}

Student: ${name}
Student ID: ${code}
Program: ${program}
Final fee: ${fmtInr(student?.finalFee)}
Paid at registration: ${fmtInr(student?.amountPaid)}
${receiptNote}

View this student in Admissions in the CRM.

— Mentors Daily CRM`;
}
