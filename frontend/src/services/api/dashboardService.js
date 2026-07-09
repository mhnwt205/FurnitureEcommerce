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

  getRevenue: async ({ from, to }) => {
    const query = new URLSearchParams({ from, to }).toString();
    return await apiClient(`/dashboard/revenue?${query}`, { method: 'GET' });
  }
};

export default dashboardService;
