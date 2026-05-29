import mongoose from 'mongoose';

const REMINDER_TYPES = ['reminder', 'due_today', 'overdue'];

const reminderLogSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    installmentId: { type: String, required: true },
    installmentNumber: { type: Number, required: true },
    type: { type: String, enum: REMINDER_TYPES, required: true },
    email: { type: String, required: true },
    status: { type: String, enum: ['sent', 'failed'], required: true },
    error: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
    dueDate: { type: Date, default: null },
  },
  { timestamps: true }
);

reminderLogSchema.index(
  { studentId: 1, installmentNumber: 1, type: 1 },
  { unique: true }
);

export { REMINDER_TYPES };

const ReminderLog = mongoose.model('ReminderLog', reminderLogSchema);
export default ReminderLog;
