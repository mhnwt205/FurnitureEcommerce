const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
});

const currencyNoFractionFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

export const toNumberOrZero = (value) => Number(value || 0);

export const formatPrice = (value) => currencyFormatter.format(toNumberOrZero(value));

export const formatCurrency = formatPrice;

export const formatCurrencyNoFraction = (value) => currencyNoFractionFormatter.format(toNumberOrZero(value));

export const formatPlainVnd = (value) => `${toNumberOrZero(value).toLocaleString('vi-VN')} đ`;
