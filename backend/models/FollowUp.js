import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    scheduledAt: { type: Date, required: true, index: true },
    type: { type: String, enum: ['call', 'meeting', 'email', 'task'], default: 'call' },
    title: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed', 'cancelled'],
      default: 'pending',
    },
    completedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

followUpSchema.index({ user: 1, scheduledAt: 1, status: 1 });

const FollowUp = mongoose.model('FollowUp', followUpSchema);
export default FollowUp;
