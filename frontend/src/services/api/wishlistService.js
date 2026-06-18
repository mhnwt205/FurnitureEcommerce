import apiClient from './apiClient';

export const wishlistService = {
  getWishlist: async () => {
    if (!localStorage.getItem('token')) return [];
    const data = await apiClient('/wishlist', {
      method: 'GET',
    });
    return data;
  },
  getWishlistIds: async () => {
    if (!localStorage.getItem('token')) return [];
    const data = await apiClient('/wishlist/ids', {
      method: 'GET',
    });
    return data;
  },
  addWishlist: async (productId) => {
    const data = await apiClient(`/wishlist/${productId}`, {
      method: 'POST',
    });
    return data;
  },
  removeWishlist: async (productId) => {
    const data = await apiClient(`/wishlist/${productId}`, {
      method: 'DELETE',
    });
    return data;
  }
};
