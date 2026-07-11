import apiClient, { refreshAccessToken } from './apiClient.js';

export const authService = {
  login: (credentials) => apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),

  googleLogin: (credential) => apiClient('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential })
  }),

  refresh: () => refreshAccessToken(),

  logout: () => apiClient('/auth/logout', {
    method: 'POST'
  }),

  logoutAll: () => apiClient('/auth/logout-all', {
    method: 'POST'
  }),

  me: () => apiClient('/auth/me', {
    method: 'GET'
  }),

  register: (userData) => apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),

  verifyEmail: (token) => apiClient(`/auth/verify-email?token=${token}`, {
    method: 'GET'
  }),

  changePassword: (passwordData) => apiClient('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(passwordData)
  }),

  forgotPassword: (email) => apiClient('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email })
  }),

  resetPassword: (resetData) => apiClient('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(resetData)
  })
};