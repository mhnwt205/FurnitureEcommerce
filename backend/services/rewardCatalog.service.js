import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';
import { VoucherError, issueVoucher } from './voucher.service.js';

const DEFAULT_REDEMPTION_VALIDITY_DAYS = 30;
const DAY_MS = 86_400_000;
const REDEMPTION_SOURCE_TYPE = 'REWARD_REDEMPTION';

export class RewardCatalogError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'RewardCatalogError';
    this.code = code;
    this.status = status;
  }
}

const catalogDto = (item) => ({
  id: item.id,
  voucherDefinitionId: item.voucherDefinitionId,
  pointCost: item.pointCost,
  validityDays: item.validityDays ?? DEFAULT_REDEMPTION_VALIDITY_DAYS,
  isAvailable: item.isActive && item.voucherDefinition.isActive && (item.inventoryLimit === null || item.redeemedCount < item.inventoryLimit),
  voucher: {
    code: item.voucherDefinition.normalizedCode,
    name: item.voucherDefinition.name,
    description: item.voucherDefinition.description,
    discountType: item.voucherDefinition.discountType,
    discountValueVnd: item.voucherDefinition.discountValue.toString(),
    maximumDiscountAmountVnd: item.voucherDefinition.maximumDiscountVnd?.toString() ?? null,
    minimumOrderAmountVnd: item.voucherDefinition.minimumOrderVnd?.toString() ?? null
  }
});

const validCatalogConfiguration = (item) => (
  Number.isInteger(item.pointCost) && item.pointCost > 0
  && (item.inventoryLimit === null || (Number.isInteger(item.inventoryLimit) && item.inventoryLimit >= 0))
  && (item.validityDays === null || (Number.isInteger(item.validityDays) && item.validityDays > 0))
  && Number.isInteger(item.redeemedCount) && item.redeemedCount >= 0
);

const lockCustomer = (tx, userId) => tx.$queryRaw`
  SELECT [id] FROM [dbo].[User] WITH (UPDLOCK, HOLDLOCK) WHERE [id] = ${userId}
`;

const lockCatalogItem = (tx, itemId) => tx.$queryRaw`
  SELECT [id] FROM [dbo].[RewardCatalogItem] WITH (UPDLOCK, HOLDLOCK) WHERE [id] = ${itemId}
`;

const ledgerBalance = async (tx, userId) => {
  const { _sum } = await tx.pointLedger.aggregate({ where: { userId }, _sum: { pointsDelta: true } });
  return _sum.pointsDelta || 0;
};

const earnedPoints = async (tx, userId) => {
  const { _sum } = await tx.pointLedger.aggregate({ where: { userId, entryType: 'EARN_ORDER' }, _sum: { pointsDelta: true } });
  return _sum.pointsDelta || 0;
};

const redemptionDto = (redemption) => ({
  redemptionId: redemption.id,
  rewardCatalogItemId: redemption.rewardCatalogItemId,
  pointCost: redemption.pointCost,
  userVoucherId: redemption.userVoucherId,
  createdAt: redemption.createdAt
});

export const listRewardCatalog = async () => {
  const items = await prisma.rewardCatalogItem.findMany({
    where: { isActive: true, voucherDefinition: { isActive: true, audienceType: 'POINT_REDEMPTION' } },
    include: { voucherDefinition: true },
    orderBy: { id: 'asc' }
  });
  return { data: items.filter(validCatalogConfiguration).map(catalogDto) };
};

export const redeemReward = async ({ userId, rewardCatalogItemId }) => {
  try {
    const redemption = await prisma.$transaction(async (tx) => {
      await lockCustomer(tx, userId);
      await lockCatalogItem(tx, rewardCatalogItemId);

      const item = await tx.rewardCatalogItem.findUnique({
        where: { id: rewardCatalogItemId },
        include: { voucherDefinition: true }
      });
      if (!item) throw new RewardCatalogError('REWARD_CATALOG_ITEM_NOT_FOUND', 'Reward catalog item was not found', 404);
      if (!item.isActive || !item.voucherDefinition.isActive || item.voucherDefinition.audienceType !== 'POINT_REDEMPTION' || !validCatalogConfiguration(item)) {
        throw new RewardCatalogError('REWARD_CATALOG_ITEM_INACTIVE', 'Reward catalog item is unavailable');
      }
      if (item.inventoryLimit !== null && item.redeemedCount >= item.inventoryLimit) {
        throw new RewardCatalogError('REWARD_CATALOG_ITEM_UNAVAILABLE', 'Reward catalog item is out of stock');
      }

      const balance = await ledgerBalance(tx, userId);
      if (balance < item.pointCost) throw new RewardCatalogError('INSUFFICIENT_REWARD_POINTS', 'Insufficient reward points');

      const redemption = await tx.rewardRedemption.create({
        data: { userId, rewardCatalogItemId: item.id, pointCost: item.pointCost }
      });
      const ledger = await tx.pointLedger.create({
        data: {
          userId,
          entryType: 'REDEEM_VOUCHER',
          sourceType: REDEMPTION_SOURCE_TYPE,
          sourceId: redemption.id,
          pointsDelta: -item.pointCost,
          reason: 'Reward catalog redemption'
        }
      });
      const issuedAt = new Date();
      await issueVoucher(tx, {
        userId,
        definition: item.voucherDefinition,
        source: 'POINT_REDEMPTION',
        sourceReference: { type: 'REWARD_REDEMPTION', id: redemption.id },
        expiresAt: new Date(issuedAt.getTime() + (item.validityDays ?? DEFAULT_REDEMPTION_VALIDITY_DAYS) * DAY_MS)
      });

      await tx.rewardCatalogItem.update({ where: { id: item.id }, data: { redeemedCount: { increment: 1 } } });
      const pointBalance = await ledgerBalance(tx, userId);
      const lifetimePoints = await earnedPoints(tx, userId);
      await tx.loyaltyAccount.upsert({
        where: { userId },
        create: { userId, pointBalance, lifetimePoints },
        update: { pointBalance }
      });
      return tx.rewardRedemption.update({
        where: { id: redemption.id },
        data: { pointLedgerId: ledger.id },
        include: { userVoucher: true }
      });
    }, { maxWait: 20_000, timeout: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return { redemption, dto: redemptionDto(redemption) };
  } catch (error) {
    if (error instanceof RewardCatalogError) throw error;
    if (error instanceof VoucherError) throw new RewardCatalogError('REWARD_CATALOG_ITEM_INACTIVE', 'Reward catalog item is unavailable');
    if (error?.code === 'P2002') throw new RewardCatalogError('REWARD_REDEMPTION_CONFLICT', 'Reward redemption could not be completed');
    throw error;
  }
};
