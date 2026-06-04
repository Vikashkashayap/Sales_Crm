import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', index: true },
    studentName: { type: String, default: '' },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    marketingRecipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MarketingRecipient',
      index: true,
    },
    materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyMaterial', index: true },
    subject: { type: String, default: '' },
    email: { type: String, default: '' },
    emailType: {
      type: String,
      enum: ['welcome', 'receipt', 'daily_material'],
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
