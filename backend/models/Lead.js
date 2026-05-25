import mongoose from 'mongoose';
import { LEAD_STATUSES, LEAD_PRIORITIES } from '../utils/constants.js';

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    mobile: { type: String, required: true, trim: true },
    company: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    platform: { type: String, trim: true, default: '' },
    targetYear: { type: String, trim: true, default: '' },
    dateOfBirth: { type: String, trim: true, default: '' },
    gender: { type: String, trim: true, default: '' },
    source: { type: String, trim: true, default: 'Excel Upload' },
    status: {
      type: String,
      enum: LEAD_STATUSES,
      default: 'New',
    },
    priority: {
      type: String,
      enum: LEAD_PRIORITIES,
      default: 'Medium',
    },
    budget: { type: Number, default: null },
    requirement: { type: String, trim: true, default: '' },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    followupDate: { type: Date, default: null },
    dealValue: { type: Number, default: null },
    lossReason: { type: String, trim: true, default: '' },
    tags: [{ type: String, trim: true }],
    notes: [{ type: String, trim: true }],
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

leadSchema.index({ name: 'text', mobile: 'text', email: 'text', company: 'text' });
leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ mobile: 1 });

const Lead = mongoose.model('Lead', leadSchema);
export default Lead;
