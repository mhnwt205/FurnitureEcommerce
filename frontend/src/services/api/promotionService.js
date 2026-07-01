import apiClient from './apiClient';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  return query.toString();
};

export const promotionService = {
  getPromotions: async (params = {}) => {
    const query = buildQuery(params);
    return await apiClient(query ? `/promotions?${query}` : '/promotions', { method: 'GET' });
  },
  getPromotionById: async (id) => {
    return await apiClient(`/promotions/${id}`, { method: 'GET' });
  },
  createPromotion: async (payload) => {
    return await apiClient('/promotions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },
  updatePromotion: async (id, payload) => {
    return await apiClient(`/promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },
  updatePromotionStatus: async (id, payload) => {
    return await apiClient(`/promotions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },
  disablePromotion: async (id) => {
    return await apiClient(`/promotions/${id}`, { method: 'DELETE' });
  }
};