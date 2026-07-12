import prisma from '../prismaClient.js';
import { resolveGuestOrderByManagementToken } from './guestOrderToken.service.js';
import { canDirectlyCancelOrder } from './orderCancellation.service.js';
import { toRefundAwareOrderFlags } from './orderRefund.service.js';

const orderInclude = {
  activeRefundRequest: { select: { requestId: true, status: true } },
  orderItems: true,
  statusHistory: { orderBy: { createdAt: 'asc' } }
};

export const getGuestOrderManagementDto = (order) => {
  const refundFlags = toRefundAwareOrderFlags(order);
  return {
    orderCode: order.orderCode,
    createdAt: order.createdAt,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
    fullName: order.fullName,
    phone: order.phone,
    customerEmail: order.customerEmail,
    address: order.address,
    note: order.note || null,
    items: (order.orderItems || []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      finalPrice: item.finalPrice ?? item.price,
      subtotal: item.subtotal
    })),
    statusHistory: (order.statusHistory || []).map((entry) => ({
      status: entry.toStatus,
      createdAt: entry.createdAt
    })),
    cancellation: order.cancelledAt ? {
      cancelledAt: order.cancelledAt,
      reasonCode: order.cancellationReasonCode || null,
      reasonText: order.cancellationReasonText || null
    } : null,
    canCancel: canDirectlyCancelOrder(order) && !refundFlags.refundPending,
    ...refundFlags
  };
};

export const resolveGuestManagedOrder = async (rawToken) => (
  resolveGuestOrderByManagementToken(prisma, rawToken, { include: orderInclude })
);

export const getGuestManagedOrderById = async (orderId) => prisma.order.findFirst({
  where: { id: orderId, userId: null },
  include: orderInclude
});
