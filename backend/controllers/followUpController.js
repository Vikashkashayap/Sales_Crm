import FollowUp from '../models/FollowUp.js';
import Lead from '../models/Lead.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notifications.js';

const canAccessLead = async (leadId, user) => {
  const lead = await Lead.findOne({ _id: leadId, isDeleted: { $ne: true } });
  if (!lead) return { ok: false, status: 404, message: 'Lead not found' };
  if (user.role === 'admin') return { ok: true, lead };
  if (lead.assignedTo?.toString() !== user._id.toString()) {
    return { ok: false, status: 403, message: 'Not authorized' };
  }
  return { ok: true, lead };
};

export const getFollowUps = async (req, res) => {
  try {
    const filter = { isDeleted: { $ne: true } };
    if (req.user.role !== 'admin') filter.user = req.user._id;
    else if (req.query.userId) filter.user = req.query.userId;

    if (req.query.status) filter.status = req.query.status;

    if (req.query.from || req.query.to) {
      filter.scheduledAt = {};
      if (req.query.from) filter.scheduledAt.$gte = new Date(req.query.from);
      if (req.query.to) filter.scheduledAt.$lte = new Date(req.query.to);
    }

    const followups = await FollowUp.find(filter)
      .populate('lead', 'name mobile status company')
      .populate('user', 'name email')
      .sort({ scheduledAt: 1 });

    res.json(followups);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getCalendar = async (req, res) => {
  try {
    const start = req.query.start ? new Date(req.query.start) : new Date();
    const end = req.query.end
      ? new Date(req.query.end)
      : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);

    const filter = {
      isDeleted: { $ne: true },
      scheduledAt: { $gte: start, $lte: end },
    };
    if (req.user.role !== 'admin') filter.user = req.user._id;

    const events = await FollowUp.find(filter)
      .populate('lead', 'name mobile status')
      .populate('user', 'name')
      .sort({ scheduledAt: 1 });

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const createFollowUp = async (req, res) => {
  try {
    const { leadId, scheduledAt, type, title, notes } = req.body;
    if (!leadId || !scheduledAt) {
      return res.status(400).json({ message: 'leadId and scheduledAt are required' });
    }

    const access = await canAccessLead(leadId, req.user);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const assignee =
      req.user.role === 'admin' && req.body.userId ? req.body.userId : req.user._id;

    const followup = await FollowUp.create({
      lead: leadId,
      user: assignee,
      scheduledAt: new Date(scheduledAt),
      type: type || 'call',
      title: title || '',
      notes: notes || '',
    });

    await Lead.findByIdAndUpdate(leadId, { followupDate: new Date(scheduledAt) });

    await logActivity({
      leadId,
      userId: req.user._id,
      type: 'followup_scheduled',
      description: `Follow-up scheduled for ${new Date(scheduledAt).toLocaleString()}`,
    });

    const populated = await FollowUp.findById(followup._id)
      .populate('lead', 'name mobile status')
      .populate('user', 'name email');

    if (assignee.toString() !== req.user._id.toString()) {
      await createNotification({
        userId: assignee,
        type: 'followup_reminder',
        title: 'Follow-up scheduled',
        message: `Follow-up scheduled: ${access.lead.name}`,
        link: '/leads',
        metadata: { followUpId: followup._id },
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    const followup = await FollowUp.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!followup) return res.status(404).json({ message: 'Follow-up not found' });

    if (
      req.user.role !== 'admin' &&
      followup.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const allowed = ['scheduledAt', 'type', 'title', 'notes', 'status'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) followup[key] = req.body[key];
    });

    if (req.body.status === 'completed') {
      followup.completedAt = new Date();
      await logActivity({
        leadId: followup.lead,
        userId: req.user._id,
        type: 'followup_completed',
        description: 'Follow-up marked completed',
      });
    }

    await followup.save();
    const populated = await FollowUp.findById(followup._id)
      .populate('lead', 'name mobile status')
      .populate('user', 'name email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteFollowUp = async (req, res) => {
  try {
    const followup = await FollowUp.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    });
    if (!followup) return res.status(404).json({ message: 'Follow-up not found' });

    if (
      req.user.role !== 'admin' &&
      followup.user.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    followup.isDeleted = true;
    followup.status = 'cancelled';
    await followup.save();
    res.json({ message: 'Follow-up cancelled' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
