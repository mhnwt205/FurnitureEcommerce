import apiClient from './apiClient';

export const productService = {
  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/products?${query}` : '/products';
    return await apiClient(url, { method: 'GET' });
  },
  getProductById: async (id, params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/products/${id}?${query}` : `/products/${id}`;
    return await apiClient(url, { method: 'GET' });
  },
  createProduct: async (data) => {
    return await apiClient('/products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateProduct: async (id, data) => {
    return await apiClient(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  deleteProduct: async (id) => {
    return await apiClient(`/products/${id}`, { method: 'DELETE' });
  }
};
