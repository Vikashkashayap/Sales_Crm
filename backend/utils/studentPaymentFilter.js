export const buildStudentFilter = (user) => {
  if (user.role === 'admin') return {};
  return {
    $or: [{ registeredBy: user._id }, { assignedBda: user._id }],
  };
};
