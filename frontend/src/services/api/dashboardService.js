import apiClient from './apiClient';

const dashboardService = {
  getSummary: async () => {
    return await apiClient('/dashboard/summary', { method: 'GET' });
  },

  getCharts: async () => {
    return await apiClient('/dashboard/charts', { method: 'GET' });
  },

  getWidgets: async () => {
    return await apiClient('/dashboard/widgets', { method: 'GET' });
  },

  getRevenue: async ({ from, to, status = 'all' }) => {
    const query = new URLSearchParams({ from, to, status }).toString();
    return await apiClient(`/dashboard/revenue?${query}`, { method: 'GET' });
  },

  getRevenueOrders: async ({ from, to, status = 'all', page = 1, limit = 10 }) => {
    const query = new URLSearchParams({ from, to, status, page, limit }).toString();
    return await apiClient(`/dashboard/revenue/orders?${query}`, { method: 'GET' });
  }
};

export default dashboardService;
