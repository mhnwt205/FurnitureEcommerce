import apiClient from './apiClient';

export const adminAccountService = {
  getAdminAccounts: () => apiClient('/admin-accounts'),
  createAdminAccount: (data) => apiClient('/admin-accounts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateAdminAccount: (id, data) => apiClient(`/admin-accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  }),
  updateAdminAccountStatus: (id, isActive) => apiClient(`/admin-accounts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive })
  })
};
