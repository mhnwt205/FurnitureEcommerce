import prisma from '../prismaClient.js';
import {
  ORDER_REFUND_ERROR,
  OrderRefundError,
  createPaidVNPayCancellationRefundClaim,
  isPaidVNPayCancellationRefundEligible
} from './orderRefund.service.js';

export const CANCELLATION_REASON_CODES = Object.freeze([
  'wrong_item',
  'change_address',
  'change_payment_method',
  'delivery_time_unsuitable',
  'no_longer_needed',
  'other'
]);

export const ORDER_CANCELLATION_ERROR = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  NOT_CANCELLABLE: 'NOT_CANCELLABLE',
  REFUND_REQUIRED: 'REFUND_REQUIRED',
  ALREADY_CANCELLED_CONFLICT: 'ALREADY_CANCELLED_CONFLICT'
});

export const DIRECT_CANCELLABLE_STATUSES = Object.freeze(['pending', 'confirmed']);
export const DIRECT_CANCELLABLE_PAYMENT_STATUSES = Object.freeze(['unpaid', 'failed']);

const DIRECT_CANCELLABLE_STATUS_SET = new Set(DIRECT_CANCELLABLE_STATUSES);
const DIRECT_CANCELLABLE_PAYMENT_STATUS_SET = new Set(DIRECT_CANCELLABLE_PAYMENT_STATUSES);

export class OrderCancellationError extends Error {
  constructor(code, message = code, details = {}) {
    super(message);
    this.name = 'OrderCancellationError';
    this.code = code;
    this.details = details;
  }
}

export const isRefundRequiredForCancellation = (order) => (
  isPaidVNPayCancellationRefundEligible(order)
);

export const canDirectlyCancelOrder = (order) => (
  Boolean(order) &&
  DIRECT_CANCELLABLE_STATUS_SET.has(order.status) &&
  DIRECT_CANCELLABLE_PAYMENT_STATUS_SET.has(order.paymentStatus)
);

const isDirectPaymentEligible = (order) => DIRECT_CANCELLABLE_PAYMENT_STATUS_SET.has(order.paymentStatus);

const isAlreadyCancelledByActor = (order, actorType, actorUserId) => (
  order?.status === 'cancelled' &&
  order.cancelledAt &&
  order.cancelledBy === actorType &&
  (actorType !== 'customer' || order.userId === actorUserId)
);

export const toCancellationResponseDto = (order) => ({
  orderCode: order.orderCode,
  status: order.status,
  paymentStatus: order.paymentStatus,
  cancelledAt: order.cancelledAt,
  cancellation: {
    reasonCode: order.cancellationReasonCode || null,
    reasonText: order.cancellationReasonText || null
  }
});

const loadOrderForCancellation = (client, ownership) => client.order.findFirst({
  where: ownership,
  include: { orderItems: true }
});

const cancelOrderWithOwnership = async ({
  ownership,
  actorType,
  actorUserId = null,
  actorName,
  reasonCode,
  reasonText
}) => {
  const normalizedReasonText = reasonText ? String(reasonText).trim() : null;

  const preliminaryOrder = await prisma.order.findFirst({
    where: ownership,
    include: { activeRefundRequest: true }
  });

  if (!preliminaryOrder) {
    throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_FOUND);
  }

  if (isRefundRequiredForCancellation(preliminaryOrder) || preliminaryOrder.activeRefundRequestId) {
    try {
      return await createPaidVNPayCancellationRefundClaim({
        ownership,
        actorType,
        actorUserId,
        reasonCode,
        reasonText: normalizedReasonText
      });
    } catch (error) {
      if (error instanceof OrderRefundError) {
        if (error.code === ORDER_REFUND_ERROR.NOT_FOUND) {
          throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_FOUND);
        }

        if (error.code === ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE) {
          throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_CANCELLABLE);
        }
      }

      throw error;
    }
  }

  return prisma.$transaction(async (tx) => {
    const order = await loadOrderForCancellation(tx, ownership);

    if (!order) {
      throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_FOUND);
    }

    if (isAlreadyCancelledByActor(order, actorType, actorUserId)) {
      return { outcome: 'already_cancelled', order: toCancellationResponseDto(order) };
    }

    if (order.status === 'cancelled') {
      throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.ALREADY_CANCELLED_CONFLICT);
    }

    if (!DIRECT_CANCELLABLE_STATUS_SET.has(order.status) || !isDirectPaymentEligible(order) || order.paymentStatus === 'refunded') {
      throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_CANCELLABLE);
    }

    const now = new Date();
    const transition = await tx.order.updateMany({
      where: {
        ...ownership,
        id: order.id,
        status: { in: DIRECT_CANCELLABLE_STATUSES },
        inventoryRestoredAt: null,
        paymentStatus: { in: DIRECT_CANCELLABLE_PAYMENT_STATUSES },
        NOT: [
          { paymentMethod: 'VNPAY', paymentStatus: 'paid' },
          { paymentStatus: 'refunded' }
        ]
      },
      data: {
        status: 'cancelled',
        cancelledAt: now,
        cancelledBy: actorType,
        cancellationReasonCode: reasonCode,
        cancellationReasonText: normalizedReasonText,
        inventoryRestoredAt: now
      }
    });

    if (transition.count !== 1) {
      const latest = await loadOrderForCancellation(tx, ownership);
      if (!latest) throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_FOUND);
      if (isAlreadyCancelledByActor(latest, actorType, actorUserId)) {
        return { outcome: 'already_cancelled', order: toCancellationResponseDto(latest) };
      }
      if (isRefundRequiredForCancellation(latest) || latest.activeRefundRequestId) throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.REFUND_REQUIRED);
      throw new OrderCancellationError(ORDER_CANCELLATION_ERROR.NOT_CANCELLABLE);
    }

    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: 'cancelled',
        note: actorType === 'guest' ? 'Guest cancelled order' : 'Customer cancelled order',
        cancelReason: normalizedReasonText || reasonCode,
        changedById: actorUserId,
        changedByName: actorName || (actorType === 'guest' ? 'Guest customer' : 'Customer')
      }
    });

    const updatedOrder = await tx.order.findUnique({ where: { id: order.id } });
    return { outcome: 'cancelled', order: toCancellationResponseDto(updatedOrder) };
  });
};

export const cancelAuthenticatedCustomerOrder = async ({
  orderCode,
  actorUserId,
  actorName,
  reasonCode,
  reasonText
}) => cancelOrderWithOwnership({
  ownership: { orderCode: String(orderCode || '').trim().toUpperCase(), userId: actorUserId },
  actorType: 'customer',
  actorUserId,
  actorName,
  reasonCode,
  reasonText
});

export const cancelGuestOrderById = async ({
  orderId,
  actorName,
  reasonCode,
  reasonText
}) => cancelOrderWithOwnership({
  ownership: { id: orderId, userId: null },
  actorType: 'guest',
  actorUserId: null,
  actorName,
  reasonCode,
  reasonText
});
