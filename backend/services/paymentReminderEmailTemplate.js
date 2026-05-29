const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtInr = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildCourseLabel(student) {
  const program = String(student?.programName || '').trim();
  const year = String(student?.targetYear || '').trim();
  const courseType = String(student?.courseType || '').trim();
  const parts = [];
  if (courseType) parts.push(courseType);
  if (program) parts.push(program);
  if (year && !program.includes(year)) parts.push(year);
  return parts.join(' — ') || 'Your enrolled course';
}

function wrapEmailHtml(bodyHtml, headerTitle, { logoCid = null } = {}) {
  const logoHtml = logoCid
    ? `<img src="cid:${logoCid}" alt="MentorsDaily" height="52" style="height:52px;width:auto;display:block;margin:0 0 12px;border:0;outline:none;" />`
    : `<div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:10px;">MentorsDaily</div>`;

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
      <div style="background:#ffffff;padding:22px 22px 16px;border-bottom:1px solid #e2e8f0;">
        ${logoHtml}
        <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(headerTitle)}</div>
      </div>
      <div style="padding:20px 22px;color:#0f172a;background:#ffffff;">
        ${bodyHtml}
        <p style="margin:16px 0 0;color:#64748b;font-size:12px;">
          Thank you,<br/>Mentors Daily Team<br/>
          <a href="mailto:services@mentorsdaily.com" style="color:#334155;text-decoration:underline;">services@mentorsdaily.com</a>
        </p>
      </div>
      <div style="padding:14px 22px;background:#ffffff;border-top:1px solid #e2e8f0;color:#64748b;font-size:11px;">
        This is an automated payment reminder. Please ignore if you have already paid.
      </div>
    </div>
  </div>`.trim();
}

function buildDetailsTableHtml(rows) {
  const items = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;width:42%;">${esc(label)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:600;">${esc(value)}</td>
      </tr>`
    )
    .join('');
  return `<table style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;margin:14px 0;">${items}</table>`;
}

function buildEnglishContent({ studentName, course, installmentNumber, amountDue, dueDate, balanceDue, type, daysBefore }) {
  const name = esc(studentName || 'Student');
  const dueStr = formatDate(dueDate);

  let intro = '';
  if (type === 'reminder') {
    intro = `This is a friendly reminder that your installment payment is due in <strong>${daysBefore} day${daysBefore === 1 ? '' : 's'}</strong>.`;
  } else if (type === 'due_today') {
    intro = 'This is a reminder that your installment payment is <strong>due today</strong>.';
  } else {
    intro = 'Our records show that your installment payment is <strong>overdue by 1 day</strong>. Please complete the payment at the earliest.';
  }

  const bodyHtml = `
    <p style="margin:0 0 12px;">Dear <strong>${name}</strong>,</p>
    <p style="margin:0 0 12px;">${intro}</p>
    ${buildDetailsTableHtml([
      ['Course', course],
      ['Installment', String(installmentNumber)],
      ['Amount Due', fmtInr(amountDue)],
      ['Due Date', dueStr],
      ['Remaining Balance', fmtInr(balanceDue)],
    ])}
    <p style="margin:0 0 12px;color:#334155;font-size:13px;">
      If you have already paid, please share the transaction details with us so we can update your records.
    </p>`;

  return bodyHtml;
}

function buildHindiContent({ studentName, course, installmentNumber, amountDue, dueDate, balanceDue, type, daysBefore }) {
  const name = esc(studentName || 'Student');
  const dueStr = formatDate(dueDate);

  let intro = '';
  if (type === 'reminder') {
    intro = `यह एक अनुस्मारक है कि आपकी किस्त <strong>${daysBefore} दिन${daysBefore === 1 ? '' : 'ों'}</strong> में देय है।`;
  } else if (type === 'due_today') {
    intro = 'यह अनुस्मारक है कि आपकी किस्त की <strong>अंतिम तिथि आज</strong> है।';
  } else {
    intro = 'हमारे रिकॉर्ड के अनुसार आपकी किस्त <strong>1 दिन से अतिदेय</strong> है। कृपया शीघ्र भुगतान करें।';
  }

  const bodyHtml = `
    <p style="margin:0 0 12px;">प्रिय <strong>${name}</strong>,</p>
    <p style="margin:0 0 12px;">${intro}</p>
    ${buildDetailsTableHtml([
      ['कोर्स', course],
      ['किस्त', String(installmentNumber)],
      ['देय राशि', fmtInr(amountDue)],
      ['देय तिथि', dueStr],
      ['शेष राशि', fmtInr(balanceDue)],
    ])}
    <p style="margin:0 0 12px;color:#334155;font-size:13px;">
      यदि आपने पहले ही भुगतान कर दिया है, तो कृपया लेन-देन का विवरण हमें भेजें ताकि हम आपके रिकॉर्ड अपडेट कर सकें।
    </p>`;

  return bodyHtml;
}

const HEADER_TITLES = {
  English: {
    reminder: 'Payment Reminder',
    due_today: 'Payment Due Today',
    overdue: 'Payment Overdue',
  },
  Hindi: {
    reminder: 'भुगतान अनुस्मारक',
    due_today: 'आज भुगतान देय',
    overdue: 'अतिदेय भुगतान',
  },
};

export function buildPaymentReminderEmailHtml({
  student,
  installment,
  type,
  amountDue,
  balanceDue,
  medium = 'English',
  daysBefore = 3,
  logoCid = null,
}) {
  const lang = medium === 'Hindi' ? 'Hindi' : 'English';
  const course = buildCourseLabel(student);
  const payload = {
    studentName: student?.fullName,
    course,
    installmentNumber: installment?.number,
    amountDue,
    dueDate: installment?.dueDate,
    balanceDue,
    type,
    daysBefore,
  };

  const bodyHtml =
    lang === 'Hindi' ? buildHindiContent(payload) : buildEnglishContent(payload);
  const headerTitle = HEADER_TITLES[lang][type] || HEADER_TITLES.English[type];
  return wrapEmailHtml(bodyHtml, headerTitle, { logoCid });
}

export function buildPaymentReminderEmailText({
  student,
  installment,
  type,
  amountDue,
  balanceDue,
  medium = 'English',
  daysBefore = 3,
}) {
  const lang = medium === 'Hindi' ? 'Hindi' : 'English';
  const name = student?.fullName || 'Student';
  const course = buildCourseLabel(student);
  const dueStr = formatDate(installment?.dueDate);
  const lines = [];

  if (lang === 'Hindi') {
    if (type === 'reminder') {
      lines.push(`प्रिय ${name},`);
      lines.push(`यह अनुस्मारक है कि आपकी किस्त ${daysBefore} दिन में देय है।`);
    } else if (type === 'due_today') {
      lines.push(`प्रिय ${name},`);
      lines.push('आज आपकी किस्त की अंतिम तिथि है।');
    } else {
      lines.push(`प्रिय ${name},`);
      lines.push('आपकी किस्त 1 दिन से अतिदेय है।');
    }
    lines.push('');
    lines.push(`कोर्स: ${course}`);
    lines.push(`किस्त: ${installment?.number}`);
    lines.push(`देय राशि: ${fmtInr(amountDue)}`);
    lines.push(`देय तिथि: ${dueStr}`);
    lines.push(`शेष राशि: ${fmtInr(balanceDue)}`);
  } else {
    if (type === 'reminder') {
      lines.push(`Dear ${name},`);
      lines.push(`This is a reminder that your installment is due in ${daysBefore} day(s).`);
    } else if (type === 'due_today') {
      lines.push(`Dear ${name},`);
      lines.push('Your installment payment is due today.');
    } else {
      lines.push(`Dear ${name},`);
      lines.push('Your installment payment is overdue by 1 day.');
    }
    lines.push('');
    lines.push(`Course: ${course}`);
    lines.push(`Installment: ${installment?.number}`);
    lines.push(`Amount Due: ${fmtInr(amountDue)}`);
    lines.push(`Due Date: ${dueStr}`);
    lines.push(`Remaining Balance: ${fmtInr(balanceDue)}`);
  }

  lines.push('');
  lines.push('Mentors Daily');
  lines.push('services@mentorsdaily.com');
  return lines.join('\n');
}

export function buildPaymentReminderEmailSubject({ installment, type, medium = 'English' }) {
  const num = installment?.number || '';
  if (medium === 'Hindi') {
    if (type === 'reminder') return `भुगतान अनुस्मारक — किस्त #${num} | Mentors Daily`;
    if (type === 'due_today') return `आज भुगतान देय — किस्त #${num} | Mentors Daily`;
    return `अतिदेय भुगतान — किस्त #${num} | Mentors Daily`;
  }
  if (type === 'reminder') return `Payment Reminder — Installment #${num} | Mentors Daily`;
  if (type === 'due_today') return `Payment Due Today — Installment #${num} | Mentors Daily`;
  return `Payment Overdue — Installment #${num} | Mentors Daily`;
}
