import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';

export const TIERS = Object.freeze([
  { name: 'BRONZE', threshold: new Prisma.Decimal(0) },
  { name: 'SILVER', threshold: new Prisma.Decimal(10_000_000) },
  { name: 'GOLD', threshold: new Prisma.Decimal(30_000_000) },
  { name: 'DIAMOND', threshold: new Prisma.Decimal(70_000_000) }
]);

const rankOf = (tier) => Math.max(0, TIERS.findIndex((candidate) => candidate.name === tier));

export const determineTier = (eligibleSpend) => {
  const spend = new Prisma.Decimal(eligibleSpend || 0);
  return [...TIERS].reverse().find((tier) => spend.greaterThanOrEqualTo(tier.threshold))?.name || 'BRONZE';
};

const qualifiedSpend = (client, userId) => client.order.aggregate({
  where: {
    userId,
    status: 'completed',
    paymentStatus: 'paid',
    merchandiseAfterVoucherVnd: { not: null }
  },
  _sum: { merchandiseAfterVoucherVnd: true }
});

const recordTierAchievement = async (tx, userId, tier) => {
  try {
    return await tx.userTierAchievement.upsert({
      where: { userId_tier: { userId, tier } },
      create: { userId, tier },
      update: {}
    });
  } catch (error) {
    // Concurrent order completions can both observe the same promotion. The
    // database uniqueness constraint is authoritative; after the competing
    // transaction wins, this evaluation is an idempotent replay.
    if (error?.code !== 'P2002') throw error;
    const existing = await tx.userTierAchievement.findUnique({
      where: { userId_tier: { userId, tier } }
    });
    if (!existing) throw error;
    return existing;
  }
};

export const evaluateTierForCompletedOrder = async (tx, { orderId }) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { userId: true, status: true, paymentStatus: true, user: { select: { role: true } } }
  });
  if (!order?.userId || order.user?.role !== 'customer' || order.status !== 'completed' || order.paymentStatus !== 'paid') return null;

  const [{ _sum }, account] = await Promise.all([
    qualifiedSpend(tx, order.userId),
    tx.loyaltyAccount.findUnique({ where: { userId: order.userId }, select: { currentTier: true } })
  ]);
  const spend = _sum.merchandiseAfterVoucherVnd || new Prisma.Decimal(0);
  const evaluatedTier = determineTier(spend);
  const currentTier = TIERS[rankOf(account?.currentTier)].name;
  const nextTier = TIERS[Math.max(rankOf(currentTier), rankOf(evaluatedTier))].name;
  const newlyReached = TIERS.slice(rankOf(currentTier) + 1, rankOf(nextTier) + 1);

  for (const tier of newlyReached) {
    await recordTierAchievement(tx, order.userId, tier.name);
  }

  await tx.loyaltyAccount.upsert({
    where: { userId: order.userId },
    create: { userId: order.userId, currentTier: nextTier },
    update: { currentTier: nextTier }
  });
  return { currentTier: nextTier, eligibleCompletedMerchandiseAmountVnd: spend };
};

export const getCustomerTierDetails = async (userId) => {
  const [{ _sum }, account, achievements] = await Promise.all([
    qualifiedSpend(prisma, userId),
    prisma.loyaltyAccount.findUnique({ where: { userId }, select: { currentTier: true } }),
    prisma.userTierAchievement.findMany({ where: { userId }, select: { tier: true, achievedAt: true }, orderBy: [{ achievedAt: 'asc' }, { id: 'asc' }] })
  ]);
  const spend = _sum.merchandiseAfterVoucherVnd || new Prisma.Decimal(0);
  const evaluatedTier = determineTier(spend);
  const currentTier = TIERS[Math.max(rankOf(account?.currentTier), rankOf(evaluatedTier))].name;
  const next = TIERS[rankOf(currentTier) + 1] || null;
  return {
    currentTier,
    eligibleCompletedMerchandiseAmountVnd: Number(spend.toString()),
    nextTier: next?.name || null,
    nextTierThresholdVnd: next ? Number(next.threshold.toString()) : null,
    remainingAmountVnd: next ? Number(Prisma.Decimal.max(new Prisma.Decimal(0), next.threshold.minus(spend)).toString()) : 0,
    achievements
  };
};
