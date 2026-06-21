export const uploadService = {
  uploadProductImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const token = localStorage.getItem('token');
    
    // We cannot use apiClient directly here if apiClient sets Content-Type to application/json
    // We need to fetch directly to allow the browser to set Content-Type to multipart/form-data with the correct boundary
    const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Lỗi upload ảnh');
    }

    return await response.json();
  },
  
  uploadProductImages: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const token = localStorage.getItem('token');
    
    const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/products/multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Lỗi upload ảnh');
    }

    return await response.json();
  },
  uploadReviewImages: async (files, context = {}) => {
    const formData = new FormData();
    formData.append('productId', context.productId);
    formData.append('orderId', context.orderId);
    formData.append('orderItemId', context.orderItemId);
    files.forEach(file => {
      formData.append('images', file);
    });

    const token = localStorage.getItem('token');
    const response = await fetch(`${import.meta.env.VITE_API_URL}/uploads/reviews/multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Lỗi upload ảnh đánh giá');
    }

    return await response.json();
  }
};