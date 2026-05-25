import Task from '../models/Task.js';
import Lead from '../models/Lead.js';

export const getTasks = async (req, res) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.user.role !== 'admin') filter.user = req.user._id;
    if (req.query.status) filter.status = req.query.status;

    const tasks = await Task.find(filter)
      .populate('lead', 'name mobile status')
      .sort({ dueDate: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, leadId } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: 'Title is required' });

    if (leadId) {
      const lead = await Lead.findOne({ _id: leadId, isDeleted: { $ne: true } });
      if (!lead) return res.status(404).json({ message: 'Lead not found' });
      if (
        req.user.role === 'sales' &&
        lead.assignedTo?.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: 'Not authorized' });
      }
    }

    const task = await Task.create({
      title: title.trim(),
      description: description || '',
      dueDate: dueDate || null,
      priority: priority || 'Medium',
      lead: leadId || null,
      user: req.user._id,
    });

    const populated = await Task.findById(task._id).populate('lead', 'name mobile status');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role !== 'admin' && task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    ['title', 'description', 'dueDate', 'priority', 'status'].forEach((key) => {
      if (req.body[key] !== undefined) task[key] = req.body[key];
    });
    await task.save();

    const populated = await Task.findById(task._id).populate('lead', 'name mobile status');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role !== 'admin' && task.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    task.isDeleted = true;
    await task.save();
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
