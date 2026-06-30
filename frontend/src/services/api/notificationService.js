import apiClient from './apiClient';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });

  return searchParams.toString();
};

export const notificationService = {
  getNotifications: ({ page = 1, limit = 10, unreadOnly } = {}) => {
    const queryString = buildQueryString({ page, limit, unreadOnly });
    return apiClient(`/notifications${queryString ? `?${queryString}` : ''}`);
  },

  getUnreadCount: () => apiClient('/notifications/unread-count'),

  markNotificationAsRead: (id) => apiClient(`/notifications/${id}/read`, {
    method: 'PATCH'
  }),

  markAllNotificationsAsRead: () => apiClient('/notifications/read-all', {
    method: 'PATCH'
  })
};