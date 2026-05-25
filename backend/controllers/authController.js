import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'sales',
    });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

/** One-time seed: create first admin. No auth. Only works when zero admins exist. */
export const seedAdmin = async (req, res) => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({
        message: 'Admin already exists. Use login or register (as admin) to create more users.',
      });
    }
    const { name = 'Admin', email = 'admin@crm.com', password = 'admin123' } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }
    const user = await User.create({
      name: name || 'Admin',
      email,
      password,
      role: 'admin',
    });
    res.status(201).json({
      message: 'Admin created successfully',
      email: user.email,
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.isActive === false) {
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    }
    user.lastLoginAt = new Date();
    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
