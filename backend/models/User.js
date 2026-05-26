import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ['admin', 'sales'], default: 'sales' },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    employeeId: { type: String, trim: true, default: '' },
    weeklyAdmissionTarget: { type: Number, default: 2, min: 0 },
    weeklyRevenueTarget: { type: Number, default: 120000, min: 0 },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
