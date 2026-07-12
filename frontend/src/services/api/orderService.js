import apiClient from './apiClient';

export const orderService = {
  createOrder: async (data) => {
    return await apiClient('/orders', { 
      method: 'POST', 
      body: JSON.stringify(data) 
    });
  },
  lookupOrder: async ({ orderCode, phone }) => {
    return await apiClient('/orders/lookup', {
      method: 'POST',
      body: JSON.stringify({ orderCode, phone })
    });
  },
  getGuestManagedOrder: async ({ token }) => {
    return await apiClient('/orders/guest/manage', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },
  cancelGuestManagedOrder: async ({ token, reasonCode, reasonText }) => {
    return await apiClient('/orders/guest/cancel', {
      method: 'POST',
      body: JSON.stringify({ token, reasonCode, reasonText })
    });
  },
  cancelMyOrder: async ({ orderCode, reasonCode, reasonText }) => {
    return await apiClient(`/orders/${encodeURIComponent(orderCode)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reasonCode, reasonText })
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
  getAdminRefunds: async (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    });
    const queryString = query.toString();
    const url = queryString ? `/orders/admin/refunds?${queryString}` : '/orders/admin/refunds';
    return await apiClient(url, { method: 'GET' });
  },
  getAdminRefundByRequestId: async (requestId) => {
    return await apiClient(`/orders/admin/refunds/${encodeURIComponent(requestId)}`, { method: 'GET' });
  },
  startAdminRefundProcessing: async (requestId, payload = {}) => {
    return await apiClient(`/orders/admin/refunds/${encodeURIComponent(requestId)}/start-processing`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  resolveAdminRefund: async (requestId, payload) => {
    return await apiClient(`/orders/admin/refunds/${encodeURIComponent(requestId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updateOrderStatus: async (orderId, payload) => {
    return await apiClient(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
