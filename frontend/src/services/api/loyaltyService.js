import apiClient from './apiClient';

const POINT_HISTORY_TYPES = new Set([
  'EARN_ORDER',
  'REDEEM_VOUCHER',
  'REVERSE_ORDER',
  'ADMIN_ADJUSTMENT'
]);

const asPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const pointHistoryQuery = ({ page, limit, type } = {}) => {
  const params = new URLSearchParams({
    page: String(asPositiveInteger(page, 1)),
    limit: String(Math.min(asPositiveInteger(limit, 20), 100))
  });

  if (POINT_HISTORY_TYPES.has(type)) params.set('type', type);
  return params.toString();
};

export const loyaltyService = {
  getLoyaltyAccount: () => apiClient('/loyalty/account'),
  getPointHistory: (params) => apiClient(`/loyalty/points?${pointHistoryQuery(params)}`),
  getTier: () => apiClient('/loyalty/tier'),
  getTierBenefits: () => apiClient('/loyalty/tier-benefits'),
  claimTierBenefit: (voucherDefinitionId) => apiClient(`/loyalty/tier-benefits/${voucherDefinitionId}/claim`, { method: 'POST', body: '{}' }),
  getRewardCatalog: () => apiClient('/reward-catalog'),
  redeemRewardCatalogItem: (rewardCatalogItemId) => apiClient('/reward-redemptions', {
    method: 'POST',
    body: JSON.stringify({ rewardCatalogItemId })
  })
};
