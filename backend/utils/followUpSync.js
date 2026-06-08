import FollowUp from '../models/FollowUp.js';
import Lead from '../models/Lead.js';
import { logActivity } from './activityLogger.js';

const NOTE_SEP = ' • ';

export function parseLatestLeadNote(notes) {
  if (!Array.isArray(notes) || !notes.length) return '';
  const last = notes[notes.length - 1];
  const idx = last.indexOf(NOTE_SEP);
  if (idx > 0 && /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}$/.test(last.slice(0, idx))) {
    return last.slice(idx + NOTE_SEP.length);
  }
  return last;
}

export async function syncFollowUpForFollowUpStatus({ lead, assigneeUserId, actorUserId }) {
  if (!assigneeUserId) return null;

  const scheduledAt = lead.followupDate ? new Date(lead.followupDate) : new Date();
  const noteText = parseLatestLeadNote(lead.notes);

  const existing = await FollowUp.findOne({
    lead: lead._id,
    status: 'pending',
    isDeleted: { $ne: true },
  });

  if (existing) {
    if (noteText) existing.notes = noteText;
    if (lead.followupDate) existing.scheduledAt = scheduledAt;
    existing.user = assigneeUserId;
    await existing.save();
    return existing;
  }

  const followup = await FollowUp.create({
    lead: lead._id,
    user: assigneeUserId,
    scheduledAt,
    type: 'call',
    title: 'Follow-up conversation',
    notes: noteText,
    status: 'pending',
  });

  if (actorUserId) {
    await logActivity({
      leadId: lead._id,
      userId: actorUserId,
      type: 'followup_scheduled',
      description: `Lead moved to Follow-up${noteText ? `: ${noteText.slice(0, 80)}` : ''}`,
    });
  }

  return followup;
}

export async function cancelPendingFollowUpsForLead(leadId) {
  await FollowUp.updateMany(
    { lead: leadId, status: 'pending', isDeleted: { $ne: true } },
    { $set: { isDeleted: true, status: 'cancelled' } }
  );
}

export async function syncFollowUpNotesForLead(leadId, notes) {
  const noteText = parseLatestLeadNote(notes);
  if (!noteText) return;

  await FollowUp.updateMany(
    { lead: leadId, status: 'pending', isDeleted: { $ne: true } },
    { $set: { notes: noteText } }
  );
}

/** Ensures every lead with status Follow-up has a pending FollowUp record (admin backfill). */
export async function ensureFollowUpRecordsForLeads() {
  const leads = await Lead.find({ status: 'Follow-up', isDeleted: { $ne: true } })
    .select('notes followupDate assignedTo createdBy');

  for (const lead of leads) {
    const assignee = lead.assignedTo || lead.createdBy;
    if (!assignee) continue;

    const existing = await FollowUp.findOne({
      lead: lead._id,
      status: 'pending',
      isDeleted: { $ne: true },
    });

    const noteText = parseLatestLeadNote(lead.notes);
    const scheduledAt = lead.followupDate || new Date();

    if (existing) {
      let changed = false;
      if (noteText && existing.notes !== noteText) {
        existing.notes = noteText;
        changed = true;
      }
      if (existing.user?.toString() !== assignee.toString()) {
        existing.user = assignee;
        changed = true;
      }
      if (changed) await existing.save();
    } else {
      await FollowUp.create({
        lead: lead._id,
        user: assignee,
        scheduledAt,
        type: 'call',
        title: 'Follow-up conversation',
        notes: noteText,
        status: 'pending',
      });
    }
  }
}
