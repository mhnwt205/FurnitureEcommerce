import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} from '../services/notification.service.js';

const parseUnreadOnly = (value) => value === true || value === 'true' || value === '1';

export const listNotifications = async (req, res) => {
  try {
    const result = await getUserNotifications(req.user.id, {
      page: req.query.page,
      limit: req.query.limit,
      unreadOnly: parseUnreadOnly(req.query.unreadOnly)
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(400).json({ message: error.message || 'Invalid notification query' });
  }
};

export const getNotificationUnreadCount = async (req, res) => {
  try {
    const unreadCount = await getUnreadCount(req.user.id);
    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Get unread notification count error:', error);
    res.status(400).json({ message: error.message || 'Invalid notification query' });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await markAsRead(req.user.id, req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(400).json({ message: error.message || 'Invalid notification ID' });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const result = await markAllAsRead(req.user.id);
    res.status(200).json({ message: 'Notifications marked as read', updatedCount: result.count });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(400).json({ message: error.message || 'Invalid notification request' });
  }
};