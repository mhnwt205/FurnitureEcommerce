import apiClient from './apiClient';

const query = (params = {}) => {
  const values = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') values.set(key, value);
  });
  return values.toString();
};

export const voucherService = {
  listPublicVouchers: () => apiClient('/public-vouchers'),
  listMyVouchers: (params = {}) => apiClient(`/vouchers?${query(params)}`),
  getMyVoucher: (id) => apiClient(`/vouchers/${id}`),
  claimVoucher: (voucherDefinitionId) => apiClient('/voucher-claims', {
    method: 'POST',
    body: JSON.stringify({ voucherDefinitionId })
  })
};

export const voucherDefinitionService = {
  list: (params = {}) => apiClient(`/voucher-definitions?${query(params)}`),
  get: (id) => apiClient(`/voucher-definitions/${id}`),
  create: (payload) => apiClient('/voucher-definitions', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, payload) => apiClient(`/voucher-definitions/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  enable: (id) => apiClient(`/voucher-definitions/${id}/enable`, { method: 'PATCH' }),
  disable: (id) => apiClient(`/voucher-definitions/${id}/disable`, { method: 'PATCH' })
};

export const voucherAssignmentService = {
  create: (payload, idempotencyKey) => apiClient('/voucher-assignments', {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify(payload)
  })
};
