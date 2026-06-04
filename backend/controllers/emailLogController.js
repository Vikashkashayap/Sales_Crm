import EmailLog from '../models/EmailLog.js';

/**
 * List email logs (daily material sends by default; optional type filter).
 */
export const listEmailLogs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    const type = req.query.type || 'daily_material';
    if (type !== 'all') {
      filter.emailType = type;
    }

    const [logs, total] = await Promise.all([
      EmailLog.find(filter)
        .populate('leadId', 'name email mobile')
        .populate('marketingRecipientId', 'name email mobile')
        .populate('materialId', 'title sendDate')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmailLog.countDocuments(filter),
    ]);

    res.json({
      logs: logs.map((log) => ({
        id: log._id,
        leadId: log.leadId?._id || log.leadId,
        leadName:
          log.marketingRecipientId?.name ||
          log.leadId?.name ||
          log.studentName ||
          '',
        email: log.email,
        materialId: log.materialId?._id || log.materialId,
        materialTitle: log.materialId?.title || '',
        subject: log.subject,
        status: log.status,
        sentAt: log.sentAt,
        errorMessage: log.error || '',
        emailType: log.emailType,
      })),
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to list email logs' });
  }
};
