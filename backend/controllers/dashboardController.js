import Lead from '../models/Lead.js';
import User from '../models/User.js';
import FollowUp from '../models/FollowUp.js';
import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import { buildRoleFilter, CONVERTED_STATUSES, LOST_STATUSES } from '../utils/leadHelpers.js';

export const getStats = async (req, res) => {
  try {
    const filter = buildRoleFilter(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalLeads,
      totalWon,
      totalLost,
      todayFollowups,
      revenueResult,
      pendingFollowups,
      newLeads,
      pipelineAgg,
      sourceAgg,
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, status: { $in: CONVERTED_STATUSES } }),
      Lead.countDocuments({ ...filter, status: { $in: LOST_STATUSES } }),
      Lead.countDocuments({
        ...filter,
        followupDate: { $gte: today, $lt: tomorrow },
      }),
      Lead.aggregate([
        { $match: { ...filter, status: { $in: CONVERTED_STATUSES } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$dealValue', 0] } } } },
      ]),
      FollowUp.countDocuments({
        ...(req.user.role === 'admin' ? {} : { user: req.user._id }),
        status: 'pending',
        scheduledAt: { $lt: new Date() },
        isDeleted: { $ne: true },
      }),
      Lead.countDocuments({ ...filter, status: 'New' }),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;
    const conversionRate =
      totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0;

    res.json({
      totalLeads,
      totalWon,
      totalLost,
      todayFollowups,
      totalRevenue,
      pendingFollowups,
      newLeads,
      conversionRate,
      pipelineByStatus: pipelineAgg.map((p) => ({ status: p._id || 'Unknown', count: p.count })),
      leadsBySource: sourceAgg.map((s) => ({ source: s._id || 'Unknown', count: s.count })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const filter = buildRoleFilter(req.user);
    const days = parseInt(req.query.days, 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      teamPerformance,
      conversionTrend,
      recentActivities,
      topSources,
    ] = await Promise.all([
      Lead.aggregate([
        { $match: { ...filter, assignedTo: { $ne: null } } },
        {
          $group: {
            _id: '$assignedTo',
            total: { $sum: 1 },
            converted: {
              $sum: { $cond: [{ $in: ['$status', CONVERTED_STATUSES] }, 1, 0] },
            },
            revenue: {
              $sum: {
                $cond: [
                  { $in: ['$status', CONVERTED_STATUSES] },
                  { $ifNull: ['$dealValue', 0] },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { converted: -1 } },
        { $limit: 10 },
      ]),
      Lead.aggregate([
        { $match: { ...filter, createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            created: { $sum: 1 },
            converted: {
              $sum: { $cond: [{ $in: ['$status', CONVERTED_STATUSES] }, 1, 0] },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Activity.find()
        .populate('user', 'name')
        .populate('lead', 'name')
        .sort({ createdAt: -1 })
        .limit(20),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
    ]);

    const userIds = teamPerformance.map((t) => t._id);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

    res.json({
      teamPerformance: teamPerformance.map((t) => ({
        userId: t._id,
        name: userMap[t._id?.toString()]?.name || 'Unknown',
        email: userMap[t._id?.toString()]?.email || '',
        total: t.total,
        converted: t.converted,
        conversionRate: t.total ? Math.round((t.converted / t.total) * 100) : 0,
        revenue: t.revenue,
      })),
      conversionTrend,
      recentActivities,
      topSources: topSources.map((s) => ({ source: s._id || 'Unknown', count: s.count })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getSalesDashboard = async (req, res) => {
  try {
    const filter = buildRoleFilter(req.user);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      assignedLeads,
      converted,
      todayFollowups,
      pendingTasks,
      upcomingFollowups,
      recentActivities,
    ] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.countDocuments({ ...filter, status: { $in: CONVERTED_STATUSES } }),
      FollowUp.countDocuments({
        user: req.user._id,
        scheduledAt: { $gte: today, $lt: tomorrow },
        status: 'pending',
        isDeleted: { $ne: true },
      }),
      Task.countDocuments({
        user: req.user._id,
        status: { $in: ['pending', 'in_progress'] },
        isDeleted: { $ne: true },
      }),
      FollowUp.find({
        user: req.user._id,
        status: 'pending',
        scheduledAt: { $gte: new Date() },
        isDeleted: { $ne: true },
      })
        .populate('lead', 'name mobile status')
        .sort({ scheduledAt: 1 })
        .limit(10),
      Activity.find({ user: req.user._id })
        .populate('lead', 'name')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const conversionRate =
      assignedLeads > 0 ? Math.round((converted / assignedLeads) * 100) : 0;

    res.json({
      assignedLeads,
      converted,
      conversionRate,
      todayFollowups,
      pendingTasks,
      upcomingFollowups,
      recentActivities,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
