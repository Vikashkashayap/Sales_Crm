import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';

const safe = (s) => String(s || '').trim();

function tryGetLogoPath() {
  const cwd = process.cwd();
  const repoRoot = fs.existsSync(path.join(cwd, 'frontend'))
    ? cwd
    : fs.existsSync(path.join(cwd, '..', 'frontend'))
      ? path.resolve(cwd, '..')
      : cwd;

  const candidates = [
    process.env.RECEIPT_LOGO_PATH,
    // If you build frontend and keep assets, this file exists in your repo already.
    path.join(repoRoot, 'frontend', 'dist', 'mentors-daily-logo.png'),
    path.join(repoRoot, 'frontend', 'dist', 'favicon.png'),
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

export async function generateReceiptPdf({
  receiptNumber,
  receiptDirAbs,
  student,
  courseName,
  batch,
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

  const doc = new PDFDocument({ size: 'A4', margin: 42 });
  const out = fs.createWriteStream(absPath);
  doc.pipe(out);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // Header
  const logoPath = tryGetLogoPath();
  if (logoPath) {
    try {
      doc.image(logoPath, doc.page.margins.left, 38, { width: 56, height: 56 });
    } catch {
      // ignore image failures
    }
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor('#0f172a')
    .text('Mentors Daily', doc.page.margins.left + 70, 42, { width: pageWidth - 70 });

  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#475569')
    .text('Fee Payment Receipt', doc.page.margins.left + 70, 66, { width: pageWidth - 70 });

  // Accent line
  doc
    .moveTo(doc.page.margins.left, 108)
    .lineTo(doc.page.width - doc.page.margins.right, 108)
    .lineWidth(2)
    .strokeColor('#0ea5e9')
    .stroke();

  // Meta box
  const metaTop = 124;
  doc
    .roundedRect(doc.page.margins.left, metaTop, pageWidth, 54, 10)
    .fillOpacity(1)
    .fillAndStroke('#f8fafc', '#e2e8f0');

  doc.fillColor('#0f172a');
  doc.fontSize(10).font('Helvetica-Bold').text('Receipt No:', doc.page.margins.left + 16, metaTop + 14);
  doc.font('Helvetica').text(safe(receiptNumber), doc.page.margins.left + 92, metaTop + 14);

  const paidOn = paymentDate ? new Date(paymentDate) : new Date();
  doc.font('Helvetica-Bold').text('Payment Date:', doc.page.margins.left + 310, metaTop + 14);
  doc.font('Helvetica').text(
    paidOn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    doc.page.margins.left + 400,
    metaTop + 14
  );

  doc.font('Helvetica-Bold').text('Payment Mode:', doc.page.margins.left + 16, metaTop + 32);
  doc.font('Helvetica').text(safe(paymentMode || 'Cash'), doc.page.margins.left + 106, metaTop + 32);

  doc.font('Helvetica-Bold').text('Txn ID:', doc.page.margins.left + 310, metaTop + 32);
  doc.font('Helvetica').text(safe(transactionId || '—'), doc.page.margins.left + 360, metaTop + 32);

  // Details
  let y = metaTop + 74;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0f172a').text('Student & Course Details', doc.page.margins.left, y);
  y += 14;

  doc
    .moveTo(doc.page.margins.left, y + 6)
    .lineTo(doc.page.width - doc.page.margins.right, y + 6)
    .lineWidth(1)
    .strokeColor('#e2e8f0')
    .stroke();
  y += 18;

  const labelX = doc.page.margins.left;
  const valueX = doc.page.margins.left + 160;
  const rowGap = 18;

  const rows = [
    ['Student Name', safe(student?.fullName)],
    ['Student Email', safe(student?.email || '—')],
    ['Course Name', safe(courseName || student?.programName || '—')],
    ['Batch', safe(batch || '—')],
    ['Installment No.', `#${installmentNumber}`],
    ['Amount Paid', `₹${Number(amountPaid || 0).toLocaleString('en-IN')}`],
    ['Remaining Amount', `₹${Number(remainingAmount || 0).toLocaleString('en-IN')}`],
  ];

  doc.fontSize(11);
  for (const [label, value] of rows) {
    doc.font('Helvetica-Bold').fillColor('#334155').text(label, labelX, y, { width: 150 });
    doc.font('Helvetica').fillColor('#0f172a').text(value, valueX, y, { width: pageWidth - (valueX - labelX) });
    y += rowGap;
  }

  // Signature area
  y += 18;
  doc
    .roundedRect(doc.page.margins.left, y, pageWidth, 90, 10)
    .fillAndStroke('#ffffff', '#e2e8f0');

  doc.font('Helvetica-Bold').fillColor('#0f172a').text('Authorized Signature', doc.page.margins.left + 16, y + 18);
  doc
    .moveTo(doc.page.margins.left + 16, y + 62)
    .lineTo(doc.page.margins.left + 240, y + 62)
    .lineWidth(1)
    .strokeColor('#94a3b8')
    .stroke();
  doc.font('Helvetica').fillColor('#64748b').fontSize(9).text('Mentors Daily', doc.page.margins.left + 16, y + 68);

  // Footer
  const footerY = doc.page.height - doc.page.margins.bottom - 40;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#64748b')
    .text(
      'Thank you for your payment. This is a computer-generated receipt and does not require a physical stamp.',
      doc.page.margins.left,
      footerY,
      { width: pageWidth, align: 'center' }
    );

  doc.end();

  await new Promise((resolve, reject) => {
    out.on('finish', resolve);
    out.on('error', reject);
  });

  return { absPath, filename };
}

