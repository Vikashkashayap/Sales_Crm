import User from '../models/User.js';
import Lead from '../models/Lead.js';

export const getSalesUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'sales', isActive: { $ne: false } }).select(
      '_id name email isActive'
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, email, role, isActive, password } = req.body;
    if (name) user.name = name;
    if (email) user.email = email;
    if (role && ['admin', 'sales'].includes(role)) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;
    if (password && password.length >= 6) user.password = password;

    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const assignedCount = await Lead.countDocuments({
      assignedTo: user._id,
      isDeleted: { $ne: true },
    });
    if (assignedCount > 0) {
      return res.status(400).json({
        message: `User has ${assignedCount} assigned leads. Reassign leads first.`,
      });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getUserStats = async (req, res) => {
  try {
    const users = await User.find({ role: 'sales' }).select('-password');
    const stats = await Promise.all(
      users.map(async (u) => {
        const filter = { assignedTo: u._id, isDeleted: { $ne: true } };
        const [total, converted] = await Promise.all([
          Lead.countDocuments(filter),
          Lead.countDocuments({ ...filter, status: { $in: ['Converted', 'Won'] } }),
        ]);
        return {
          user: { _id: u._id, name: u.name, email: u.email, isActive: u.isActive },
          total,
          converted,
          conversionRate: total ? Math.round((converted / total) * 100) : 0,
        };
      })
    );
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
