import mongoose from 'mongoose';

const dailyMaterialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    pdfUrl: { type: String, required: true },
    /** Calendar day when this material should be emailed (stored at local midnight). */
    sendDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

dailyMaterialSchema.index({ sendDate: 1, status: 1 });

const DailyMaterial = mongoose.model('DailyMaterial', dailyMaterialSchema);
export default DailyMaterial;
