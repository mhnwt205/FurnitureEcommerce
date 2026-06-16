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
  }
};

export default dashboardService;
