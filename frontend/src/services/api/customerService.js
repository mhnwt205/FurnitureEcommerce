import apiClient from './apiClient';

export const customerService = {
  getCustomers: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    const url = queryString ? `/customers?${queryString}` : '/customers';
    const data = await apiClient(url, {
      method: 'GET',
    });
    return data;
  },
  getCustomerById: async (id) => {
    const data = await apiClient(`/customers/${id}`, {
      method: 'GET',
    });
    return data;
  },
  updateCustomerStatus: async (id, isActive) => {
    const data = await apiClient(`/customers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return data;
  },
  getMyProfile: async () => {
    const data = await apiClient('/customers/me', {
      method: 'GET',
    });
    return data;
  },
  updateMyProfile: async (profileData) => {
    const data = await apiClient('/customers/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return data;
  }
};
