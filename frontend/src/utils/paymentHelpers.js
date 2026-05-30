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

export const buildInstallmentPreview = (finalFee, plan, amountPaid = 0, startDate = new Date()) => {
  const count = getInstallmentCount(plan);
  const registrationPaid = Math.max(0, Number(amountPaid) || 0);
  const fee = Math.max(0, Number(finalFee) || 0);
  const installmentTotal = Math.max(0, fee - Math.min(registrationPaid, fee));

  if (!fee) {
    return [{
      number: 1,
      amount: 0,
      paidAmount: 0,
      dueDate: startDate,
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
      status: 'Pending',
    });
  }

  return installments;
};

export const sumInstallmentPaid = (installments) =>
  (installments || []).reduce((sum, inst) => sum + (Number(inst.paidAmount) || 0), 0);

/** Balance left to split across installments after registration */
export const getInstallmentBalanceTotal = (finalFee, amountPaid = 0) => {
  const fee = Math.max(0, Number(finalFee) || 0);
  const registrationPaid = Math.max(0, Number(amountPaid) || 0);
  return Math.max(0, fee - Math.min(registrationPaid, fee));
};

/**
 * Set amount for one installment; last installment absorbs the remaining balance.
 * Earlier installments (except the last) can be edited manually.
 */
export const setInstallmentAmountAt = (installments, installmentTotal, installmentNumber, rawAmount) => {
  if (!installments?.length) return installments;

  const total = Math.max(0, Number(installmentTotal) || 0);
  const idx = installments.findIndex((inst) => inst.number === installmentNumber);
  if (idx === -1) return installments;

  const amounts = installments.map((inst) => Math.max(0, Math.floor(Number(inst.amount) || 0)));
  const parsed = Math.max(0, Math.floor(Number(rawAmount) || 0));

  if (installments.length === 1) {
    amounts[0] = Math.min(parsed, total);
    return installments.map((inst, i) => ({ ...inst, amount: amounts[i] }));
  }

  if (idx >= installments.length - 1) return installments;

  const maxForEdited = total - amounts.slice(0, idx).reduce((sum, n) => sum + n, 0);
  amounts[idx] = Math.min(parsed, Math.max(0, maxForEdited));

  const lastIdx = installments.length - 1;
  const sumExceptLast = amounts.slice(0, lastIdx).reduce((sum, n) => sum + n, 0);
  amounts[lastIdx] = Math.max(0, total - sumExceptLast);

  return installments.map((inst, i) => ({ ...inst, amount: amounts[i] }));
};
