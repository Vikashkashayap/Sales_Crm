import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Payment from '../models/Payment.js';
import { generateReceiptNumber } from './receiptNumber.js';
import { generateReceiptPdf } from './receiptPdf.js';
import { ensureStudentInstallments } from './paymentHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const receiptsDirAbs = path.join(__dirname, '..', 'receipts');

const safeFileName = (name) =>
  String(name || 'Student')
    .trim()
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60) || 'Student';

function getReceiptPaymentDetails(student) {
  const installments = student.installments || [];
  const paidInst = installments.find(
    (i) =>
      (i.status === 'Paid' || i.status === 'Partial') &&
      (Number(i.paidAmount) > 0 || i.status === 'Paid')
  );

  if (paidInst) {
    return {
      installmentNumber: paidInst.number,
      amountPaid:
        Number(paidInst.paidAmount) > 0
          ? Number(paidInst.paidAmount)
          : Number(paidInst.amount) || 0,
      paymentDate: paidInst.paidAt || new Date(),
    };
  }

  const paid = Number(student.amountPaid) || 0;
  return {
    installmentNumber: 1,
    amountPaid: paid,
    paymentDate: new Date(),
  };
}

/**
 * Builds fee invoice/receipt PDF attachment for welcome emails.
 * Always generates when finalFee > 0 (enrollment invoice even if no payment yet).
 */
export async function buildWelcomeReceiptAttachment(student, options = {}) {
  const s = ensureStudentInstallments(student);
  const finalFee = Number(s.finalFee) || 0;
  if (finalFee <= 0) {
    return { attachment: null, receiptNumber: null, generated: false };
  }

  const totalPaid = Number(s.amountPaid) || 0;

  const latestPayment =
    totalPaid > 0 ? await Payment.findOne({ student: s._id }).sort({ createdAt: -1 }).lean() : null;

  if (latestPayment?.receiptPath && fs.existsSync(latestPayment.receiptPath)) {
    return {
      attachment: {
        filename: `Fee Invoice - ${safeFileName(s.fullName)}.pdf`,
        path: latestPayment.receiptPath,
        contentType: 'application/pdf',
      },
      receiptNumber: latestPayment.receiptNumber,
      generated: false,
    };
  }

  const { installmentNumber, paymentDate } = getReceiptPaymentDetails(s);
  const remainingAmount = Math.max(0, finalFee - totalPaid);

  const receiptNumber = await generateReceiptNumber();
  const { absPath } = await generateReceiptPdf({
    receiptNumber,
    receiptDirAbs: receiptsDirAbs,
    student: s,
    courseName: s.programName,
    batch: s.targetYear || '',
    courseType: s.courseType,
    studentCode: s.studentCode || '',
    installmentPlan: s.installmentPlan,
    installments: s.installments,
    totalFee: s.totalFee,
    discount: s.discount,
    finalFee,
    installmentNumber,
    amountPaid: totalPaid,
    remainingAmount,
    paymentDate,
    paymentMode:
      latestPayment?.paymentMode ||
      options.paymentMode ||
      (totalPaid > 0 ? 'Cash' : ''),
    transactionId: latestPayment?.transactionId || options.transactionId || '',
  });

  if (totalPaid > 0 && !latestPayment) {
    await Payment.create({
      student: s._id,
      installmentNumber,
      amountPaid: totalPaid,
      remainingAmount,
      courseName: s.programName || '',
      batch: s.targetYear || '',
      receiptNumber,
      receiptUrl: '',
      receiptPath: absPath,
      paymentDate,
      transactionId: options.transactionId || '',
      paymentMode: options.paymentMode || 'Cash',
      emailSent: false,
    });
  }

  return {
    attachment: {
      filename: `Fee Invoice - ${safeFileName(s.fullName)}.pdf`,
      path: absPath,
      contentType: 'application/pdf',
    },
    receiptNumber,
    generated: true,
  };
}
