import prisma from '../prismaClient.js';
import { deliverOrderConfirmationEmail } from './orderConfirmationEmail.service.js';

export const finalizeSuccessfulVNPayPayment = async ({ orderId, transactionNo, deliverEmail = deliverOrderConfirmationEmail } = {}) => {
  if (!orderId) {
    const error = new Error('ORDER_ID_REQUIRED');
    error.code = 'ORDER_ID_REQUIRED';
    throw error;
  }

  const finalizedOrder = await prisma.$transaction(async (tx) => {
    const currentOrder = await tx.order.findUnique({ where: { id: orderId } });
    if (!currentOrder) {
      const error = new Error('ORDER_NOT_FOUND');
      error.code = 'ORDER_NOT_FOUND';
      throw error;
    }

    if (String(currentOrder.paymentMethod || '').toUpperCase() !== 'VNPAY') {
      const error = new Error('ORDER_PAYMENT_METHOD_NOT_VNPAY');
      error.code = 'ORDER_PAYMENT_METHOD_NOT_VNPAY';
      throw error;
    }

    if (currentOrder.paymentStatus === 'paid') {
      if (transactionNo && !currentOrder.vnpayTransactionNo) {
        return tx.order.update({
          where: { id: currentOrder.id },
          data: { vnpayTransactionNo: transactionNo }
        });
      }
      return currentOrder;
    }

    return tx.order.update({
      where: { id: currentOrder.id },
      data: {
        paymentStatus: 'paid',
        paidAt: currentOrder.paidAt || new Date(),
        vnpayTransactionNo: transactionNo || currentOrder.vnpayTransactionNo
      }
    });
  });

  const emailResult = await deliverEmail(finalizedOrder.id);
  return { order: finalizedOrder, emailResult };
};

export const markVNPayPaymentFailed = async ({ orderId } = {}) => {
  if (!orderId) return null;
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.paymentStatus === 'paid') return order;
  if (order.paymentStatus === 'failed') return order;

  return prisma.order.update({
    where: { id: order.id },
    data: { paymentStatus: 'failed' }
  });
};
