import apiClient from './apiClient';

export const authService = {
  login: async (credentials) => {
    const data = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return data;
  },
  googleLogin: async (credential) => {
    const data = await apiClient('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    return data;
  },
  register: async (userData) => {
    const data = await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    return data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  verifyEmail: async (token) => {
    const data = await apiClient(`/auth/verify-email?token=${token}`, {
      method: 'GET'
    });
    return data;
  },
  changePassword: async (passwordData) => {
    const data = await apiClient('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
    return data;
  },
  forgotPassword: async (email) => {
    const data = await apiClient('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  },
  resetPassword: async (resetData) => {
    const data = await apiClient('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
    return data;
  }
};
