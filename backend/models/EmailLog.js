import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    studentName: { type: String, default: '' },
    email: { type: String, default: '' },
    emailType: {
      type: String,
      enum: ['welcome', 'receipt'],
      required: true,
    },
    medium: { type: String, default: '' },
    attachmentsSent: [{ type: String }],
    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true,
    },
    error: { type: String, default: '' },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
