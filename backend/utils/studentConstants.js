export const CONVERTED_STATUSES = ['Converted', 'Won'];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

/** Students visible in admissions, payments, and performance totals */
export const ACTIVE_STUDENT_APPROVAL_FILTER = {
  approvalStatus: { $nin: ['pending', 'rejected'] },
};

export const STUDENT_STATUSES = ['Onboarding', 'Active', 'Completed', 'Dropped'];

export const PAYMENT_STATUSES = ['Pending', 'Partial', 'Paid', 'Overdue'];

export const ASPIRANT_TYPES = ['Full-time', 'Working Professional', 'College Student'];

export const EXAM_MEDIUMS = ['English', 'Hindi'];

export const ATTEMPT_OPTIONS = ['0 (Fresh)', '1', '2', '3+'];

export const INSTALLMENT_PLANS = ['Full Payment', '2 Installments', '3 Installments', 'EMI', 'Custom EMI'];

export const CUSTOM_EMI_MIN = 2;
export const CUSTOM_EMI_MAX = 60;

export const PAYMENT_MODES = [
  'Cash',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Net Banking',
  'Cheque',
  'Bank Transfer',
];
