import Lead from '../models/Lead.js';
import User from '../models/User.js';
import FollowUp from '../models/FollowUp.js';
import * as XLSX from 'xlsx';
import {
  normalizeEmail,
  normalizeMobile,
  parseAllSheets,
  parsePastedGrid,
} from '../utils/excelImport.js';
import { logActivity } from '../utils/activityLogger.js';
import { createNotification } from '../utils/notifications.js';
import { buildRoleFilter } from '../utils/leadHelpers.js';
import { LEAD_STATUSES } from '../utils/constants.js';
import {
  syncFollowUpForFollowUpStatus,
  cancelPendingFollowUpsForLead,
  syncFollowUpNotesForLead,
} from '../utils/followUpSync.js';

const populateOpts = { path: 'assignedTo', select: 'name email' };

async function assertCanAssignLeads(req, leads) {
  if (req.user.role === 'admin') return;
  for (const lead of leads) {
    if (lead.assignedTo?.toString() !== req.user._id.toString()) {
      const err = new Error('You can only transfer leads assigned to you');
      err.status = 403;
      throw err;
    }
  }
}

async function validateAssignee(assignedTo, req) {
  if (!assignedTo) {
    if (req.user.role === 'sales') {
      const err = new Error('Select a BDA to transfer the lead to');
      err.status = 400;
      throw err;
    }
    return null;
  }
  const user = await User.findOne({ _id: assignedTo, role: 'sales', isActive: { $ne: false } });
  if (!user) {
    const err = new Error('Invalid BDA selected');
    err.status = 400;
    throw err;
  }
  return user;
}

const syncFollowUpForLead = async ({ lead, followupDate, assigneeUserId, actorUserId }) => {
  // If followup is cleared, cancel pending followups for this lead.
  if (!followupDate) {
    await FollowUp.updateMany(
      { lead: lead._id, status: 'pending', isDeleted: { $ne: true } },
      { $set: { isDeleted: true, status: 'cancelled' } }
    );
    return;
  }

  const scheduledAt = new Date(followupDate);
  if (Number.isNaN(scheduledAt.getTime())) return;

  // Keep at most one active pending follow-up per lead.
  await FollowUp.updateMany(
    { lead: lead._id, status: 'pending', isDeleted: { $ne: true } },
    { $set: { isDeleted: true, status: 'cancelled' } }
  );

  await FollowUp.create({
    lead: lead._id,
    user: assigneeUserId,
    scheduledAt,
    type: 'call',
    title: '',
    notes: '',
    status: 'pending',
  });

  // keep lead.followupDate in sync (already set by caller, but ensure)
  await Lead.findByIdAndUpdate(lead._id, { followupDate: scheduledAt });

  // optional activity log, only when we have actor
  if (actorUserId) {
    await logActivity({
      leadId: lead._id,
      userId: actorUserId,
      type: 'followup_scheduled',
      description: `Follow-up scheduled for ${scheduledAt.toLocaleString()}`,
    });
  }
};

const parseListQuery = (req) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const filter = buildRoleFilter(req.user);

  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;
  if (req.query.source) filter.source = new RegExp(req.query.source, 'i');

  if (req.query.search) {
    const s = req.query.search.trim();
    filter.$or = [
      { name: new RegExp(s, 'i') },
      { mobile: new RegExp(s, 'i') },
      { email: new RegExp(s, 'i') },
      { company: new RegExp(s, 'i') },
      { city: new RegExp(s, 'i') },
      { platform: new RegExp(s, 'i') },
      { targetYear: new RegExp(s, 'i') },
      { requirement: new RegExp(s, 'i') },
      { gender: new RegExp(s, 'i') },
    ];
  }

  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  return { filter, page, limit, skip, sort: { [sortBy]: sortOrder } };
};

export const getLeads = async (req, res) => {
  try {
    const hasQuery =
      req.query.page ||
      req.query.search ||
      req.query.status ||
      req.query.priority ||
      req.query.assignedTo ||
      req.query.source ||
      req.query.limit;

    if (!hasQuery) {
      const leads = await Lead.find(buildRoleFilter(req.user))
        .populate(populateOpts)
        .sort({ createdAt: -1 });
      return res.json(leads);
    }

    const { filter, page, limit, skip, sort } = parseListQuery(req);
    const [leads, total] = await Promise.all([
      Lead.find(filter).populate(populateOpts).sort(sort).skip(skip).limit(limit),
      Lead.countDocuments(filter),
    ]);

    res.json({
      leads,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).populate(populateOpts);

    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (
      req.user.role === 'sales' &&
      lead.assignedTo?._id?.toString() !== req.user._id.toString() &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const createLead = async (req, res) => {
  try {
    const { name, mobile } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ message: 'Name and mobile are required' });
    }

    const duplicate = await Lead.findOne({
      mobile: String(mobile).trim(),
      isDeleted: { $ne: true },
    });
    if (duplicate) {
      return res.status(409).json({
        message: 'A lead with this mobile number already exists',
        duplicateId: duplicate._id,
      });
    }

    const assignedTo = req.body.assignedTo || null;
    if (assignedTo) {
      await validateAssignee(assignedTo, req);
    }

    const payload = {
      name: name.trim(),
      mobile: String(mobile).trim(),
      email: req.body.email || '',
      company: req.body.company || '',
      city: req.body.city || '',
      platform: req.body.platform || '',
      targetYear: req.body.targetYear || '',
      dateOfBirth: req.body.dateOfBirth || '',
      gender: req.body.gender || '',
      source: req.body.source || 'Manual',
      status: LEAD_STATUSES.includes(req.body.status) ? req.body.status : 'New',
      priority: req.body.priority || 'Medium',
      budget: req.body.budget ?? null,
      requirement: req.body.requirement || '',
      assignedTo,
      followupDate: req.body.followupDate || null,
      dealValue: req.body.dealValue ?? null,
      tags: req.body.tags || [],
      createdBy: req.user._id,
    };

    const lead = await Lead.create(payload);
    const populated = await Lead.findById(lead._id).populate(populateOpts);

    await logActivity({
      leadId: lead._id,
      userId: req.user._id,
      type: 'lead_created',
      description: `Lead "${lead.name}" created`,
    });

    if (payload.followupDate) {
      const assigneeUserId = payload.assignedTo || req.user._id;
      await syncFollowUpForLead({
        lead,
        followupDate: payload.followupDate,
        assigneeUserId,
        actorUserId: req.user._id,
      });
    }

    if (payload.assignedTo) {
      await createNotification({
        userId: payload.assignedTo,
        type: 'lead_assigned',
        title: 'New lead assigned',
        message: `You have been assigned lead: ${lead.name}`,
        link: `/leads`,
        metadata: { leadId: lead._id },
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    if (
      req.user.role === 'sales' &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized to update this lead' });
    }

    const adminFields = [
      'status', 'followupDate', 'dealValue', 'lossReason', 'notes',
      'name', 'mobile', 'city', 'source', 'email', 'company', 'priority',
      'platform', 'targetYear', 'dateOfBirth', 'gender',
      'budget', 'requirement', 'tags', 'assignedTo',
    ];
    const salesFields = [
      'status', 'followupDate', 'dealValue', 'lossReason', 'notes',
      'priority', 'budget', 'requirement', 'platform', 'targetYear',
      'dateOfBirth', 'gender', 'tags',
    ];
    const allowed = req.user.role === 'admin' ? adminFields : salesFields;

    const updates = {};
    Object.keys(req.body).forEach((key) => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    if (updates.mobile && updates.mobile !== lead.mobile) {
      const dup = await Lead.findOne({
        mobile: String(updates.mobile).trim(),
        _id: { $ne: lead._id },
        isDeleted: { $ne: true },
      });
      if (dup) {
        return res.status(409).json({ message: 'Mobile number already exists on another lead' });
      }
    }

    const prevStatus = lead.status;
    const prevAssignee = lead.assignedTo?.toString();
    const prevFollowup = lead.followupDate ? new Date(lead.followupDate).toISOString() : null;

    const updated = await Lead.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate(populateOpts);

    if (updates.status && updates.status !== prevStatus) {
      await logActivity({
        leadId: lead._id,
        userId: req.user._id,
        type: 'status_changed',
        description: `Status changed from ${prevStatus} to ${updates.status}`,
        metadata: { from: prevStatus, to: updates.status },
      });
    } else if (Object.keys(updates).length) {
      await logActivity({
        leadId: lead._id,
        userId: req.user._id,
        type: 'lead_updated',
        description: `Lead "${lead.name}" updated`,
        metadata: { fields: Object.keys(updates) },
      });
    }

    if (updates.assignedTo && updates.assignedTo.toString() !== prevAssignee) {
      await logActivity({
        leadId: lead._id,
        userId: req.user._id,
        type: 'lead_assigned',
        description: `Lead reassigned`,
        metadata: { assignedTo: updates.assignedTo },
      });
      if (updates.assignedTo) {
        await createNotification({
          userId: updates.assignedTo,
          type: 'lead_assigned',
          title: 'Lead assigned to you',
          message: `Lead "${lead.name}" has been assigned to you`,
          link: '/leads',
          metadata: { leadId: lead._id },
        });
      }
    }

    // Sync follow-ups whenever followupDate changes (or when assignee changes while followup exists)
    const nextFollowup = updated.followupDate ? new Date(updated.followupDate).toISOString() : null;
    const followupChanged = updates.followupDate !== undefined && nextFollowup !== prevFollowup;
    const assigneeChangedWithFollowup =
      updates.assignedTo !== undefined && nextFollowup && updated.assignedTo?._id?.toString() !== prevAssignee;

    if (followupChanged || assigneeChangedWithFollowup) {
      const assigneeUserId = updated.assignedTo?._id || updated.assignedTo || req.user._id;
      await syncFollowUpForLead({
        lead: updated,
        followupDate: updated.followupDate,
        assigneeUserId,
        actorUserId: req.user._id,
      });
    }

    if (updates.status === 'Follow-up' && prevStatus !== 'Follow-up') {
      const assigneeUserId =
        updated.assignedTo?._id || updated.assignedTo || req.user._id;
      await syncFollowUpForFollowUpStatus({
        lead: updated,
        assigneeUserId,
        actorUserId: req.user._id,
      });
    } else if (prevStatus === 'Follow-up' && updates.status && updates.status !== 'Follow-up') {
      await cancelPendingFollowUpsForLead(lead._id);
    }

    if (updates.notes !== undefined && updated.status === 'Follow-up') {
      await syncFollowUpNotesForLead(lead._id, updates.notes);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    lead.isDeleted = true;
    await lead.save();

    await logActivity({
      leadId: lead._id,
      userId: req.user._id,
      type: 'lead_deleted',
      description: `Lead "${lead.name}" deleted`,
    });

    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const assignLead = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await assertCanAssignLeads(req, [lead]);
    await validateAssignee(assignedTo, req);

    const prev = lead.assignedTo?.toString();
    lead.assignedTo = assignedTo || null;
    await lead.save();

    const updated = await Lead.findById(lead._id).populate(populateOpts);

    await logActivity({
      leadId: lead._id,
      userId: req.user._id,
      type: 'lead_assigned',
      description: assignedTo ? `Lead assigned to team member` : `Lead unassigned`,
      metadata: { assignedTo },
    });

    if (assignedTo && assignedTo.toString() !== prev) {
      await createNotification({
        userId: assignedTo,
        type: 'lead_assigned',
        title: 'Lead assigned to you',
        message: `Lead "${lead.name}" has been assigned to you`,
        link: '/leads',
        metadata: { leadId: lead._id },
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Server error' });
  }
};

export const bulkAssignLeads = async (req, res) => {
  try {
    const { ids, assignedTo } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Select at least one lead' });
    }

    const leads = await Lead.find({ _id: { $in: ids }, isDeleted: { $ne: true } });
    if (!leads.length) {
      return res.status(404).json({ message: 'No valid leads found' });
    }

    await assertCanAssignLeads(req, leads);
    await validateAssignee(assignedTo, req);

    const leadIds = leads.map((l) => l._id);
    await Lead.updateMany({ _id: { $in: leadIds } }, { assignedTo: assignedTo || null });

    for (const lead of leads) {
      const prev = lead.assignedTo?.toString();
      await logActivity({
        leadId: lead._id,
        userId: req.user._id,
        type: 'lead_assigned',
        description: assignedTo ? 'Lead assigned (bulk)' : 'Lead unassigned (bulk)',
        metadata: { assignedTo, bulk: true },
      });
      if (assignedTo && assignedTo.toString() !== prev) {
        await createNotification({
          userId: assignedTo,
          type: 'lead_assigned',
          title: 'Lead assigned to you',
          message: `Lead "${lead.name}" has been assigned to you`,
          link: '/leads',
          metadata: { leadId: lead._id },
        });
      }
    }

    res.json({
      message: `${leads.length} lead(s) ${assignedTo ? 'assigned' : 'unassigned'}`,
      count: leads.length,
    });
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Server error' });
  }
};

export const bulkDeleteLeads = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Select at least one lead' });
    }

    const leads = await Lead.find({ _id: { $in: ids }, isDeleted: { $ne: true } });
    if (!leads.length) {
      return res.status(404).json({ message: 'No valid leads found' });
    }

    const leadIds = leads.map((l) => l._id);
    await Lead.updateMany({ _id: { $in: leadIds } }, { isDeleted: true });

    for (const lead of leads) {
      await logActivity({
        leadId: lead._id,
        userId: req.user._id,
        type: 'lead_deleted',
        description: `Lead "${lead.name}" deleted (bulk)`,
        metadata: { bulk: true },
      });
    }

    res.json({ message: `${leads.length} lead(s) deleted`, count: leads.length });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const checkDuplicates = async (req, res) => {
  try {
    const { mobile } = req.query;
    if (!mobile) return res.status(400).json({ message: 'mobile query required' });
    const existing = await Lead.find({
      mobile: String(mobile).trim(),
      isDeleted: { $ne: true },
    }).select('name mobile status assignedTo createdAt').populate('assignedTo', 'name');
    res.json({ duplicates: existing, count: existing.length });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getLeadHistory = async (req, res) => {
  try {
    const lead = await Lead.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    if (
      req.user.role === 'sales' &&
      lead.assignedTo?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const Activity = (await import('../models/Activity.js')).default;
    const activities = await Activity.find({ lead: req.params.id })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const importParsedLeads = async (req, res, { parsed, sheetResults, activityLabel, defaultSource, emptyPayload }) => {
  const importedSheets = sheetResults.filter((s) => s.imported > 0).map((s) => s.sheet);
  const emptySheets = sheetResults.filter((s) => s.skipped).map((s) => s.sheet);
  const assignedTo = req.body.assignedTo || null;
  if (assignedTo) {
    await validateAssignee(assignedTo, req);
  }

  if (parsed.length === 0) {
    return res.status(400).json({
      sheetResults,
      ...emptyPayload,
    });
  }

  const existingLeads = await Lead.find({ isDeleted: { $ne: true } })
    .select('mobile email name')
    .lean();

  const existingMobiles = new Set();
  const existingEmails = new Set();
  for (const l of existingLeads) {
    if (l.mobile) {
      existingMobiles.add(l.mobile.trim().toLowerCase());
      const norm = normalizeMobile(l.mobile);
      if (norm) existingMobiles.add(norm);
    }
    const em = normalizeEmail(l.email);
    if (em) existingEmails.add(em);
  }

  const skippedDuplicates = [];
  const toInsert = [];
  const seenInFile = new Set();

  for (const row of parsed) {
    const mobileKey = normalizeMobile(row.mobile) || row.mobile.trim().toLowerCase();
    const emailKey = normalizeEmail(row.email);
    const dedupeKey = mobileKey || emailKey;

    if (!dedupeKey) continue;

    if (
      seenInFile.has(dedupeKey) ||
      existingMobiles.has(mobileKey) ||
      existingMobiles.has(row.mobile.trim().toLowerCase()) ||
      (emailKey && existingEmails.has(emailKey))
    ) {
      skippedDuplicates.push({ name: row.name, mobile: row.mobile, email: row.email, source: row.source });
      continue;
    }

    seenInFile.add(dedupeKey);
    existingMobiles.add(mobileKey);
    existingMobiles.add(row.mobile.trim().toLowerCase());
    if (emailKey) existingEmails.add(emailKey);

    toInsert.push({
      name: row.name,
      mobile: normalizeMobile(row.mobile) || row.mobile,
      email: emailKey || '',
      city: row.city || '',
      platform: row.platform || '',
      targetYear: row.targetYear || '',
      requirement: row.requirement || '',
      dateOfBirth: row.dateOfBirth || '',
      gender: row.gender || '',
      source: row.source || defaultSource,
      company: row.company || '',
      status: 'New',
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
    });
  }

  if (toInsert.length === 0) {
    return res.status(400).json({
      message: `All ${parsed.length} row(s) already exist in CRM.`,
      skippedDuplicates: skippedDuplicates.length,
      sheetsProcessed: importedSheets,
      sheetResults,
      hint: 'Duplicates matched by mobile or email. Delete old leads or upload only new rows.',
    });
  }

  const result = await Lead.insertMany(toInsert);

  await logActivity({
    leadId: null,
    userId: req.user._id,
    type: 'lead_created',
    description: `Imported ${result.length} leads from ${activityLabel} (${importedSheets.join(', ')})`,
    metadata: {
      count: result.length,
      skippedDuplicates: skippedDuplicates.length,
      sheets: importedSheets,
      assignedTo,
    },
  });

  if (assignedTo) {
    await createNotification({
      userId: assignedTo,
      type: 'lead_assigned',
      title: 'New leads assigned',
      message: `${result.length} lead(s) from ${activityLabel} import have been assigned to you`,
      link: '/leads',
      metadata: { count: result.length, bulk: true },
    });
  }

  const parts = [`${result.length} lead(s) imported`, `(${importedSheets.join(', ')})`];
  if (skippedDuplicates.length) parts.push(`${skippedDuplicates.length} duplicate(s) skipped`);
  if (emptySheets.length) parts.push(`${emptySheets.length} empty/skipped tab(s)`);

  return res.status(201).json({
    message: parts.join('. ') + '.',
    count: result.length,
    skippedDuplicates: skippedDuplicates.length,
    sheetsProcessed: importedSheets,
    sheetResults,
    duplicates: skippedDuplicates.slice(0, 20),
  });
};

export const uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No Excel file uploaded' });
    }
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const { parsed, sheetResults } = parseAllSheets(workbook);

    return importParsedLeads(req, res, {
      parsed,
      sheetResults,
      activityLabel: 'Excel',
      defaultSource: 'Excel Upload',
      emptyPayload: {
        message:
          'No valid leads found in any sheet. Each tab needs Name + Phone or Email columns.',
        sheets: workbook.SheetNames,
        hint: 'Supported tabs: WebsiteFormData, Prelims confidence Batch, FormResponses, etc.',
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const uploadPastedLeads = async (req, res) => {
  try {
    const { text, source } = req.body;
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: 'Paste Excel data first (copy rows, then Ctrl+V here).' });
    }
    const sourceName = String(source || 'Paste Upload').trim() || 'Paste Upload';
    const { parsed, sheetResults } = parsePastedGrid(text, sourceName);

    return importParsedLeads(req, res, {
      parsed,
      sheetResults,
      activityLabel: 'paste',
      defaultSource: sourceName,
      emptyPayload: {
        message: 'No valid leads found. Include a header row with Name and Phone or Email columns.',
        hint: 'Copy rows from Excel (Ctrl+C) and paste here. Column tabs from Excel are detected automatically.',
        headers: sheetResults.find((s) => s.headers)?.headers,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const exportLeads = async (req, res) => {
  try {
    const filter = buildRoleFilter(req.user);
    if (req.query.status) filter.status = req.query.status;

    const leads = await Lead.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const data = leads.map((l) => ({
      'Full Name': l.name,
      Phone: l.mobile,
      Email: l.email || '',
      Platform: l.platform || '',
      'Target Year': l.targetYear || '',
      'Why Prepare': l.requirement || '',
      'Date of Birth': l.dateOfBirth || '',
      Gender: l.gender || '',
      Company: l.company || '',
      City: l.city || '',
      Source: l.source || '',
      Status: l.status,
      Priority: l.priority || '',
      Budget: l.budget ?? '',
      AssignedTo: l.assignedTo?.name || '',
      FollowUp: l.followupDate ? new Date(l.followupDate).toISOString() : '',
      DealValue: l.dealValue ?? '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.xlsx');
    res.send(buf);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
