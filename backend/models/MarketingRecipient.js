import mongoose from 'mongoose';

/**
 * Separate email list for daily study material (e.g. lost / external leads).
 * Not linked to main CRM Lead pipeline.
 */
const marketingRecipientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    mobile: { type: String, default: '', trim: true },
    source: { type: String, default: 'Excel Upload' },
    isDeleted: { type: Boolean, default: false, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

marketingRecipientSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

const MarketingRecipient = mongoose.model('MarketingRecipient', marketingRecipientSchema);
export default MarketingRecipient;
