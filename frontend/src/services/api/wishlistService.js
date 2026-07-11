import apiClient from './apiClient';

export const wishlistService = {
  getWishlist: async () => {
    const data = await apiClient('/wishlist', {
      method: 'GET',
    });
    return data;
  },
  getWishlistIds: async () => {
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
