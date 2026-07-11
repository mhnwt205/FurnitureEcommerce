import apiClient from './apiClient.js';

export const uploadService = {
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    return apiClient('/uploads/products', {
      method: 'POST',
      body: formData
    });
  },
  
  uploadProductImages: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    return apiClient('/uploads/products/multiple', {
      method: 'POST',
      body: formData
    });
  },

  uploadReviewImages: async (files, context = {}) => {
    const formData = new FormData();
    formData.append('productId', context.productId);
    formData.append('orderId', context.orderId);
    formData.append('orderItemId', context.orderItemId);
    files.forEach(file => {
      formData.append('images', file);
    });

    return apiClient('/uploads/reviews/multiple', {
      method: 'POST',
      body: formData
    });
  }
};