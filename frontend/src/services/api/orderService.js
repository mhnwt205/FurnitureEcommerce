import apiClient from './apiClient';

export const orderService = {
  createOrder: async (data) => {
    return await apiClient('/orders', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },
  getMyOrders: async () => {
    return await apiClient('/orders/my-orders', { method: 'GET' });
  },
  getMyOrderById: async (orderId) => {
    return await apiClient(`/orders/my-orders/${orderId}`, { method: 'GET' });
  },
  getAdminOrders: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    const url = queryString ? `/orders/admin?${queryString}` : '/orders/admin';
    return await apiClient(url, { method: 'GET' });
  },
  getAdminOrderById: async (orderId) => {
    return await apiClient(`/orders/admin/${orderId}`, { method: 'GET' });
  },
  updateOrderStatus: async (orderId, payload) => {
    return await apiClient(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
