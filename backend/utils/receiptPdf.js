import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const safe = (s) => String(s || '').trim();
// Helvetica (PDFKit default) does not render ₹ — use "Rs." to avoid garbled superscript digits
const inr = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function tryGetLogoPath() {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.join(cwd, 'frontend'))
    ? cwd
    : fs.existsSync(path.join(cwd, '..', 'frontend'))
      ? path.resolve(cwd, '..')
      : cwd;

  const candidates = [
    process.env.RECEIPT_LOGO_PATH,
    path.join(__dirname, '..', 'assets', 'mentors-daily-logo.png'),
    path.join(cwd, 'backend', 'assets', 'mentors-daily-logo.png'),
    path.join(cwd, 'assets', 'mentors-daily-logo.png'),
    path.join(repoRoot, 'frontend', 'public', 'mentors-daily-logo.png'),
    path.join(repoRoot, 'frontend', 'dist', 'mentors-daily-logo.png'),
    path.join(repoRoot, 'frontend', 'public', 'favicon.png'),
  ].filter(Boolean);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateShort(d) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  const day = String(dt.getDate()).padStart(2, '0');
  const month = dt.toLocaleDateString('en-IN', { month: 'short' });
  return `${day} ${month}`;
}

function drawLogo(doc, logoPath, x, y) {
  if (!logoPath) return 52;
  try {
    doc.image(logoPath, x, y, { fit: [150, 52], align: 'left', valign: 'top' });
    return 58;
  } catch {
    return 0;
  }
}

function buildProgramTitle(courseName, batch, student) {
  const program = safe(courseName || student?.programName);
  const year = safe(batch || student?.targetYear);
  const courseType = safe(student?.courseType);
  const parts = ['MentorsDaily'];
  if (courseType) parts.push(courseType);
  if (program) parts.push(program);
  if (year && !program.includes(year)) parts.push(year);
  return parts.filter(Boolean).join(' — ') || 'Course Enrollment';
}

function buildPaymentStructureLines(installments) {
  const insts = installments || [];
  if (!insts.length) return ['Full payment as per enrollment.'];

  return insts.map((inst) => {
    const due = formatDateShort(inst.dueDate);
    const amt = inr(inst.amount);
    const paid = Number(inst.paidAmount) || 0;
    const status = safe(inst.status || 'Pending');
    if (status === 'Paid') return `${due}: ${amt} (Paid)`;
    if (status === 'Partial' && paid > 0) {
      const left = Math.max(0, Number(inst.amount) - paid);
      return `${due}: ${amt} — ${inr(paid)} paid, ${inr(left)} due`;
    }
    return `${due}: ${amt} (Due)`;
  });
}

function drawInvoiceHeader(doc, { margins, pageWidth, receiptNumber, logoPath, isReceipt }) {
  const left = margins.left;
  const right = doc.page.width - margins.right;
  const top = margins.top;

  const logoH = drawLogo(doc, logoPath, left, top);
  const headerBottom = top + Math.max(logoH, 52) + 8;

  const title = isReceipt ? 'RECEIPT' : 'INVOICE';
  doc
    .font('Helvetica-Bold')
    .fontSize(26)
    .fillColor('#0f172a')
    .text(title, left, top + 4, { width: pageWidth, align: 'right' });

  doc
    .font('Helvetica')
    .fontSize(11)
    .fillColor('#475569')
    .text(`# ${safe(receiptNumber)}`, left, top + 34, { width: pageWidth, align: 'right' });

  doc
    .moveTo(left, headerBottom)
    .lineTo(right, headerBottom)
    .lineWidth(1.5)
    .strokeColor('#cbd5e1')
    .stroke();

  return headerBottom + 14;
}

function drawInfoColumns(
  doc,
  { y, margins, pageWidth, student, paymentDate, paymentMode, installmentPlan, dueDate }
) {
  const left = margins.left;
  const mid = left + pageWidth * 0.52;
  const colW = pageWidth * 0.48 - 8;

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('MentorsDaily', left, y, { width: colW });
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text('(A Unit of Sempriority Technologies)', left, y + 14, { width: colW });

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Bill To:', left, y + 38, { width: colW });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#0f172a')
    .text(safe(student?.fullName), left, y + 52, { width: colW });
  doc.fontSize(9).fillColor('#475569').text(safe(student?.email || '—'), left, y + 66, { width: colW });
  if (student?.phone) {
    doc.text(safe(student.phone), left, y + 78, { width: colW });
  }

  const metaRows = [
    ['Date', formatDate(paymentDate || new Date())],
    ['Payment Mode', safe(paymentMode || '—')],
    ['Payment Plan', safe(installmentPlan || 'Full Payment')],
    ['Due Date', formatDate(dueDate)],
  ];

  let ry = y;
  for (const [label, value] of metaRows) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text(`${label}:`, mid, ry, { width: 90 });
    doc.font('Helvetica').fontSize(10).fillColor('#0f172a').text(value, mid + 92, ry, { width: colW - 92 });
    ry += 16;
  }

  return y + 100;
}

function drawBalanceDueBar(doc, { y, margins, pageWidth, balanceDue }) {
  const left = margins.left;
  const h = 34;

  doc.roundedRect(left, y, pageWidth, h, 4).fill('#e2e8f0');

  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor('#0f172a')
    .text('Balance Due', left + 14, y + 10);

  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#0f172a')
    .text(inr(balanceDue), left, y + 8, { width: pageWidth - 14, align: 'right' });

  return y + h + 14;
}

function drawItemsTable(
  doc,
  { y, margins, pageWidth, programTitle, totalFee, discount, finalFee, installments }
) {
  const left = margins.left;
  const tableW = pageWidth;
  const colItem = left + 8;
  const colQty = left + tableW * 0.58;
  const colRate = left + tableW * 0.72;
  const colAmt = left + tableW * 0.86;
  const rowH = 22;
  const headerH = 24;

  doc.rect(left, y, tableW, headerH).fill('#475569');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
  doc.text('Item', colItem, y + 7, { width: tableW * 0.5 });
  doc.text('Qty', colQty, y + 7, { width: 40, align: 'center' });
  doc.text('Rate', colRate, y + 7, { width: 60, align: 'right' });
  doc.text('Amount', colAmt, y + 7, { width: tableW - (colAmt - left) - 8, align: 'right' });

  let cy = y + headerH;
  const total = Number(totalFee) || Number(finalFee) || 0;

  doc.rect(left, cy, tableW, rowH).fill('#ffffff').stroke('#e2e8f0');
  doc.font('Helvetica').fontSize(9).fillColor('#0f172a');
  doc.text(programTitle, colItem, cy + 6, { width: tableW * 0.52 });
  doc.text('1', colQty, cy + 6, { width: 40, align: 'center' });
  doc.text(inr(total), colRate, cy + 6, { width: 60, align: 'right' });
  doc.text(inr(total), colAmt, cy + 6, { width: tableW - (colAmt - left) - 8, align: 'right' });
  cy += rowH;

  const scheduleLines = buildPaymentStructureLines(installments);
  const scheduleH = Math.max(rowH, 16 + scheduleLines.length * 13);

  doc.rect(left, cy, tableW, scheduleH).fill('#f8fafc').stroke('#e2e8f0');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text('Payment Structure:', colItem, cy + 6, { width: tableW * 0.52 });

  let ly = cy + 20;
  doc.font('Helvetica').fontSize(8.5).fillColor('#334155');
  for (const line of scheduleLines) {
    doc.text(`• ${line}`, colItem + 6, ly, { width: tableW * 0.52 });
    ly += 13;
  }

  doc.text('—', colQty, cy + 8, { width: 40, align: 'center' });
  doc.text('—', colRate, cy + 8, { width: 60, align: 'right' });
  doc.text('—', colAmt, cy + 8, { width: tableW - (colAmt - left) - 8, align: 'right' });

  return cy + scheduleH + 12;
}

function drawTotals(doc, { y, margins, pageWidth, totalFee, discount, finalFee, amountPaid, balanceDue }) {
  const left = margins.left;
  const boxW = 220;
  const boxLeft = left + pageWidth - boxW;
  const total = Number(totalFee) || Number(finalFee) || 0;
  const disc = Number(discount) || 0;
  const final = Number(finalFee) || 0;
  const paid = Number(amountPaid) || 0;

  const rows = [
    ['Subtotal', inr(total)],
    ...(disc > 0 ? [['Discount + Scholarship', `-${inr(disc)}`]] : []),
    ['Total', inr(final)],
    ['Amount Paid', inr(paid)],
    ['Balance Due', inr(balanceDue)],
  ];

  let cy = y;
  for (const [label, value] of rows) {
    const isBold = label === 'Total' || label === 'Balance Due';
    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10).fillColor('#0f172a');
    doc.text(label, boxLeft, cy, { width: 110 });
    doc.text(value, boxLeft + 110, cy, { width: boxW - 110, align: 'right' });
    cy += 18;
  }

  return cy + 8;
}

function getNextDueDate(installments) {
  const pending = (installments || []).find(
    (i) => i.status === 'Pending' || i.status === 'Partial' || i.status === 'Overdue'
  );
  return pending?.dueDate || null;
}

export async function generateReceiptPdf({
  receiptNumber,
  receiptDirAbs,
  student,
  courseName,
  batch,
  courseType,
  studentCode,
  installmentPlan,
  installments,
  totalFee,
  discount,
  finalFee,
  installmentNumber,
  amountPaid,
  remainingAmount,
  paymentDate,
  paymentMode,
  transactionId,
}) {
  await fs.promises.mkdir(receiptDirAbs, { recursive: true });

  const filename = `${safe(receiptNumber).replace(/[^A-Za-z0-9_-]/g, '_')}.pdf`;
  const absPath = path.join(receiptDirAbs, filename);

  const paid = Number(amountPaid) || 0;
  const feeFinal = Number(finalFee) || 0;
  const balanceDue = Number(remainingAmount) ?? Math.max(0, feeFinal - paid);
  const isReceipt = paid > 0;
  const logoPath = tryGetLogoPath();
  const programTitle = buildProgramTitle(courseName, batch, { ...student, courseType });
  const dueDate = getNextDueDate(installments) || paymentDate;

  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const out = fs.createWriteStream(absPath);
  doc.pipe(out);

  const margins = doc.page.margins;
  const pageWidth = doc.page.width - margins.left - margins.right;

  let y = drawInvoiceHeader(doc, {
    margins,
    pageWidth,
    receiptNumber,
    logoPath,
    isReceipt,
  });

  y = drawInfoColumns(doc, {
    y,
    margins,
    pageWidth,
    student,
    paymentDate,
    paymentMode,
    installmentPlan,
    dueDate,
  });

  y = drawBalanceDueBar(doc, { y, margins, pageWidth, balanceDue });

  y = drawItemsTable(doc, {
    y,
    margins,
    pageWidth,
    programTitle,
    totalFee,
    discount,
    finalFee,
    installments,
  });

  y = drawTotals(doc, {
    y,
    margins,
    pageWidth,
    totalFee,
    discount,
    finalFee,
    amountPaid: paid,
    balanceDue,
  });

  y += 10;
  const notes = [
    `Mode of payment: ${safe(paymentMode || '—')}`,
    studentCode ? `Student ID: ${safe(studentCode)}` : null,
    paid > 0 && installmentNumber ? `Installment paid: #${installmentNumber}` : null,
    transactionId ? `Transaction ID: ${safe(transactionId)}` : null,
  ].filter(Boolean);

  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0f172a').text('Note', margins.left, y);
  y += 14;
  doc.font('Helvetica').fontSize(9).fillColor('#334155');
  for (const line of notes) {
    doc.text(line, margins.left, y, { width: pageWidth });
    y += 14;
  }

  y += 6;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      'This is a computer-generated invoice/receipt and does not require a physical signature. ' +
        'Please refer to the payment structure above for installment due dates and amounts. ' +
        'For queries: services@mentorsdaily.com | www.mentorsdaily.com',
      margins.left,
      y,
      { width: pageWidth, align: 'left' }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  return { absPath, filename };
}
