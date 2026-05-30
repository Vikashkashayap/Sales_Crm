import Student from '../models/Student.js';
import Payment from '../models/Payment.js';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildPaymentFilter,
  ensureStudentInstallments,
  formatCurrency,
  getPeriodRange,
  inPeriod,
  derivePaymentStatus,
  buildInstallments,
  getRegistrationPaidAmount,
  sumInstallmentPaid,
  syncInstallmentStatuses,
} from '../utils/paymentHelpers.js';
import { generateReceiptNumber } from '../utils/receiptNumber.js';
import { generateReceiptPdf } from '../utils/receiptPdf.js';
import { sendReceiptEmail } from '../services/emailService.js';
import { getAppSettings } from '../models/Settings.js';
import { buildWelcomeKitAttachments, getStudentMedium } from '../utils/welcomeKitAttachments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const populateOpts = [
  { path: 'assignedBda', select: 'name email' },
  { path: 'registeredBy', select: 'name email' },
];

const toId = (v) => (v && typeof v === 'object' ? (v._id || v.id) : v);

const canAccessStudent = (user, student) => {
  if (user.role === 'admin') return true;
  return (
    String(toId(student.registeredBy)) === String(user._id) ||
    String(toId(student.assignedBda)) === String(user._id)
  );
};

const installmentToListItem = (student, inst) => {
  const s = ensureStudentInstallments(student);
  const due = new Date(inst.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const daysOverdue = inst.status === 'Overdue'
    ? Math.max(1, Math.ceil((today - due) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    studentId: s._id,
    studentCode: s.studentCode,
    fullName: s.fullName,
    programName: s.programName,
    courseType: s.courseType,
    bdaName: s.assignedBda?.name || s.leadBdaName || '—',
    installmentNumber: inst.number,
    amount: inst.amount,
    paidAmount: inst.paidAmount || 0,
    balanceDue: Math.max(0, (Number(inst.amount) || 0) - (Number(inst.paidAmount) || 0)),
    dueDate: inst.dueDate,
    status: inst.status,
    daysOverdue,
    message:
      inst.status === 'Overdue'
        ? `Installment ${inst.number} overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} — ₹${formatCurrency(Math.max(0, inst.amount - (inst.paidAmount || 0))).toLocaleString('en-IN')} due`
        : inst.status === 'Partial'
          ? `Installment ${inst.number} partially paid — ₹${formatCurrency(inst.paidAmount || 0).toLocaleString('en-IN')} of ₹${formatCurrency(inst.amount).toLocaleString('en-IN')}`
        : inst.status === 'Paid'
          ? `Installment ${inst.number} paid`
          : `Installment ${inst.number} due — ₹${formatCurrency(inst.amount).toLocaleString('en-IN')}`,
  };
};

export const getPaymentsDashboard = async (req, res) => {
  try {
    const period = req.query.period || 'this_month';
    const { start, end } = getPeriodRange(period);
    const { start: prevStart, end: prevEnd } = getPeriodRange(
      period === 'last_month' ? 'last_month' : 'last_month'
    );

    const filter = buildPaymentFilter(req.user);
    const students = await Student.find(filter).populate(populateOpts).sort({ createdAt: -1 });

    const enriched = students.map((s) => ensureStudentInstallments(s));

    const inStudentPeriod = (s) => {
      if (!start && !end) return true;
      return inPeriod(s.createdAt, start, end);
    };

    const periodStudents = enriched.filter(inStudentPeriod);
    const allForTotals = enriched;

    let totalCollected = 0;
    let pendingBalance = 0;
    let overdueAmount = 0;
    let refundEligibleAmount = 0;
    const pendingStudentIds = new Set();
    const overdueStudentIds = new Set();
    const refundStudentIds = new Set();

    const bdaMap = {};
    const programMap = {};
    let fullPaymentCount = 0;
    let installmentPlanCount = 0;

    const overdueList = [];
    const allInstallmentsList = [];
    const refundEligibleList = [];

    for (const s of allForTotals) {
      const paid = formatCurrency(s.amountPaid);
      const balance = Math.max(0, formatCurrency(s.finalFee) - paid);

      totalCollected += paid;
      pendingBalance += balance;
      if (balance > 0) pendingStudentIds.add(String(s._id));

      if (s.refundEligible) {
        refundEligibleAmount += formatCurrency(s.finalFee);
        refundStudentIds.add(String(s._id));
        refundEligibleList.push({
          studentId: s._id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          courseType: s.courseType,
          programName: s.programName,
          bdaName: s.assignedBda?.name || s.leadBdaName || '—',
          finalFee: s.finalFee,
          amountPaid: s.amountPaid,
          balance,
        });
      }

      const bdaKey = s.assignedBda?.name || s.leadBdaName || 'Unassigned';
      if (!bdaMap[bdaKey]) bdaMap[bdaKey] = { name: bdaKey, amount: 0, studentCount: 0 };
      bdaMap[bdaKey].amount += paid;
      bdaMap[bdaKey].studentCount += 1;

      const progKey = s.courseType || 'Other';
      if (!programMap[progKey]) {
        programMap[progKey] = { courseType: progKey, revenue: 0, studentCount: 0 };
      }
      programMap[progKey].revenue += formatCurrency(s.finalFee);
      programMap[progKey].studentCount += 1;

      if (s.installmentPlan === 'Full Payment') fullPaymentCount += 1;
      else installmentPlanCount += 1;

      for (const inst of s.installments) {
        const item = installmentToListItem(s, inst);
        allInstallmentsList.push(item);
        if (inst.status === 'Overdue') {
          overdueAmount += inst.amount;
          overdueStudentIds.add(String(s._id));
          overdueList.push(item);
        }
      }
    }

    let prevCollected = 0;
    for (const s of enriched) {
      if (inPeriod(s.createdAt, prevStart, prevEnd)) {
        prevCollected += formatCurrency(s.amountPaid);
      }
    }
    const growthPercent =
      prevCollected > 0
        ? Math.round(((totalCollected - prevCollected) / prevCollected) * 100)
        : totalCollected > 0
          ? 100
          : 0;

    const bdaRevenue = Object.values(bdaMap)
      .sort((a, b) => b.amount - a.amount)
      .map((b) => ({
        ...b,
        maxAmount: Math.max(...Object.values(bdaMap).map((x) => x.amount), 1),
      }));

    const programSplit = Object.values(programMap)
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({
        ...p,
        maxRevenue: Math.max(...Object.values(programMap).map((x) => x.revenue), 1),
      }));

    res.json({
      period,
      summary: {
        totalCollected,
        pendingBalance,
        pendingStudentCount: pendingStudentIds.size,
        overdueAmount,
        overdueStudentCount: overdueStudentIds.size,
        refundEligibleAmount,
        refundEligibleCount: refundStudentIds.size,
        growthPercent,
        studentCount: periodStudents.length,
      },
      bdaRevenue,
      programSplit,
      planBreakdown: {
        fullPayment: fullPaymentCount,
        installment: installmentPlanCount,
      },
      overdue: overdueList,
      allInstallments: allInstallmentsList,
      refundEligible: refundEligibleList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const markInstallmentPaid = async (req, res) => {
  try {
    const { installmentNumber, paymentMode, transactionId, courseName, batch } = req.body || {};
    const num = Number(installmentNumber);
    if (!num) {
      return res.status(400).json({ message: 'installmentNumber is required' });
    }

    const student = await Student.findById(req.params.studentId).populate(populateOpts);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!canAccessStudent(req.user, student)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (!student.email) {
      return res.status(400).json({ message: 'Student email is missing. Please add student email first.' });
    }

    let installments = student.installments?.length
      ? [...student.installments.map((i) => i.toObject ? i.toObject() : { ...i })]
      : buildInstallments(
          student.finalFee,
          student.installmentPlan,
          student.createdAt,
          student.amountPaid
        );

    const idx = installments.findIndex((i) => i.number === num);
    if (idx === -1) {
      return res.status(404).json({ message: 'Installment not found' });
    }
    if (installments[idx].status === 'Paid') {
      return res.status(400).json({ message: 'Installment already paid' });
    }

    installments[idx].paidAmount = installments[idx].amount;
    installments[idx].status = 'Paid';
    installments[idx].paidAt = new Date();

    const synced = syncInstallmentStatuses(installments);
    const registrationPaid = getRegistrationPaidAmount(student);
    const totalPaid = registrationPaid + sumInstallmentPaid(synced);

    const hasOverdue = synced.some((i) => i.status === 'Overdue');

    student.installments = synced;
    student.amountPaid = totalPaid;
    student.paymentStatus = derivePaymentStatus(student.finalFee, totalPaid, hasOverdue);
    if (totalPaid >= student.finalFee && student.finalFee > 0) {
      student.status = student.status === 'Onboarding' ? 'Active' : student.status;
    }

    await student.save();

    const receiptNumber = await generateReceiptNumber();
    const paidInstAmount = Number(synced[idx]?.paidAmount || synced[idx]?.amount || 0);
    const remainingAmount = Math.max(0, Number(student.finalFee || 0) - Number(totalPaid || 0));
    const paymentDate = new Date();

    const receiptsDirAbs = path.join(__dirname, '..', 'receipts');
    const { absPath, filename } = await generateReceiptPdf({
      receiptNumber,
      receiptDirAbs: receiptsDirAbs,
      student,
      courseName: courseName || student.programName,
      batch: batch || student.targetYear || '',
      courseType: student.courseType,
      studentCode: student.studentCode || '',
      installmentPlan: student.installmentPlan,
      installments: synced,
      totalFee: student.totalFee,
      discount: student.discount,
      finalFee: student.finalFee,
      installmentNumber: num,
      amountPaid: totalPaid,
      remainingAmount,
      paymentDate,
      paymentMode: paymentMode || 'Cash',
      transactionId: transactionId || '',
    });

    const receiptUrl = `${req.protocol}://${req.get('host')}/receipts/${filename}`;

    const payment = await Payment.create({
      student: student._id,
      installmentNumber: num,
      amountPaid: paidInstAmount,
      remainingAmount,
      courseName: courseName || student.programName || '',
      batch: batch || '',
      receiptNumber,
      receiptUrl,
      receiptPath: absPath,
      paymentDate,
      transactionId: transactionId || '',
      paymentMode: paymentMode || 'Cash',
      createdBy: req.user?._id || null,
      emailSent: false,
    });

    let emailSent = false;
    try {
      const settings = await getAppSettings();
      let extraAttachments = [];
      if (settings.attachWelcomeKitWithReceipt) {
        const kit = buildWelcomeKitAttachments(getStudentMedium(student));
        extraAttachments = kit.attachments;
      }

      await sendReceiptEmail({
        to: student.email,
        studentName: student.fullName,
        amountPaid: paidInstAmount,
        pdfPath: absPath,
        receiptNumber,
        extraAttachments,
        student,
      });
      emailSent = true;
      payment.emailSent = true;
      await payment.save();
    } catch (e) {
      // Payment is saved; email failure should be visible to frontend for retry.
      emailSent = false;
    }

    const populated = await Student.findById(student._id).populate(populateOpts);
    res.json({
      student: ensureStudentInstallments(populated),
      payment,
      emailSent,
      message: emailSent
        ? 'Payment successful & receipt sent to student email'
        : 'Payment saved, but receipt email could not be sent. Please resend.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getStudentPaymentHistory = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId).select('_id registeredBy assignedBda');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (!canAccessStudent(req.user, student)) return res.status(403).json({ message: 'Access denied' });

    const list = await Payment.find({ student: student._id })
      .sort({ createdAt: -1 })
      .lean();

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const resendReceiptEmail = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId).populate('student');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const student = payment.student;
    if (!student) return res.status(400).json({ message: 'Student not found for this payment' });
    if (!canAccessStudent(req.user, student)) return res.status(403).json({ message: 'Access denied' });
    if (!student.email) return res.status(400).json({ message: 'Student email is missing' });
    if (!payment.receiptPath) return res.status(400).json({ message: 'Receipt file path missing' });

    const settings = await getAppSettings();
    let extraAttachments = [];
    if (settings.attachWelcomeKitWithReceipt) {
      const kit = buildWelcomeKitAttachments(getStudentMedium(student));
      extraAttachments = kit.attachments;
    }

    await sendReceiptEmail({
      to: student.email,
      studentName: student.fullName,
      amountPaid: payment.amountPaid,
      pdfPath: payment.receiptPath,
      receiptNumber: payment.receiptNumber,
      extraAttachments,
      student,
    });

    payment.emailSent = true;
    await payment.save();

    res.json({ message: 'Receipt email resent successfully', payment });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
