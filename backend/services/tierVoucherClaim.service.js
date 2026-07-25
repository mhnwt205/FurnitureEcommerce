import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';
import { VoucherError, issueVoucher, validateDefinitionConfiguration } from './voucher.service.js';

const TIER_RANK = Object.freeze({ BRONZE: 0, SILVER: 1, GOLD: 2, DIAMOND: 3 });

export class TierVoucherClaimError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'TierVoucherClaimError';
    this.code = code;
    this.status = status;
  }
}

const tierRank = (tier) => TIER_RANK[tier] ?? TIER_RANK.BRONZE;
const meetsMinimumTier = (currentTier, minimumTier) => tierRank(currentTier) >= tierRank(minimumTier);
const nowUtc = () => new Date();

const isInClaimWindow = (definition, now) => (
  (!definition.claimStartsAt || definition.claimStartsAt <= now)
  && (!definition.claimEndsAt || definition.claimEndsAt >= now)
);

const assertTierBenefitDefinition = (definition, now) => {
  if (!definition || definition.audienceType !== 'MINIMUM_TIER' || !definition.isActive || !isInClaimWindow(definition, now)) {
    throw new TierVoucherClaimError('TIER_BENEFIT_NOT_FOUND', 'Tier benefit was not found', 404);
  }
  try {
    validateDefinitionConfiguration(definition);
  } catch (error) {
    if (error instanceof VoucherError) throw new TierVoucherClaimError('TIER_BENEFIT_NOT_FOUND', 'Tier benefit was not found', 404);
    throw error;
  }
};

const tierBenefitDto = (definition, claimed) => ({
  voucherDefinitionId: definition.id,
  title: definition.name,
  description: definition.description,
  discountType: definition.discountType,
  discountValueVnd: definition.discountValue.toString(),
  maximumDiscountAmountVnd: definition.maximumDiscountVnd?.toString() ?? null,
  minimumOrderAmountVnd: definition.minimumOrderVnd?.toString() ?? null,
  validFrom: definition.claimStartsAt,
  validTo: definition.claimEndsAt,
  fixedExpiresAt: definition.fixedExpiresAt,
  validityDaysAfterIssue: definition.validityDays,
  claimStatus: claimed ? 'CLAIMED' : 'CLAIMABLE'
});

const getCurrentTier = async (client, userId) => {
  const account = await client.loyaltyAccount.findUnique({ where: { userId }, select: { currentTier: true } });
  return account?.currentTier || 'BRONZE';
};

export const listTierBenefits = async (userId) => {
  const now = nowUtc();
  const [currentTier, definitions] = await Promise.all([
    getCurrentTier(prisma, userId),
    prisma.voucherDefinition.findMany({
      where: {
        audienceType: 'MINIMUM_TIER',
        isActive: true,
        AND: [
          { OR: [{ claimStartsAt: null }, { claimStartsAt: { lte: now } }] },
          { OR: [{ claimEndsAt: null }, { claimEndsAt: { gte: now } }] }
        ]
      },
      include: { tierVoucherClaims: { where: { userId }, select: { id: true } } },
      orderBy: [{ claimEndsAt: 'asc' }, { id: 'asc' }]
    })
  ]);

  return {
    data: definitions.flatMap((definition) => {
      try {
        assertTierBenefitDefinition(definition, now);
        return meetsMinimumTier(currentTier, definition.minimumTier)
          ? [tierBenefitDto(definition, definition.tierVoucherClaims.length > 0)]
          : [];
      } catch (error) {
        if (error instanceof TierVoucherClaimError) return [];
        throw error;
      }
    })
  };
};

export const claimTierBenefit = async ({ userId, voucherDefinitionId }) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const now = nowUtc();
      const definition = await tx.voucherDefinition.findUnique({ where: { id: voucherDefinitionId } });
      assertTierBenefitDefinition(definition, now);

      const currentTier = await getCurrentTier(tx, userId);
      if (!meetsMinimumTier(currentTier, definition.minimumTier)) {
        throw new TierVoucherClaimError('TIER_BENEFIT_NOT_FOUND', 'Tier benefit was not found', 404);
      }

      const existing = await tx.tierVoucherClaim.findUnique({
        where: { userId_voucherDefinitionId: { userId, voucherDefinitionId } },
        select: { id: true }
      });
      if (existing) throw new TierVoucherClaimError('TIER_BENEFIT_ALREADY_CLAIMED', 'Tier benefit has already been claimed');

      const claim = await tx.tierVoucherClaim.create({
        data: { userId, voucherDefinitionId, tierAtClaim: currentTier }
      });
      const voucher = await issueVoucher(tx, {
        userId,
        definition,
        source: 'TIER_REWARD',
        sourceReference: { type: 'TIER_VOUCHER_CLAIM', id: claim.id }
      });
      return { claim, voucher };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 20_000, timeout: 30_000 });
    return result;
  } catch (error) {
    if (error instanceof TierVoucherClaimError) throw error;
    if (error instanceof VoucherError) throw new TierVoucherClaimError('TIER_BENEFIT_NOT_FOUND', 'Tier benefit was not found', 404);
    if (error?.code === 'P2002' || error?.code === 'P2034') {
      throw new TierVoucherClaimError('TIER_BENEFIT_ALREADY_CLAIMED', 'Tier benefit has already been claimed');
    }
    throw error;
  }
};
