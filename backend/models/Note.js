import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['internal', 'call', 'meeting', 'feedback'],
      default: 'internal',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Note = mongoose.model('Note', noteSchema);
export default Note;
