export const buildRoleFilter = (user) => {
  const base = { isDeleted: { $ne: true } };
  if (user.role !== 'admin') {
    base.assignedTo = user._id;
  }
  return base;
};

export const CONVERTED_STATUSES = ['Converted', 'Won'];
export const LOST_STATUSES = ['Lost', 'Reject'];

export const isConverted = (status) => CONVERTED_STATUSES.includes(status);
export const isLost = (status) => LOST_STATUSES.includes(status);

