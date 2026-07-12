import prisma from '../prismaClient.js';
import { createVNPayUrl } from '../config/vnpay.js';

export const getRequestIpAddress = (req) => (
  req.headers['x-forwarded-for'] ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.connection?.socket?.remoteAddress ||
  '127.0.0.1'
);

export const toPublicPaymentOrderDto = (order) => ({
  id: order.id,
  orderCode: order.orderCode,
  status: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  totalAmount: order.totalAmount
});

export const createVNPayPaymentUrlForOrder = async ({
  order,
  ipAddr,
  client = prisma
}) => {
  if (!order) {
    const error = new Error('VNPAY_ORDER_REQUIRED');
    error.code = 'VNPAY_ORDER_REQUIRED';
    throw error;
  }

  if (order.paymentMethod !== 'VNPAY') {
    const error = new Error('VNPAY_PAYMENT_METHOD_REQUIRED');
    error.code = 'VNPAY_PAYMENT_METHOD_REQUIRED';
    throw error;
  }

  if (order.paymentStatus === 'paid') {
    const error = new Error('ORDER_ALREADY_PAID');
    error.code = 'ORDER_ALREADY_PAID';
    throw error;
  }

  const txnRef = `VNP-${order.id}-${Date.now()}`;

  await client.order.update({
    where: { id: order.id },
    data: { vnpayTxnRef: txnRef }
  });

  return createVNPayUrl(
    ipAddr,
    txnRef,
    order.totalAmount,
    `Thanh toán đơn hàng ${order.orderCode}`
  );
};
