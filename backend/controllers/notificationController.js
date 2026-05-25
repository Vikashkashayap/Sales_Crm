import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (req.query.unread === 'true') filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(req.query.limit, 10) || 50);

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!notification) return res.status(404).json({ message: 'Not found' });
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'All notifications marked read' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};
