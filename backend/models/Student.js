import mongoose from 'mongoose';
import {
  STUDENT_STATUSES,
  PAYMENT_STATUSES,
  ASPIRANT_TYPES,
  EXAM_MEDIUMS,
  ATTEMPT_OPTIONS,
  INSTALLMENT_PLANS,
} from '../utils/studentConstants.js';

const studentSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      unique: true,
      sparse: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    targetYear: { type: String, trim: true, default: '' },
    attemptsSoFar: { type: String, enum: ATTEMPT_OPTIONS, default: '0 (Fresh)' },
    aspirantType: { type: String, enum: ASPIRANT_TYPES, default: 'Full-time' },
    examMedium: { type: String, enum: EXAM_MEDIUMS, default: 'English' },
    optionalSubject: { type: String, trim: true, default: '' },
    assignedBda: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    leadSource: { type: String, trim: true, default: '' },
    leadCampaign: { type: String, trim: true, default: '' },
    leadBdaName: { type: String, trim: true, default: '' },
    programName: { type: String, trim: true, default: '' },
    courseType: { type: String, trim: true, default: '' },
    totalFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    finalFee: { type: Number, default: 0 },
    installmentPlan: {
      type: String,
      enum: INSTALLMENT_PLANS,
      default: 'Full Payment',
    },
    installmentStartDate: { type: Date, default: null },
    amountPaid: { type: Number, default: 0 },
    studentCode: { type: String, trim: true, unique: true, sparse: true },
    refundEligible: { type: Boolean, default: false },
    installments: [
      {
        number: { type: Number, required: true },
        amount: { type: Number, required: true },
        paidAmount: { type: Number, default: 0 },
        dueDate: { type: Date, required: true },
        paidAt: { type: Date, default: null },
        status: {
          type: String,
          enum: ['Pending', 'Partial', 'Paid', 'Overdue'],
          default: 'Pending',
        },
      },
    ],
    status: {
      type: String,
      enum: STUDENT_STATUSES,
      default: 'Onboarding',
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'Pending',
    },
    registeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

studentSchema.index({ fullName: 'text', phone: 'text', email: 'text' });
studentSchema.index({ status: 1 });
studentSchema.index({ paymentStatus: 1 });

const Student = mongoose.model('Student', studentSchema);
export default Student;
