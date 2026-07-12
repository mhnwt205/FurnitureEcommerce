import crypto from 'crypto';
import prisma from '../prismaClient.js';

export const REFUND_PROVIDER = Object.freeze({
  VNPAY: 'VNPAY'
});

export const REFUND_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  UNKNOWN: 'unknown'
});

export const ACTIVE_REFUND_STATUSES = Object.freeze([
  REFUND_STATUS.PENDING,
  REFUND_STATUS.PROCESSING,
  REFUND_STATUS.UNKNOWN
]);

export const ORDER_REFUND_ERROR = Object.freeze({
  NOT_FOUND: 'NOT_FOUND',
  NOT_REFUND_ELIGIBLE: 'NOT_REFUND_ELIGIBLE',
  ACTIVE_REFUND_INVARIANT: 'ACTIVE_REFUND_INVARIANT',
  CLAIM_RACE_LOST: 'CLAIM_RACE_LOST'
});

export const REFUND_ELIGIBLE_STATUSES = Object.freeze(['pending', 'confirmed']);
const REFUND_ELIGIBLE_STATUS_SET = new Set(REFUND_ELIGIBLE_STATUSES);
const ACTIVE_REFUND_STATUS_SET = new Set(ACTIVE_REFUND_STATUSES);

export class OrderRefundError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = 'OrderRefundError';
    this.code = code;
  }
}

export const isActiveRefundStatus = (status) => ACTIVE_REFUND_STATUS_SET.has(status);

export const isPaidVNPayCancellationRefundEligible = (order) => (
  Boolean(order) &&
  REFUND_ELIGIBLE_STATUS_SET.has(order.status) &&
  String(order.paymentMethod || '').toUpperCase() === 'VNPAY' &&
  order.paymentStatus === 'paid'
);

export const hasActiveRefundClaim = (order) => (
  Boolean(order?.activeRefundRequestId) &&
  (!order.activeRefundRequest || isActiveRefundStatus(order.activeRefundRequest.status))
);

export const getRefundEnvironment = () => {
  const explicit = process.env.PAYMENT_REFUND_ENV || process.env.VNP_ENV || process.env.NODE_ENV;
  if (!explicit || explicit === 'development') return 'sandbox';
  return String(explicit).toLowerCase();
};

export const toRefundClaimDto = (refund) => {
  if (!refund) return null;
  return {
    requestId: refund.requestId,
    status: refund.status
  };
};

export const toRefundAwareOrderFlags = (order) => {
  const refund = order?.activeRefundRequest || null;
  const refundPending = Boolean(order?.activeRefundRequestId) && (!refund || isActiveRefundStatus(refund.status));

  return {
    refundPending,
    refundStatus: refund?.status || (refundPending ? REFUND_STATUS.PENDING : null),
    refundRequestId: refund?.requestId || null,
    requiresRefund: isPaidVNPayCancellationRefundEligible(order) && !refundPending
  };
};

const generateRefundRequestId = () => {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const suffix = crypto.randomBytes(12).toString('base64url');
  return `RFND-${timestamp}-${suffix}`;
};

const createUniqueRefundRequestId = async (tx) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const requestId = generateRefundRequestId();
    const existing = await tx.paymentRefund.findUnique({ where: { requestId } });
    if (!existing) return requestId;
  }

  throw new OrderRefundError('REFUND_REQUEST_ID_COLLISION');
};

const toSafeClaimResult = (order, refund, outcome = 'refund_pending') => ({
  outcome,
  refund: toRefundClaimDto(refund),
  order: {
    orderCode: order.orderCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    canCancel: false,
    requiresRefund: false,
    refundPending: true,
    refundStatus: refund.status,
    refundRequestId: refund.requestId
  }
});

const resolveExistingActiveRefund = async (tx, order) => {
  if (!order.activeRefundRequestId) return null;

  const refund = order.activeRefundRequest || await tx.paymentRefund.findUnique({
    where: { id: order.activeRefundRequestId }
  });

  if (!refund || refund.orderId !== order.id) {
    throw new OrderRefundError(ORDER_REFUND_ERROR.ACTIVE_REFUND_INVARIANT);
  }

  if (!isActiveRefundStatus(refund.status)) {
    throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
  }

  return refund;
};

const createPaidVNPayCancellationRefundClaimTransaction = async ({
  ownership,
  actorType,
  actorUserId = null,
  reasonCode,
  reasonText
}) => {
  const normalizedReasonText = reasonText ? String(reasonText).trim() : null;

  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: ownership,
      include: { activeRefundRequest: true }
    });

    if (!order) {
      throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_FOUND);
    }

    const existingRefund = await resolveExistingActiveRefund(tx, order);
    if (existingRefund) {
      return toSafeClaimResult(order, existingRefund, 'refund_already_pending');
    }

    if (!isPaidVNPayCancellationRefundEligible(order)) {
      throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
    }

    const now = new Date();
    const requestId = await createUniqueRefundRequestId(tx);
    const refund = await tx.paymentRefund.create({
      data: {
        orderId: order.id,
        requestId,
        provider: REFUND_PROVIDER.VNPAY,
        environment: getRefundEnvironment(),
        amount: order.totalAmount,
        status: REFUND_STATUS.PENDING,
        actorType,
        actorUserId,
        reasonCode,
        reasonText: normalizedReasonText,
        originalOrderStatus: order.status,
        claimedAt: now,
        attemptCount: 0
      }
    });

    const claim = await tx.order.updateMany({
      where: {
        ...ownership,
        id: order.id,
        status: { in: REFUND_ELIGIBLE_STATUSES },
        paymentMethod: 'VNPAY',
        paymentStatus: 'paid',
        activeRefundRequestId: null
      },
      data: {
        activeRefundRequestId: refund.id,
        cancellationProcessingAt: now
      }
    });

    if (claim.count !== 1) {
      throw new OrderRefundError(ORDER_REFUND_ERROR.CLAIM_RACE_LOST);
    }

    return toSafeClaimResult(order, refund);
  });
};

export const createPaidVNPayCancellationRefundClaim = async (input) => {
  try {
    return await createPaidVNPayCancellationRefundClaimTransaction(input);
  } catch (error) {
    if (error instanceof OrderRefundError && error.code === ORDER_REFUND_ERROR.CLAIM_RACE_LOST) {
      const order = await prisma.order.findFirst({
        where: input.ownership,
        include: { activeRefundRequest: true }
      });

      if (!order) throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_FOUND);
      const existingRefund = await resolveExistingActiveRefund(prisma, order);
      if (existingRefund) return toSafeClaimResult(order, existingRefund, 'refund_already_pending');
      throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
    }

    throw error;
  }
};


const MANUAL_REFUND_RESULT_STATUSES = Object.freeze([
  REFUND_STATUS.SUCCEEDED,
  REFUND_STATUS.FAILED,
  REFUND_STATUS.UNKNOWN
]);

const FINAL_REFUND_STATUSES = new Set([
  REFUND_STATUS.SUCCEEDED,
  REFUND_STATUS.FAILED
]);

const toAdminRefundDto = (refund) => {
  if (!refund) return null;
  const order = refund.order || null;
  return {
    requestId: refund.requestId,
    status: refund.status,
    amount: Number(refund.amount),
    provider: refund.provider,
    environment: refund.environment,
    providerTransactionId: refund.providerTransactionId || null,
    providerResponseCode: refund.providerResponseCode || null,
    failureCode: refund.failureCode || null,
    requestedAt: refund.requestedAt,
    claimedAt: refund.claimedAt,
    processingStartedAt: refund.processingStartedAt || null,
    processedAt: refund.processedAt || null,
    processedByUserId: refund.processedByUserId || null,
    processedByName: refund.processedByName || null,
    adminNote: refund.adminNote || null,
    lastAttemptAt: refund.lastAttemptAt || null,
    attemptCount: refund.attemptCount,
    actorType: refund.actorType,
    actorUserId: refund.actorUserId || null,
    reasonCode: refund.reasonCode,
    reasonText: refund.reasonText || null,
    originalOrderStatus: refund.originalOrderStatus,
    order: order ? {
      id: order.id,
      orderCode: order.orderCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      customerType: order.userId ? 'authenticated' : 'guest',
      customerEmail: order.customerEmail,
      fullName: order.fullName,
      phone: order.phone,
      activeRefundRequestId: order.activeRefundRequestId || null,
      cancellationProcessingAt: order.cancellationProcessingAt || null,
      cancelledAt: order.cancelledAt || null,
      inventoryRestoredAt: order.inventoryRestoredAt || null
    } : null
  };
};

const refundIncludeForAdmin = {
  order: {
    include: {
      orderItems: true,
      statusHistory: { orderBy: { createdAt: 'desc' } }
    }
  }
};

const normalizeAdminText = (value, maxLength) => {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
};

const getAdminSnapshot = (adminUser) => ({
  processedByUserId: adminUser?.id || null,
  processedByName: normalizeAdminText(adminUser?.fullName || adminUser?.email || 'Admin/Staff', 255)
});

const assertRefundOrderInvariant = (refund) => {
  if (!refund?.order || refund.orderId !== refund.order.id) {
    throw new OrderRefundError(ORDER_REFUND_ERROR.ACTIVE_REFUND_INVARIANT);
  }
};

const assertActiveRefundForManualAction = (refund) => {
  assertRefundOrderInvariant(refund);
  if (refund.order.activeRefundRequestId !== refund.id) {
    throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
  }
  if (!isPaidVNPayCancellationRefundEligible(refund.order)) {
    throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
  }
};

export const listAdminRefunds = async ({ status } = {}) => {
  const where = {};
  if (status && status !== 'all') where.status = status;
  const refunds = await prisma.paymentRefund.findMany({
    where,
    include: refundIncludeForAdmin,
    orderBy: { requestedAt: 'desc' },
    take: 100
  });
  return refunds.map(toAdminRefundDto);
};

export const getAdminRefundByRequestId = async (requestId) => {
  const refund = await prisma.paymentRefund.findUnique({
    where: { requestId },
    include: refundIncludeForAdmin
  });
  if (!refund) throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_FOUND);
  return toAdminRefundDto(refund);
};

export const startManualRefundProcessing = async ({ requestId, adminUser, adminNote }) => {
  const now = new Date();
  const admin = getAdminSnapshot(adminUser);
  return prisma.$transaction(async (tx) => {
    const refund = await tx.paymentRefund.findUnique({
      where: { requestId },
      include: refundIncludeForAdmin
    });
    if (!refund) throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_FOUND);
    assertActiveRefundForManualAction(refund);

    if (refund.status === REFUND_STATUS.PROCESSING) return toAdminRefundDto(refund);
    if (refund.status !== REFUND_STATUS.PENDING) throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);

    const updatedCount = await tx.paymentRefund.updateMany({
      where: { id: refund.id, status: REFUND_STATUS.PENDING },
      data: {
        status: REFUND_STATUS.PROCESSING,
        processingStartedAt: refund.processingStartedAt || now,
        lastAttemptAt: now,
        attemptCount: { increment: 1 },
        processedByUserId: admin.processedByUserId,
        processedByName: admin.processedByName,
        adminNote: normalizeAdminText(adminNote, 1000)
      }
    });
    if (updatedCount.count !== 1) throw new OrderRefundError(ORDER_REFUND_ERROR.CLAIM_RACE_LOST);

    const updated = await tx.paymentRefund.findUnique({ where: { id: refund.id }, include: refundIncludeForAdmin });
    return toAdminRefundDto(updated);
  });
};

const getSafeFailureCode = (result) => {
  if (result === REFUND_STATUS.FAILED) return 'MANUAL_REFUND_FAILED';
  if (result === REFUND_STATUS.UNKNOWN) return 'MANUAL_REFUND_UNKNOWN';
  return null;
};

const buildManualRefundUpdate = ({ result, adminUser, providerTransactionId, providerResponseCode, adminNote, now }) => {
  const admin = getAdminSnapshot(adminUser);
  return {
    status: result,
    processedAt: FINAL_REFUND_STATUSES.has(result) ? now : null,
    processedByUserId: admin.processedByUserId,
    processedByName: admin.processedByName,
    providerTransactionId: normalizeAdminText(providerTransactionId, 255),
    providerResponseCode: normalizeAdminText(providerResponseCode, 100),
    failureCode: getSafeFailureCode(result),
    adminNote: normalizeAdminText(adminNote, 1000),
    lastAttemptAt: now,
    attemptCount: { increment: 1 }
  };
};

const getIdempotentResolvedRefund = async (tx, refund, result) => {
  const latest = await tx.paymentRefund.findUnique({ where: { id: refund.id }, include: refundIncludeForAdmin });
  if (latest?.status === result) return toAdminRefundDto(latest);
  return null;
};

export const resolveManualRefund = async ({ requestId, result, adminUser, providerTransactionId, providerResponseCode, adminNote }) => {
  if (!MANUAL_REFUND_RESULT_STATUSES.includes(result)) {
    throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const refund = await tx.paymentRefund.findUnique({
      where: { requestId },
      include: refundIncludeForAdmin
    });
    if (!refund) throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_FOUND);
    assertRefundOrderInvariant(refund);

    if (refund.status === result) return toAdminRefundDto(refund);
    if (refund.status === REFUND_STATUS.SUCCEEDED) return toAdminRefundDto(refund);

    if (result === REFUND_STATUS.SUCCEEDED) {
      if (![REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.UNKNOWN].includes(refund.status)) {
        throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
      }
      assertActiveRefundForManualAction(refund);

      const refundTransition = await tx.paymentRefund.updateMany({
        where: { id: refund.id, status: { in: [REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.UNKNOWN] } },
        data: buildManualRefundUpdate({ result, adminUser, providerTransactionId, providerResponseCode, adminNote, now })
      });
      if (refundTransition.count !== 1) {
        const idempotent = await getIdempotentResolvedRefund(tx, refund, result);
        if (idempotent) return idempotent;
        throw new OrderRefundError(ORDER_REFUND_ERROR.CLAIM_RACE_LOST);
      }

      const orderTransition = await tx.order.updateMany({
        where: {
          id: refund.orderId,
          activeRefundRequestId: refund.id,
          status: { in: REFUND_ELIGIBLE_STATUSES },
          paymentMethod: 'VNPAY',
          paymentStatus: 'paid',
          inventoryRestoredAt: null,
          cancelledAt: null
        },
        data: {
          status: 'cancelled',
          paymentStatus: 'refunded',
          cancelledAt: now,
          cancelledBy: refund.actorType,
          cancellationReasonCode: refund.reasonCode,
          cancellationReasonText: refund.reasonText,
          inventoryRestoredAt: now,
          activeRefundRequestId: null,
          cancellationProcessingAt: null
        }
      });
      if (orderTransition.count !== 1) throw new OrderRefundError(ORDER_REFUND_ERROR.CLAIM_RACE_LOST);

      for (const item of refund.order.orderItems || []) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: refund.orderId,
          fromStatus: refund.order.status,
          toStatus: 'cancelled',
          note: 'Manual VNPay refund confirmed by admin',
          cancelReason: refund.reasonText || refund.reasonCode,
          changedById: adminUser?.id || null,
          changedByName: adminUser?.fullName || adminUser?.email || 'Admin/Staff'
        }
      });

      const updated = await tx.paymentRefund.findUnique({ where: { id: refund.id }, include: refundIncludeForAdmin });
      return toAdminRefundDto(updated);
    }

    if (result === REFUND_STATUS.FAILED) {
      if (![REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.UNKNOWN].includes(refund.status)) {
        throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
      }
      assertActiveRefundForManualAction(refund);
      const refundTransition = await tx.paymentRefund.updateMany({
        where: { id: refund.id, status: { in: [REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.UNKNOWN] } },
        data: buildManualRefundUpdate({ result, adminUser, providerTransactionId, providerResponseCode, adminNote, now })
      });
      if (refundTransition.count !== 1) throw new OrderRefundError(ORDER_REFUND_ERROR.CLAIM_RACE_LOST);
      await tx.order.updateMany({
        where: { id: refund.orderId, activeRefundRequestId: refund.id },
        data: { activeRefundRequestId: null, cancellationProcessingAt: null }
      });
      const updated = await tx.paymentRefund.findUnique({ where: { id: refund.id }, include: refundIncludeForAdmin });
      return toAdminRefundDto(updated);
    }

    if (result === REFUND_STATUS.UNKNOWN) {
      if (![REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.UNKNOWN].includes(refund.status)) {
        throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
      }
      assertActiveRefundForManualAction(refund);
      const refundTransition = await tx.paymentRefund.updateMany({
        where: { id: refund.id, status: { in: [REFUND_STATUS.PENDING, REFUND_STATUS.PROCESSING, REFUND_STATUS.UNKNOWN] } },
        data: buildManualRefundUpdate({ result, adminUser, providerTransactionId, providerResponseCode, adminNote, now })
      });
      if (refundTransition.count !== 1) throw new OrderRefundError(ORDER_REFUND_ERROR.CLAIM_RACE_LOST);
      const updated = await tx.paymentRefund.findUnique({ where: { id: refund.id }, include: refundIncludeForAdmin });
      return toAdminRefundDto(updated);
    }

    throw new OrderRefundError(ORDER_REFUND_ERROR.NOT_REFUND_ELIGIBLE);
  });
};
