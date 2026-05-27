import Student from '../models/Student.js';

export const buildPaymentFilter = (user) => {
  if (user.role === 'admin') return {};
  return {
    $or: [{ registeredBy: user._id }, { assignedBda: user._id }],
  };
};

export const getInstallmentCount = (plan) => {
  switch (plan) {
    case '2 Installments':
      return 2;
    case '3 Installments':
      return 3;
    case 'EMI':
      return 6;
    default:
      return 1;
  }
};

export const getInstallmentPlanLabel = (plan) => {
  switch (plan) {
    case '2 Installments':
      return '2 Installments (2 equal payments)';
    case '3 Installments':
      return '3 Installments (3 equal payments)';
    case 'EMI':
      return 'EMI (6 monthly payments)';
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

export const buildInstallments = (finalFee, plan, startDate = new Date(), amountPaid = 0) => {
  const count = getInstallmentCount(plan);
  const paidNow = Math.max(0, Number(amountPaid) || 0);
  const fee = Math.max(0, Number(finalFee) || 0);

  if (!fee) {
    return [{
      number: 1,
      amount: 0,
      paidAmount: paidNow,
      dueDate: startDate,
      paidAt: paidNow > 0 ? startDate : null,
      status: paidNow > 0 ? 'Paid' : 'Pending',
    }];
  }

  const base = Math.floor(fee / count);
  let remainingPaid = paidNow;
  const installments = [];

  for (let i = 0; i < count; i++) {
    const amount = i === count - 1 ? fee - base * (count - 1) : base;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const applied = Math.min(remainingPaid, amount);
    remainingPaid -= applied;

    let paidAt = null;
    if (applied >= amount) paidAt = new Date(startDate);

    installments.push({
      number: i + 1,
      amount,
      paidAmount: applied,
      dueDate,
      paidAt,
      status: installmentStatusFromPaid(applied, amount),
    });
  }

  return syncInstallmentStatuses(installments);
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
      doc.amountPaid || 0
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
