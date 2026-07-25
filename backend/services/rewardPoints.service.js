import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';

const POINTS_PER_VND_UNIT = new Prisma.Decimal(10_000);
const MAX_POINTS = 2_147_483_647;
const POINT_ENTRY_TYPE = Object.freeze({
  EARN_ORDER: 'EARN_ORDER',
  REVERSE_ORDER: 'REVERSE_ORDER'
});
const ORDER_SOURCE_TYPE = 'ORDER';

export class RewardPointsError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'RewardPointsError';
    this.code = code;
    this.status = status;
  }
}

const decimalFromOrderAmount = (order) => {
  if (order.payableAmountVnd !== null && order.payableAmountVnd !== undefined) {
    return new Prisma.Decimal(order.payableAmountVnd);
  }

  // B2 keeps totalAmount for backward compatibility while Orders migrate to the
  // canonical Decimal payableAmountVnd. This path only supports whole-VND legacy values.
  if (typeof order.totalAmount !== 'number' || !Number.isFinite(order.totalAmount)) {
    throw new RewardPointsError('ORDER_POINTS_SOURCE_INVALID', 'Order amount is not eligible for point calculation');
  }
  return new Prisma.Decimal(String(order.totalAmount));
};

export const calculateOrderRewardPoints = (amount) => {
  const decimalAmount = new Prisma.Decimal(amount);
  if (decimalAmount.isNegative() || !decimalAmount.isInteger()) {
    throw new RewardPointsError('REWARD_POINTS_CALCULATION_INVALID', 'Order amount is invalid for point calculation');
  }

  const points = decimalAmount.div(POINTS_PER_VND_UNIT).floor();
  if (points.greaterThan(MAX_POINTS)) {
    throw new RewardPointsError('REWARD_POINTS_CALCULATION_INVALID', 'Calculated reward points exceed the supported limit');
  }
  return points.toNumber();
};

const getEligibleCompletedOrder = async (tx, orderId) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      paymentStatus: true,
      payableAmountVnd: true,
      totalAmount: true,
      user: { select: { id: true, role: true } }
    }
  });

  if (!order) throw new RewardPointsError('ORDER_NOT_ELIGIBLE_FOR_POINTS', 'Order is not eligible for reward points', 404);
  if (order.status !== 'completed' || order.paymentStatus !== 'paid' || !order.userId || order.user?.role !== 'customer') {
    throw new RewardPointsError('ORDER_NOT_ELIGIBLE_FOR_POINTS', 'Order is not eligible for reward points');
  }
  return order;
};

const updateOperationalAccount = async (tx, userId, points) => tx.loyaltyAccount.upsert({
  where: { userId },
  create: { userId, pointBalance: points, lifetimePoints: points },
  update: {
    pointBalance: { increment: points },
    lifetimePoints: { increment: points }
  }
});

export const awardPointsForCompletedOrder = async (tx, { orderId }) => {
  const order = await getEligibleCompletedOrder(tx, orderId);
  const points = calculateOrderRewardPoints(decimalFromOrderAmount(order));
  if (points === 0) return { awarded: false, points: 0, ledger: null };

  try {
    const processing = await tx.loyaltyOrderProcessing.create({
      data: { orderId: order.id, userId: order.userId }
    });
    const ledger = await tx.pointLedger.create({
      data: {
        userId: order.userId,
        orderId: order.id,
        entryType: POINT_ENTRY_TYPE.EARN_ORDER,
        sourceType: ORDER_SOURCE_TYPE,
        sourceId: order.id,
        pointsDelta: points,
        reason: 'Reward points earned from completed order'
      }
    });

    await updateOperationalAccount(tx, order.userId, points);
    await tx.loyaltyOrderProcessing.update({
      where: { id: processing.id },
      data: { earnedLedgerId: ledger.id }
    });
    return { awarded: true, points, ledger };
  } catch (error) {
    if (error?.code === 'P2002') {
      const existing = await tx.pointLedger.findFirst({
        where: { sourceType: ORDER_SOURCE_TYPE, sourceId: order.id, entryType: POINT_ENTRY_TYPE.EARN_ORDER },
        select: { id: true, pointsDelta: true }
      });
      if (existing) return { awarded: false, points: existing.pointsDelta, ledger: existing, replay: true };
      throw new RewardPointsError('ORDER_LOYALTY_ALREADY_PROCESSED', 'Order reward points were already processed');
    }
    throw error;
  }
};

const sumPoints = async (userId, where) => {
  const aggregate = await prisma.pointLedger.aggregate({ where: { userId, ...where }, _sum: { pointsDelta: true } });
  return aggregate._sum.pointsDelta || 0;
};

export const getCustomerPointSummary = async (userId) => {
  const [pointBalance, lifetimePoints, account] = await Promise.all([
    sumPoints(userId, {}),
    sumPoints(userId, { entryType: POINT_ENTRY_TYPE.EARN_ORDER }),
    prisma.loyaltyAccount.findUnique({ where: { userId }, select: { currentTier: true } })
  ]);
  return { pointBalance, lifetimePoints, currentTier: account?.currentTier || null };
};

const ledgerDto = (entry) => ({
  id: entry.id,
  type: entry.entryType,
  pointsDelta: entry.pointsDelta,
  sourceType: entry.sourceType,
  sourceId: entry.sourceId,
  orderId: entry.orderId,
  reason: entry.reason,
  createdAt: entry.createdAt
});

export const listCustomerPointHistory = async (userId, { page, limit, type }) => {
  const where = { userId, ...(type ? { entryType: type } : {}) };
  const [total, entries] = await prisma.$transaction([
    prisma.pointLedger.count({ where }),
    prisma.pointLedger.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit
    })
  ]);
  return {
    data: entries.map(ledgerDto),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

export const POINT_LEDGER_TYPES = Object.freeze([
  'EARN_ORDER',
  'REDEEM_VOUCHER',
  'REVERSE_ORDER',
  'ADMIN_ADJUSTMENT'
]);
