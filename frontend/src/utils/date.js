export const isValidDate = (value) => {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
};

export const formatDate = (value, fallback = '', options) => {
  if (!isValidDate(value)) return fallback;
  return new Date(value).toLocaleDateString('vi-VN', options);
};

export const formatTime = (value, fallback = '', options) => {
  if (!isValidDate(value)) return fallback;
  return new Date(value).toLocaleTimeString('vi-VN', options);
};

export const formatDateTime = (value, fallback = '', options) => {
  if (!isValidDate(value)) return fallback;
  return new Date(value).toLocaleString('vi-VN', options);
};

export const formatShortDateTime = (value, fallback = '-') => formatDateTime(value, fallback, {
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});
