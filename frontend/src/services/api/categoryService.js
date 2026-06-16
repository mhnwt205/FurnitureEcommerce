import apiClient from './apiClient';

export const categoryService = {
  getCategories: async () => {
    return await apiClient('/categories', { method: 'GET' });
  },
  createCategory: async (data) => {
    return await apiClient('/categories', { method: 'POST', body: JSON.stringify(data) });
  },
  updateCategory: async (id, data) => {
    return await apiClient(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  deleteCategory: async (id) => {
    return await apiClient(`/categories/${id}`, { method: 'DELETE' });
  }
};
