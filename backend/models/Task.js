import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    dueDate: { type: Date, default: null },
    priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Task = mongoose.model('Task', taskSchema);
export default Task;
