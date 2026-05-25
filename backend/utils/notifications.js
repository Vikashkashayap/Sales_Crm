import Notification from '../models/Notification.js';

export const createNotification = async ({
  userId,
  type,
  title,
  message,
  link = '',
  metadata = {},
}) => {
  try {
    return await Notification.create({
      user: userId,
      type,
      title,
      message,
      link,
      metadata,
    });
  } catch (err) {
    console.error('Notification create failed:', err.message);
    return null;
  }
};
