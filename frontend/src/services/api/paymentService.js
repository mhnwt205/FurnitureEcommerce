import apiClient from './apiClient';

export const paymentService = {
  createVnpayUrl: async (data) => {
    return await apiClient('/payment/vnpay/create-url', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  verifyPaymentResult: async (queryString) => {
    return await apiClient(`/payment/vnpay/verify-result${queryString}`, {
      method: 'GET'
    });
  }
};
