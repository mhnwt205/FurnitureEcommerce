import apiClient from './apiClient';

export const addressService = {
  getAddresses: async () => {
    const data = await apiClient('/addresses', {
      method: 'GET',
    });
    return data;
  },
  addAddress: async (addressData) => {
    const data = await apiClient('/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
    return data;
  },
  updateAddress: async (id, addressData) => {
    const data = await apiClient(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(addressData),
    });
    return data;
  },
  deleteAddress: async (id) => {
    const data = await apiClient(`/addresses/${id}`, {
      method: 'DELETE',
    });
    return data;
  },
  setDefaultAddress: async (id) => {
    const data = await apiClient(`/addresses/${id}/default`, {
      method: 'PATCH',
    });
    return data;
  }
};
