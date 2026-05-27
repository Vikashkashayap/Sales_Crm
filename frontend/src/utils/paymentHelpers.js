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
      return '2 equal payments';
    case '3 Installments':
      return '3 equal payments';
    case 'EMI':
      return '6 monthly EMIs';
    default:
      return 'Single full payment';
  }
};

const installmentStatusFromPaid = (paidAmount, amount) => {
  if (paidAmount >= amount) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Pending';
};

export const buildInstallmentPreview = (finalFee, plan, amountPaid = 0, startDate = new Date()) => {
  const count = getInstallmentCount(plan);
  const paidNow = Math.max(0, Number(amountPaid) || 0);
  const fee = Math.max(0, Number(finalFee) || 0);

  if (!fee) {
    return [{
      number: 1,
      amount: 0,
      paidAmount: paidNow,
      dueDate: startDate,
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

    installments.push({
      number: i + 1,
      amount,
      paidAmount: applied,
      dueDate,
      status: installmentStatusFromPaid(applied, amount),
    });
  }

  return installments;
};

export const sumInstallmentPaid = (installments) =>
  (installments || []).reduce((sum, inst) => sum + (Number(inst.paidAmount) || 0), 0);
