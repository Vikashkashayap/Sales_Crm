import Note from '../models/Note.js';
import Lead from '../models/Lead.js';
import { logActivity } from '../utils/activityLogger.js';

const canAccessLead = async (leadId, user) => {
  const lead = await Lead.findOne({ _id: leadId, isDeleted: { $ne: true } });
  if (!lead) return { ok: false, status: 404, message: 'Lead not found' };
  if (user.role === 'admin') return { ok: true, lead };
  if (lead.assignedTo?.toString() !== user._id.toString()) {
    return { ok: false, status: 403, message: 'Not authorized' };
  }
  return { ok: true, lead };
};

export const getNotes = async (req, res) => {
  try {
    const access = await canAccessLead(req.params.leadId, req.user);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const notes = await Note.find({ lead: req.params.leadId, isDeleted: { $ne: true } })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const createNote = async (req, res) => {
  try {
    const { content, type } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Content is required' });

    const access = await canAccessLead(req.params.leadId, req.user);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const note = await Note.create({
      lead: req.params.leadId,
      user: req.user._id,
      content: content.trim(),
      type: type || 'internal',
    });

    const populated = await Note.findById(note._id).populate('user', 'name email role');

    await logActivity({
      leadId: req.params.leadId,
      userId: req.user._id,
      type: 'note_added',
      description: `Note added (${type || 'internal'})`,
    });

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.isDeleted) return res.status(404).json({ message: 'Note not found' });

    const access = await canAccessLead(note.lead, req.user);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    if (req.user.role !== 'admin' && note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    note.isDeleted = true;
    await note.save();
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
