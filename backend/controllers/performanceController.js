import User from '../models/User.js';
import Lead from '../models/Lead.js';
import Student from '../models/Student.js';
import FollowUp from '../models/FollowUp.js';
import {
  getPerformancePeriodRange,
  formatPeriodLabel,
  CONVERTED_STATUSES,
  isContactedStatus,
} from '../utils/performanceHelpers.js';

const leadBase = { isDeleted: { $ne: true } };

const countNeglectedLeads = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Lead.countDocuments({
    ...leadBase,
    assignedTo: userId,
    status: { $nin: [...CONVERTED_STATUSES, 'Lost'] },
    followupDate: { $lt: today, $ne: null },
  });
};

export const getBDAPerformance = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const period = req.query.period || 'this_week';
    const { start, end } = getPerformancePeriodRange(
      period,
      req.query.start,
      req.query.end
    );

    const salesUsers = await User.find({ role: 'sales', isActive: { $ne: false } })
      .select('name email createdAt employeeId weeklyAdmissionTarget weeklyRevenueTarget')
      .sort({ createdAt: 1 });

    const [allLeads, allStudents, sessionFollowups] = await Promise.all([
      Lead.find({
        ...leadBase,
        assignedTo: { $ne: null },
        createdAt: { $gte: start, $lte: end },
      }).select('assignedTo status dealValue createdAt'),
      Student.find({
        assignedBda: { $ne: null },
        createdAt: { $gte: start, $lte: end },
      }).select('assignedBda amountPaid finalFee createdAt'),
      FollowUp.find({
        type: 'meeting',
        isDeleted: { $ne: true },
        scheduledAt: { $gte: start, $lte: end },
      }).select('user lead'),
    ]);

    const sessionByUser = {};
    for (const fu of sessionFollowups) {
      const uid = String(fu.user);
      sessionByUser[uid] = (sessionByUser[uid] || 0) + 1;
    }

    const leaderboard = await Promise.all(
      salesUsers.map(async (user, index) => {
        const uid = String(user._id);
        const userLeads = allLeads.filter((l) => String(l.assignedTo) === uid);
        const userStudents = allStudents.filter((s) => String(s.assignedBda) === uid);

        const leads = userLeads.length;
        const contacted = userLeads.filter((l) => isContactedStatus(l.status)).length;
        const converted = userLeads.filter((l) => CONVERTED_STATUSES.includes(l.status)).length;
        const leadRevenue = userLeads
          .filter((l) => CONVERTED_STATUSES.includes(l.status))
          .reduce((sum, l) => sum + (l.dealValue || 0), 0);
        const studentRevenue = userStudents.reduce(
          (sum, s) => sum + (s.amountPaid || 0),
          0
        );
        const revenue = Math.max(studentRevenue, leadRevenue);
        const admissions = userStudents.length;
        const sessions = sessionByUser[uid] || 0;
        const cvr = leads > 0 ? Math.round((converted / leads) * 100) : 0;
        const neglected = await countNeglectedLeads(user._id);

        const admissionTarget = user.weeklyAdmissionTarget ?? 2;
        const revenueTarget = user.weeklyRevenueTarget ?? 120000;

        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          employeeId: user.employeeId || `MD-BDA-${String(index + 1).padStart(3, '0')}`,
          joinedAt: user.createdAt,
          neglected,
          leads,
          contacted,
          sessions,
          converted,
          admissions,
          revenue,
          cvr,
          weeklyAdmissionTarget: admissionTarget,
          weeklyRevenueTarget: revenueTarget,
          admissionTargetMet: admissions >= admissionTarget,
          revenueTargetMet: revenue >= revenueTarget,
        };
      })
    );

    leaderboard.sort((a, b) => b.converted - a.converted || b.revenue - a.revenue);
    leaderboard.forEach((row, i) => {
      row.rank = i + 1;
    });

    const summary = leaderboard.reduce(
      (acc, row) => {
        acc.totalLeads += row.leads;
        acc.contacted += row.contacted;
        acc.converted += row.converted;
        acc.revenue += row.revenue;
        return acc;
      },
      { totalLeads: 0, contacted: 0, converted: 0, revenue: 0 }
    );
    summary.avgCvr =
      summary.totalLeads > 0
        ? Math.round((summary.converted / summary.totalLeads) * 100)
        : 0;

    res.json({
      period,
      periodLabel: formatPeriodLabel(start, end, period),
      start,
      end,
      summary,
      leaderboard,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateBDATargets = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'sales') {
      return res.status(404).json({ message: 'BDA not found' });
    }

    const { weeklyAdmissionTarget, weeklyRevenueTarget, employeeId } = req.body;
    if (weeklyAdmissionTarget != null) {
      user.weeklyAdmissionTarget = Math.max(0, Number(weeklyAdmissionTarget) || 0);
    }
    if (weeklyRevenueTarget != null) {
      user.weeklyRevenueTarget = Math.max(0, Number(weeklyRevenueTarget) || 0);
    }
    if (employeeId != null) user.employeeId = String(employeeId).trim();

    await user.save();
    res.json({
      _id: user._id,
      name: user.name,
      employeeId: user.employeeId,
      weeklyAdmissionTarget: user.weeklyAdmissionTarget,
      weeklyRevenueTarget: user.weeklyRevenueTarget,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
