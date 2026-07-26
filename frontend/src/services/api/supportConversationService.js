import apiClient from './apiClient.js';

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export const supportConversationService = {
  createOrGet: () => apiClient('/support/conversations', { method: 'POST', body: '{}' }),
  getConversation: (id) => apiClient(`/support/conversations/${id}`),
  getMessages: (id, params) => apiClient(`/support/conversations/${id}/messages${query(params)}`),
  sendMessage: (id, body) => apiClient(`/support/conversations/${id}/messages`, {
    method: 'POST',
    body: JSON.stringify(body)
  })
};
