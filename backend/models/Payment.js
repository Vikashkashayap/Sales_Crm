import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    installmentNumber: { type: Number, required: true },
    amountPaid: { type: Number, required: true },
    remainingAmount: { type: Number, default: 0 },

    courseName: { type: String, trim: true, default: '' },
    batch: { type: String, trim: true, default: '' },

    receiptUrl: { type: String, default: '' },
    receiptPath: { type: String, default: '' },
    receiptNumber: { type: String, required: true, index: true, unique: true },

    paymentDate: { type: Date, default: Date.now },
    transactionId: { type: String, trim: true, default: '' },
    paymentMode: { type: String, trim: true, default: 'Cash' },
    emailSent: { type: Boolean, default: false },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ student: 1, installmentNumber: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;

