import { rateLimit } from 'express-rate-limit';

const positiveIntegerEnv = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

export const guestOrderManageRateLimiter = rateLimit({
  windowMs: positiveIntegerEnv('GUEST_ORDER_MANAGE_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  limit: positiveIntegerEnv('GUEST_ORDER_MANAGE_RATE_LIMIT_MAX', 20),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu quản lý đơn hàng. Vui lòng thử lại sau.' }
});

export const guestOrderCancelRateLimiter = rateLimit({
  windowMs: positiveIntegerEnv('GUEST_ORDER_CANCEL_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  limit: positiveIntegerEnv('GUEST_ORDER_CANCEL_RATE_LIMIT_MAX', 5),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Quá nhiều yêu cầu hủy đơn. Vui lòng thử lại sau.' }
});
