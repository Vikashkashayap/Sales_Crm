import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
    totalHours: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['present', 'absent', 'half-day'],
      default: 'present',
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
