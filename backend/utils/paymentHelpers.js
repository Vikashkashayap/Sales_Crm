import Student from '../models/Student.js';

import { ACTIVE_STUDENT_APPROVAL_FILTER, CUSTOM_EMI_MIN, CUSTOM_EMI_MAX } from './studentConstants.js';

export const buildPaymentFilter = (user) => {
  const roleFilter =
    user.role === 'admin'
      ? {}
      : { $or: [{ registeredBy: user._id }, { assignedBda: user._id }] };
  return { ...roleFilter, ...ACTIVE_STUDENT_APPROVAL_FILTER };
};

export const normalizeCustomInstallmentCount = (raw) => {
  const n = Math.floor(Number(raw) || 0);
  if (!n) return CUSTOM_EMI_MIN;
  return Math.min(CUSTOM_EMI_MAX, Math.max(CUSTOM_EMI_MIN, n));
};

export const getInstallmentCount = (plan, customInstallmentCount) => {
  switch (plan) {
    case '2 Installments':
      return 2;
    case '3 Installments':
      return 3;
    case 'EMI':
      return 6;
    case 'Custom EMI':
      return normalizeCustomInstallmentCount(customInstallmentCount);
    default:
      return 1;
  }
};

export const getInstallmentPlanLabel = (plan, customInstallmentCount) => {
  switch (plan) {
    case '2 Installments':
      return '2 Installments (2 equal payments)';
    case '3 Installments':
      return '3 Installments (3 equal payments)';
    case 'EMI':
      return 'EMI (6 monthly payments)';
    case 'Custom EMI': {
      const n = getInstallmentCount(plan, customInstallmentCount);
      return `Custom EMI (${n} monthly payments)`;
    }
    default:
      return 'Full Payment (single payment)';
  }
};

const installmentStatusFromPaid = (paidAmount, amount) => {
  if (paidAmount >= amount) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Pending';
};

export const derivePaymentStatus = (finalFee, amountPaid, hasOverdue = false) => {
  if (hasOverdue) return 'Overdue';
  if (!finalFee || finalFee <= 0) return amountPaid > 0 ? 'Partial' : 'Pending';
  if (amountPaid >= finalFee) return 'Paid';
  if (amountPaid > 0) return 'Partial';
  return 'Pending';
};

export const syncInstallmentStatuses = (installments) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return installments.map((inst) => {
    const amount = Number(inst.amount) || 0;
    const paidAmount = Number(inst.paidAmount) || 0;
    if (paidAmount >= amount && amount > 0) {
      return { ...inst, paidAmount, status: 'Paid' };
    }
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today && paidAmount < amount) {
      return { ...inst, paidAmount, status: 'Overdue' };
    }
    return { ...inst, paidAmount, status: installmentStatusFromPaid(paidAmount, amount) };
  });
};

export const sumInstallmentPaid = (installments) =>
  (installments || []).reduce((sum, inst) => sum + (Number(inst.paidAmount) || 0), 0);

export const buildInstallments = (
  finalFee,
  plan,
  startDate = new Date(),
  amountPaid = 0,
  customInstallmentCount
) => {
  const count = getInstallmentCount(plan, customInstallmentCount);
  const registrationPaid = Math.max(0, Number(amountPaid) || 0);
  const fee = Math.max(0, Number(finalFee) || 0);
  const installmentTotal = Math.max(0, fee - Math.min(registrationPaid, fee));

  if (!fee) {
    return [{
      number: 1,
      amount: 0,
      paidAmount: 0,
      dueDate: startDate,
      paidAt: null,
      status: 'Pending',
    }];
  }

  if (!installmentTotal) {
    return [];
  }

  const base = Math.floor(installmentTotal / count);
  const installments = [];

  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? installmentTotal - base * (count - 1) : base;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    installments.push({
      number: i + 1,
      amount,
      paidAmount: 0,
      dueDate,
      paidAt: null,
      status: 'Pending',
    });
  }

  return syncInstallmentStatuses(installments);
};

export const getInstallmentBalanceTotal = (finalFee, amountPaid = 0) => {
  const fee = Math.max(0, Number(finalFee) || 0);
  const registrationPaid = Math.max(0, Number(amountPaid) || 0);
  return Math.max(0, fee - Math.min(registrationPaid, fee));
};

export const resolveInstallments = (
  finalFee,
  plan,
  startDate,
  amountPaid,
  customInstallments,
  customInstallmentCount
) => {
  const built = buildInstallments(finalFee, plan, startDate, amountPaid, customInstallmentCount);
  if (!Array.isArray(customInstallments) || !customInstallments.length) return built;

  const installmentTotal = getInstallmentBalanceTotal(finalFee, amountPaid);
  if (!installmentTotal) return built;

  const normalized = customInstallments.map((inst, i) => {
    const dueDate = inst.dueDate && !Number.isNaN(new Date(inst.dueDate).getTime())
      ? new Date(inst.dueDate)
      : (built[i]?.dueDate || startDate);
    return {
      number: Number(inst.number) || i + 1,
      amount: Math.max(0, Math.floor(Number(inst.amount) || 0)),
      paidAmount: 0,
      dueDate,
      paidAt: null,
      status: 'Pending',
    };
  });

  const sum = normalized.reduce((s, inst) => s + inst.amount, 0);
  if (Math.abs(sum - installmentTotal) > 1) {
    const err = new Error(`Installment amounts must total ₹${installmentTotal.toLocaleString('en-IN')} (got ₹${sum.toLocaleString('en-IN')})`);
    err.statusCode = 400;
    throw err;
  }

  return syncInstallmentStatuses(normalized);
};

/** Upfront registration/collected amount kept separate from installment rows */
export const getRegistrationPaidAmount = (student) => {
  const totalPaid = Math.max(0, Number(student?.amountPaid) || 0);
  const fromInstallments = sumInstallmentPaid(student?.installments);
  return Math.max(0, totalPaid - fromInstallments);
};

export const generateStudentCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `MD-${year}-`;
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const rows = await Student.find({ studentCode: { $regex: `^${escaped}` } })
    .select('studentCode')
    .lean();

  let maxNum = 0;
  for (const row of rows) {
    const code = row.studentCode;
    if (!code?.startsWith(prefix)) continue;
    const num = parseInt(code.slice(prefix.length), 10);
    if (!Number.isNaN(num) && num > maxNum) maxNum = num;
  }

  let attempt = 0;
  while (attempt < 20) {
    const candidate = `${prefix}${String(maxNum + 1 + attempt).padStart(4, '0')}`;
    const taken = await Student.exists({ studentCode: candidate });
    if (!taken) return candidate;
    attempt += 1;
  }

  return `${prefix}${Date.now().toString(36).toUpperCase()}`;
};

export const ensureStudentInstallments = (student) => {
  const doc = student.toObject ? student.toObject() : { ...student };
  if (!doc.installments?.length) {
    doc.installments = buildInstallments(
      doc.finalFee,
      doc.installmentPlan,
      doc.createdAt || new Date(),
      doc.amountPaid || 0,
      doc.customInstallmentCount
    );
  } else {
    doc.installments = syncInstallmentStatuses(
      doc.installments.map((inst) => ({
        ...inst,
        paidAmount: Number(inst.paidAmount) || (inst.status === 'Paid' ? inst.amount : 0),
      }))
    );
  }
  const hasOverdue = doc.installments.some((i) => i.status === 'Overdue');
  const paidFromInstallments = sumInstallmentPaid(doc.installments);
  doc.amountPaid = Math.max(Number(doc.amountPaid) || 0, paidFromInstallments);
  doc.paymentStatus = derivePaymentStatus(doc.finalFee, doc.amountPaid, hasOverdue);
  if (!doc.refundEligible && doc.courseType === 'Scholarship') {
    doc.refundEligible = true;
  }
  return doc;
};

export const getPeriodRange = (period) => {
  const now = new Date();
  if (period === 'all') return { start: null, end: null };

  if (period === 'last_month') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { start, end: now };
};

export const inPeriod = (date, start, end) => {
  if (!date) return false;
  const d = new Date(date);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

export const formatCurrency = (n) => Math.round(Number(n) || 0);
