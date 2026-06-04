import { ACTIVE_STUDENT_APPROVAL_FILTER } from './studentConstants.js';

export const buildStudentFilter = (user, { includePending = false } = {}) => {
  const roleFilter =
    user.role === 'admin'
      ? {}
      : { $or: [{ registeredBy: user._id }, { assignedBda: user._id }] };

  if (includePending) return roleFilter;

  return { ...roleFilter, ...ACTIVE_STUDENT_APPROVAL_FILTER };
};

export const buildPendingApprovalFilter = (user) => {
  const base = { approvalStatus: 'pending' };
  if (user.role === 'admin') return base;
  return { ...base, registeredBy: user._id };
};
