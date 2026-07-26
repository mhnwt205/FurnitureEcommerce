import apiClient from './apiClient.js';

const query = (params = {}) => {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') values.set(key, String(value)); });
  return values.toString() ? `?${values.toString()}` : '';
};

export const adminSupportConversationService = {
  list: (params) => apiClient(`/admin/support/conversations${query(params)}`),
  assignees: () => apiClient('/admin/support/conversations/assignees'),
  get: (id) => apiClient(`/admin/support/conversations/${id}`),
  messages: (id, params) => apiClient(`/admin/support/conversations/${id}/messages${query(params)}`),
  send: (id, body) => apiClient(`/admin/support/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify(body) }),
  accept: (id) => apiClient(`/admin/support/conversations/${id}/accept`, { method: 'POST', body: '{}' }),
  assign: (id, assignedStaffId) => apiClient(`/admin/support/conversations/${id}/assign`, { method: 'POST', body: JSON.stringify({ assignedStaffId }) }),
  close: (id) => apiClient(`/admin/support/conversations/${id}/close`, { method: 'POST', body: '{}' }),
  reopen: (id) => apiClient(`/admin/support/conversations/${id}/reopen`, { method: 'POST', body: '{}' })
};
