import apiClient from './apiClient';

export const reviewService = {
  getProductReviews: async (productId) => {
    return await apiClient(`/reviews/products/${productId}`, { method: 'GET' });
  },
  getReviewEligibility: async (productId) => {
    return await apiClient(`/reviews/products/${productId}/eligibility`, { method: 'GET' });
  },
  getOrderItemReviewEligibility: async (orderItemId) => {
    return await apiClient(`/reviews/order-items/${orderItemId}/eligibility`, { method: 'GET' });
  },
  createReview: async (data) => {
    return await apiClient('/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getAdminReviews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/reviews/admin?${query}` : '/reviews/admin';
    return await apiClient(url, { method: 'GET' });
  },
  updateReviewApproval: async (id, isApproved) => {
    return await apiClient(`/reviews/${id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ isApproved })
    });
  }
};