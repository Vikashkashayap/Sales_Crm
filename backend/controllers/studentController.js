import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import Student from '../models/Student.js';
import Lead from '../models/Lead.js';
import Payment from '../models/Payment.js';
import EmailLog from '../models/EmailLog.js';
import ReminderLog from '../models/ReminderLog.js';
import Activity from '../models/Activity.js';
import { CONVERTED_STATUSES } from '../utils/studentConstants.js';
import { logActivity } from '../utils/activityLogger.js';
import { buildStudentFilter, buildPendingApprovalFilter } from '../utils/studentPaymentFilter.js';
import {
  buildInstallments,
  resolveInstallments,
  getInstallmentBalanceTotal,
  derivePaymentStatus,
  generateStudentCode,
  ensureStudentInstallments,
} from '../utils/paymentHelpers.js';
import { sendWelcomeEmail, sendBdaSaleConfirmationEmail } from '../services/emailService.js';

const toObjectId = (id, fallback) => {
  if (!id || id === 'null' || id === 'undefined') return fallback;
  const s = String(id).trim();
  if (!mongoose.Types.ObjectId.isValid(s)) return fallback;
  return new mongoose.Types.ObjectId(s);
};

const populateOpts = [
  { path: 'assignedBda', select: 'name email' },
  { path: 'registeredBy', select: 'name email' },
  { path: 'approvedBy', select: 'name email' },
  { path: 'rejectedBy', select: 'name email' },
  { path: 'leadId', select: 'name mobile email source status assignedTo' },
];

const appendBdaConfirmationNote = (message, bdaResult) => {
  if (!bdaResult?.sent || !bdaResult?.to) return message;
  return `${message} Confirmation email sent to BDA (${bdaResult.to}).`;
};

const sendWelcomeForStudent = async (student, { paymentMode, transactionId } = {}) => {
  if (!student.email) {
    return {
      welcomeEmailSent: false,
      welcomeEmailMessage: 'Student approved. Add an email address to send the welcome kit.',
      welcomeEmailWarning: false,
      bdaEmailSent: false,
    };
  }
  try {
    const result = await sendWelcomeEmail(student, {
      paymentMode: paymentMode?.trim() || student.paymentMode || 'Cash',
      transactionId: transactionId?.trim() || student.transactionId || '',
    });
    const bdaResult = await sendBdaSaleConfirmationEmail(student, {
      studentEmail: student.email,
      receiptAttached: Boolean(result.receiptAttached),
    });
    const receiptNote = result.receiptAttached
      ? ' Fee invoice attached.'
      : Number(student.finalFee) > 0
        ? ''
        : ' No fee invoice (fee not set).';
    if (result.missingAttachments?.length) {
      return {
        welcomeEmailSent: true,
        welcomeEmailMessage: appendBdaConfirmationNote(
          `Welcome email sent.${receiptNote} Some PDF attachments were missing on the server.`,
          bdaResult
        ),
        welcomeEmailWarning: true,
        bdaEmailSent: Boolean(bdaResult.sent),
      };
    }
    return {
      welcomeEmailSent: true,
      welcomeEmailMessage: appendBdaConfirmationNote(
        `Welcome email sent to student.${receiptNote}`,
        bdaResult
      ),
      welcomeEmailWarning: false,
      bdaEmailSent: Boolean(bdaResult.sent),
    };
  } catch (e) {
    return {
      welcomeEmailSent: false,
      welcomeEmailMessage: e.message || 'Approved, but welcome email could not be sent.',
      welcomeEmailWarning: true,
      bdaEmailSent: false,
    };
  }
};

export const getRegisteredLeadIds = async (req, res) => {
  try {
    let leadIdQuery = { $ne: null };

    if (req.user.role !== 'admin') {
      const assignedLeadIds = await Lead.find({
        assignedTo: req.user._id,
        isDeleted: { $ne: true },
      }).distinct('_id');
      leadIdQuery = { $in: assignedLeadIds };
    }

    const students = await Student.find({ leadId: leadIdQuery }).select('leadId');
    res.json({ leadIds: students.map((s) => String(s.leadId)) });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getStudentByLeadId = async (req, res) => {
  try {
    const student = await Student.findOne({ leadId: req.params.leadId }).populate(populateOpts);
    if (!student) {
      return res.json({ registered: false, student: null });
    }

    const registeredById = student.registeredBy?._id || student.registeredBy;
    const assignedBdaId = student.assignedBda?._id || student.assignedBda;

    if (
      req.user.role !== 'admin' &&
      String(registeredById) !== String(req.user._id) &&
      String(assignedBdaId) !== String(req.user._id)
    ) {
      const lead = await Lead.findById(req.params.leadId);
      if (!lead || String(lead.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({
      registered: true,
      student,
      pendingApproval: student.approvalStatus === 'pending',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getPendingApprovals = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const students = await Student.find(buildPendingApprovalFilter(req.user))
      .populate(populateOpts)
      .sort({ createdAt: -1 });
    res.json(students.map((s) => ensureStudentInstallments(s)));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getMyPendingSubmissions = async (req, res) => {
  try {
    const students = await Student.find(buildPendingApprovalFilter(req.user))
      .populate(populateOpts)
      .sort({ createdAt: -1 });
    res.json(students.map((s) => ensureStudentInstallments(s)));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const approveStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.approvalStatus === 'approved') {
      return res.status(400).json({ message: 'Registration is already approved' });
    }
    if (student.approvalStatus === 'rejected') {
      return res.status(400).json({ message: 'This registration was rejected and cannot be approved' });
    }

    student.approvalStatus = 'approved';
    student.approvedBy = req.user._id;
    student.approvedAt = new Date();
    student.rejectedBy = null;
    student.rejectedAt = null;
    student.rejectionReason = '';
    await student.save();

    const populated = await Student.findById(student._id).populate(populateOpts);
    const emailResult = await sendWelcomeForStudent(populated);

    await logActivity({
      type: 'lead_updated',
      description: `Student "${student.fullName}" registration approved by admin`,
      userId: req.user._id,
      leadId: student.leadId || undefined,
      metadata: { studentId: student._id },
    });

    res.json({
      ...(populated.toObject ? populated.toObject() : populated),
      message: 'Registration approved',
      ...emailResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const rejectStudent = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    if (student.approvalStatus !== 'pending') {
      return res.status(400).json({ message: 'Only pending registrations can be rejected' });
    }

    student.approvalStatus = 'rejected';
    student.rejectedBy = req.user._id;
    student.rejectedAt = new Date();
    student.rejectionReason = req.body.reason?.trim() || '';
    await student.save();

    const populated = await Student.findById(student._id).populate(populateOpts);

    await logActivity({
      type: 'lead_updated',
      description: `Student "${student.fullName}" registration rejected`,
      userId: req.user._id,
      leadId: student.leadId || undefined,
      metadata: { studentId: student._id, reason: student.rejectionReason },
    });

    res.json({
      ...(populated.toObject ? populated.toObject() : populated),
      message: 'Registration rejected',
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getStudentStats = async (req, res) => {
  try {
    const filter = buildStudentFilter(req.user);
    const [total, onboarding, pending, overdue] = await Promise.all([
      Student.countDocuments(filter),
      Student.countDocuments({ ...filter, status: 'Onboarding' }),
      Student.countDocuments({ ...filter, paymentStatus: 'Pending' }),
      Student.countDocuments({ ...filter, paymentStatus: 'Overdue' }),
    ]);
    res.json({ total, onboarding, pending, overdue });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getStudents = async (req, res) => {
  try {
    const filter = buildStudentFilter(req.user);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.search) {
      const s = req.query.search.trim();
      filter.$or = [
        { fullName: new RegExp(s, 'i') },
        { phone: new RegExp(s, 'i') },
        { email: new RegExp(s, 'i') },
        { programName: new RegExp(s, 'i') },
      ];
    }

    const students = await Student.find(filter).populate(populateOpts).sort({ createdAt: -1 });
    res.json(students.map((s) => ensureStudentInstallments(s)));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(populateOpts);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const registeredById = student.registeredBy?._id || student.registeredBy;
    const assignedBdaId = student.assignedBda?._id || student.assignedBda;
    if (
      req.user.role !== 'admin' &&
      String(registeredById) !== String(req.user._id) &&
      String(assignedBdaId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(ensureStudentInstallments(student));
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

const normalizeLeadId = (leadId) => {
  if (!leadId || leadId === 'null' || leadId === 'undefined') return null;
  const s = String(leadId).trim();
  if (!s || !mongoose.Types.ObjectId.isValid(s)) return null;
  return s;
};

export const createStudent = async (req, res) => {
  try {
    const {
      leadId: rawLeadId,
      fullName,
      phone,
      email,
      city,
      state,
      targetYear,
      attemptsSoFar,
      aspirantType,
      examMedium,
      optionalSubject,
      assignedBda,
      leadSource,
      leadCampaign,
      leadBdaName,
      programName,
      courseType,
      totalFee,
      discount,
      installmentPlan,
      customInstallmentCount,
      installmentStartDate,
      amountPaid,
      installments: customInstallments,
      paymentMode,
      transactionId,
      notes,
    } = req.body;

    const leadId = normalizeLeadId(rawLeadId);

    if (!fullName?.trim() || !phone?.trim()) {
      return res.status(400).json({ message: 'Full name and phone are required' });
    }

    if (leadId) {
      const existing = await Student.findOne({ leadId }).populate(populateOpts);
      if (existing) {
        return res.status(409).json({
          message: 'This lead is already registered as a student',
          alreadyRegistered: true,
          student: existing,
        });
      }

      const lead = await Lead.findById(leadId);
      if (!lead || lead.isDeleted) {
        return res.status(404).json({ message: 'Lead not found' });
      }
      if (req.user.role !== 'admin' && String(lead.assignedTo) !== String(req.user._id)) {
        return res.status(403).json({ message: 'You can only register students from your assigned leads' });
      }
      if (!CONVERTED_STATUSES.includes(lead.status)) {
        return res.status(400).json({ message: 'Lead must be marked Won or Converted before registration' });
      }
    }

    const fee = Number(totalFee) || 0;
    const disc = Number(discount) || 0;
    const finalFee = Math.max(0, fee - disc);
    const paid = Number(amountPaid) || 0;
    const plan = installmentPlan || 'Full Payment';
    const startDate =
      installmentStartDate && !Number.isNaN(new Date(installmentStartDate).getTime())
        ? new Date(installmentStartDate)
        : new Date();
    const customCount =
      plan === 'Custom EMI' ? Number(customInstallmentCount) || null : null;
    const installments = resolveInstallments(
      finalFee,
      plan,
      startDate,
      paid,
      customInstallments,
      customCount
    );
    const balanceAfterRegistration = getInstallmentBalanceTotal(finalFee, paid);
    const hasOverdue = installments.some((i) => i.status === 'Overdue');
    const isScholarship = (courseType || '').trim() === 'Scholarship';
    const needsApproval = req.user.role !== 'admin';

    const studentPayload = {
      fullName: fullName.trim(),
      phone: String(phone).trim(),
      email: email?.trim() || '',
      city: city?.trim() || '',
      state: state?.trim() || '',
      targetYear: targetYear?.trim() || '',
      attemptsSoFar: attemptsSoFar || '0 (Fresh)',
      aspirantType: aspirantType || 'Full-time',
      examMedium: examMedium || 'English',
      optionalSubject: optionalSubject?.trim() || '',
      assignedBda: toObjectId(assignedBda, req.user._id),
      leadSource: leadSource?.trim() || '',
      leadCampaign: leadCampaign?.trim() || '',
      leadBdaName: leadBdaName?.trim() || '',
      programName: programName?.trim() || '',
      courseType: courseType?.trim() || 'Integrated',
      totalFee: fee,
      discount: disc,
      finalFee,
      installmentPlan: plan,
      customInstallmentCount: customCount,
      installments,
      amountPaid: paid,
      paymentMode: paymentMode?.trim() || 'Cash',
      transactionId: transactionId?.trim() || '',
      installmentStartDate: balanceAfterRegistration > 0 ? startDate : null,
      paymentStatus: derivePaymentStatus(finalFee, paid, hasOverdue),
      refundEligible: isScholarship,
      status: 'Onboarding',
      approvalStatus: needsApproval ? 'pending' : 'approved',
      approvedBy: needsApproval ? null : req.user._id,
      approvedAt: needsApproval ? null : new Date(),
      registeredBy: req.user._id,
      notes: notes?.trim() || '',
    };

    if (leadId) {
      studentPayload.leadId = leadId;
    }

    let student = null;
    let lastError = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        student = await Student.create({
          ...studentPayload,
          studentCode: await generateStudentCode(),
        });
        break;
      } catch (err) {
        lastError = err;
        if (err.code === 11000 && err.keyPattern?.studentCode) continue;
        throw err;
      }
    }

    if (!student) {
      throw lastError || new Error('Could not create student record');
    }

    await logActivity({
      type: 'lead_updated',
      description: needsApproval
        ? `Student "${student.fullName}" submitted for admin approval`
        : `Student "${student.fullName}" registered`,
      userId: req.user._id,
      leadId: leadId || undefined,
      metadata: { studentId: student._id, approvalStatus: student.approvalStatus },
    });

    const populated = await Student.findById(student._id).populate(populateOpts);

    let welcomeEmailSent = false;
    let welcomeEmailMessage = '';
    let welcomeEmailWarning = false;
    let bdaEmailSent = false;
    let pendingApproval = needsApproval;

    if (needsApproval) {
      welcomeEmailMessage =
        'Registration submitted for admin approval. The student will receive the welcome email after approval.';
    } else {
      const emailResult = await sendWelcomeForStudent(populated, { paymentMode, transactionId });
      welcomeEmailSent = emailResult.welcomeEmailSent;
      welcomeEmailMessage = emailResult.welcomeEmailMessage;
      welcomeEmailWarning = emailResult.welcomeEmailWarning;
      bdaEmailSent = emailResult.bdaEmailSent;
    }

    res.status(201).json({
      ...(populated.toObject ? populated.toObject() : populated),
      pendingApproval,
      welcomeEmailSent,
      welcomeEmailMessage,
      welcomeEmailWarning,
      bdaEmailSent,
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({ message: error.message || 'Invalid installment schedule' });
    }
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors || {})
        .map((e) => e.message)
        .join('. ');
      return res.status(400).json({ message: message || 'Invalid student data' });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({
        message: `Invalid ${error.path || 'field'} — please refresh and try again`,
      });
    }
    if (error.code === 11000) {
      const dupField = Object.keys(error.keyPattern || {})[0] || 'record';
      const leadIdNorm = normalizeLeadId(req.body.leadId);

      if (dupField === 'leadId' && leadIdNorm) {
        const dupLead = await Student.findOne({ leadId: leadIdNorm }).populate(populateOpts);
        if (dupLead) {
          return res.status(409).json({
            message: 'This lead is already registered as a student',
            alreadyRegistered: true,
            student: dupLead,
          });
        }
      }

      if (dupField === 'studentCode') {
        return res.status(400).json({
          message: 'Student ID conflict. Please click Register again.',
        });
      }

      return res.status(400).json({
        message: `Duplicate ${dupField} — change phone/email or use a different lead`,
        field: dupField,
      });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const resendWelcomeEmail = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(populateOpts);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const registeredById = student.registeredBy?._id || student.registeredBy;
    const assignedBdaId = student.assignedBda?._id || student.assignedBda;
    if (
      req.user.role !== 'admin' &&
      String(registeredById) !== String(req.user._id) &&
      String(assignedBdaId) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (student.approvalStatus === 'pending') {
      return res.status(400).json({ message: 'Registration is pending admin approval' });
    }
    if (student.approvalStatus === 'rejected') {
      return res.status(400).json({ message: 'Registration was rejected' });
    }

    if (!student.email) {
      return res.status(400).json({ message: 'Student email is missing. Please add student email first.' });
    }

    const result = await sendWelcomeEmail(student);
    const bdaResult = await sendBdaSaleConfirmationEmail(student, {
      studentEmail: student.email,
      receiptAttached: Boolean(result.receiptAttached),
    });
    const attachmentNote =
      result.missingAttachments?.length > 0
        ? ` (${result.missingAttachments.length} PDF(s) missing on server)`
        : '';
    const receiptNote = result.receiptAttached ? ' Fee invoice attached.' : '';
    const bdaNote = bdaResult.sent ? ` BDA confirmation sent to ${bdaResult.to}.` : '';

    res.json({
      message: `Welcome email sent successfully.${receiptNote}${attachmentNote}${bdaNote}`,
      bdaEmailSent: Boolean(bdaResult.sent),
      medium: result.medium,
      attachmentCount: result.attachmentCount,
      missingAttachments: result.missingAttachments,
      receiptAttached: result.receiptAttached,
      receiptNumber: result.receiptNumber,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Could not send welcome email' });
  }
};

export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    if (
      req.user.role !== 'admin' &&
      String(student.registeredBy) !== String(req.user._id) &&
      String(student.assignedBda) !== String(req.user._id)
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const allowed = [
      'fullName', 'phone', 'email', 'city', 'state', 'targetYear', 'attemptsSoFar',
      'aspirantType', 'examMedium', 'optionalSubject', 'assignedBda', 'programName',
      'courseType', 'totalFee', 'discount', 'installmentPlan', 'amountPaid', 'status',
      'paymentStatus', 'notes',
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) student[key] = req.body[key];
    }

    if (req.body.totalFee !== undefined || req.body.discount !== undefined) {
      const fee = Number(student.totalFee) || 0;
      const disc = Number(student.discount) || 0;
      student.finalFee = Math.max(0, fee - disc);
    }

    if (
      req.body.amountPaid !== undefined ||
      req.body.totalFee !== undefined ||
      req.body.discount !== undefined ||
      req.body.installmentPlan !== undefined
    ) {
      student.installments = buildInstallments(
        student.finalFee,
        student.installmentPlan,
        student.createdAt,
        Number(student.amountPaid) || 0,
        student.customInstallmentCount
      );
      const hasOverdue = student.installments.some((i) => i.status === 'Overdue');
      student.paymentStatus = derivePaymentStatus(
        student.finalFee,
        Number(student.amountPaid) || 0,
        hasOverdue
      );
    }

    if (req.body.courseType !== undefined) {
      student.refundEligible = req.body.courseType === 'Scholarship';
    }

    await student.save();
    const populated = await Student.findById(student._id).populate(populateOpts);
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

async function removePaymentReceiptFiles(payments) {
  for (const payment of payments) {
    const receiptPath = payment.receiptPath?.trim();
    if (!receiptPath) continue;
    const absPath = path.isAbsolute(receiptPath)
      ? receiptPath
      : path.join(process.cwd(), receiptPath);
    try {
      await fs.unlink(absPath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('[delete-student] Could not remove receipt file:', err.message);
      }
    }
  }
}

export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const studentId = student._id;
    const payments = await Payment.find({ student: studentId }).lean();
    await removePaymentReceiptFiles(payments);

    await Promise.all([
      Payment.deleteMany({ student: studentId }),
      ReminderLog.deleteMany({ studentId }),
      EmailLog.deleteMany({ studentId }),
      Activity.deleteMany({ 'metadata.studentId': studentId }),
    ]);

    await Student.findByIdAndDelete(studentId);

    await logActivity({
      type: 'lead_updated',
      description: `Admission for "${student.fullName}" deleted by admin`,
      userId: req.user._id,
      leadId: student.leadId || undefined,
      metadata: { studentId, action: 'student_deleted' },
    });

    res.json({
      message: 'Admission deleted successfully',
      deletedStudentId: String(studentId),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
