import { Prisma } from '@prisma/client';

export class CheckoutVoucherError extends Error {
  constructor(code, message, status = 409) {
    super(message);
    this.name = 'CheckoutVoucherError';
    this.code = code;
    this.status = status;
  }
}

const decimal = (value) => new Prisma.Decimal(value);
const zero = () => new Prisma.Decimal(0);
const wholeVnd = (value) => decimal(value).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);

const assertIssuedConfiguration = (voucher) => {
  const value = voucher.issuedDiscountValue;
  const maximum = voucher.issuedMaximumDiscountVnd;
  const minimum = voucher.issuedMinimumOrderVnd;

  if (!['FIXED_AMOUNT', 'PERCENTAGE'].includes(voucher.issuedDiscountType) || !value || decimal(value).lte(0) || (minimum && decimal(minimum).lt(0))) {
    throw new CheckoutVoucherError('VOUCHER_CONFIGURATION_INVALID', 'Voucher configuration is invalid', 400);
  }
  if (voucher.issuedDiscountType === 'FIXED_AMOUNT' && maximum) {
    throw new CheckoutVoucherError('VOUCHER_CONFIGURATION_INVALID', 'Voucher configuration is invalid', 400);
  }
  if (voucher.issuedDiscountType === 'PERCENTAGE' && (decimal(value).gt(100) || !maximum || decimal(maximum).lte(0))) {
    throw new CheckoutVoucherError('VOUCHER_CONFIGURATION_INVALID', 'Voucher configuration is invalid', 400);
  }
};

export const buildCanonicalPricing = (items) => {
  const originalSubtotal = items.reduce((sum, item) => sum.plus(wholeVnd(item.originalPrice).mul(item.quantity)), zero());
  const afterPromotion = items.reduce((sum, item) => sum.plus(wholeVnd(item.finalPrice).mul(item.quantity)), zero());
  const promotionDiscount = originalSubtotal.minus(afterPromotion);
  return {
    merchandiseOriginalSubtotalVnd: originalSubtotal,
    promotionDiscountTotalVnd: promotionDiscount.greaterThan(zero()) ? promotionDiscount : zero(),
    merchandiseAfterPromotionVnd: afterPromotion.greaterThan(zero()) ? afterPromotion : zero(),
    shippingAmountVnd: zero()
  };
};

export const resolveCheckoutVoucher = async (tx, { voucherId, userId, merchandiseAfterPromotionVnd, now = new Date() }) => {
  if (!voucherId) return { voucher: null, voucherDiscountVnd: zero() };
  if (!userId) throw new CheckoutVoucherError('AUTHENTICATION_REQUIRED_FOR_VOUCHER', 'Authentication is required to use a voucher', 401);

  const voucher = await tx.userVoucher.findUnique({ where: { id: voucherId } });
  if (!voucher) throw new CheckoutVoucherError('VOUCHER_NOT_FOUND', 'Voucher not found', 404);
  if (voucher.userId !== userId) throw new CheckoutVoucherError('VOUCHER_NOT_OWNED', 'Voucher does not belong to the authenticated customer', 404);
  if (voucher.status === 'USED' || voucher.usedAt || voucher.currentUsedOrderId) {
    throw new CheckoutVoucherError(voucher.status === 'USED' || voucher.usedAt ? 'VOUCHER_ALREADY_USED' : 'VOUCHER_NOT_AVAILABLE', 'Voucher is not available');
  }
  if (voucher.status !== 'AVAILABLE') throw new CheckoutVoucherError('VOUCHER_NOT_AVAILABLE', 'Voucher is not available');
  if (voucher.expiresAt <= now) throw new CheckoutVoucherError('VOUCHER_EXPIRED', 'Voucher has expired');

  assertIssuedConfiguration(voucher);
  const minimum = voucher.issuedMinimumOrderVnd ? decimal(voucher.issuedMinimumOrderVnd) : zero();
  if (merchandiseAfterPromotionVnd.lt(minimum)) {
    throw new CheckoutVoucherError('VOUCHER_MINIMUM_ORDER_NOT_MET', 'Voucher minimum order amount is not met', 422);
  }
  if (merchandiseAfterPromotionVnd.lte(0)) throw new CheckoutVoucherError('VOUCHER_NOT_APPLICABLE', 'Voucher is not applicable to this order', 422);

  let discount = voucher.issuedDiscountType === 'FIXED_AMOUNT'
    ? decimal(voucher.issuedDiscountValue)
    : merchandiseAfterPromotionVnd.mul(decimal(voucher.issuedDiscountValue)).div(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
  if (voucher.issuedDiscountType === 'PERCENTAGE') discount = Prisma.Decimal.min(discount, decimal(voucher.issuedMaximumDiscountVnd));
  discount = Prisma.Decimal.min(discount, merchandiseAfterPromotionVnd);

  return { voucher, voucherDiscountVnd: discount.greaterThan(zero()) ? discount : zero() };
};

export const consumeCheckoutVoucher = async (tx, { voucher, userId, orderId, now = new Date() }) => {
  if (!voucher) return;
  const consumed = await tx.userVoucher.updateMany({
    where: {
      id: voucher.id,
      userId,
      status: 'AVAILABLE',
      currentUsedOrderId: null,
      usedAt: null,
      expiresAt: { gt: now }
    },
    data: { status: 'USED', currentUsedOrderId: orderId, usedAt: now }
  });
  if (consumed.count !== 1) throw new CheckoutVoucherError('VOUCHER_CONSUMPTION_CONFLICT', 'Voucher is no longer available', 409);
};

export const createVoucherApplication = async (tx, { orderId, userId, voucher, pricing, voucherDiscountVnd, now = new Date() }) => {
  if (!voucher) return null;
  try {
    return await tx.voucherApplication.create({
      data: {
        orderId,
        userVoucherId: voucher.id,
        userId,
        voucherDefinitionId: voucher.voucherDefinitionId,
        appliedCode: voucher.issuedCode,
        appliedName: voucher.issuedName,
        appliedDiscountType: voucher.issuedDiscountType,
        appliedDiscountValue: voucher.issuedDiscountValue,
        appliedMaximumDiscountVnd: voucher.issuedMaximumDiscountVnd,
        appliedMinimumOrderVnd: voucher.issuedMinimumOrderVnd,
        subtotalAfterPromotionVnd: pricing.merchandiseAfterPromotionVnd,
        voucherDiscountVnd,
        merchandiseAfterVoucherVnd: pricing.merchandiseAfterVoucherVnd,
        appliedAt: now
      }
    });
  } catch (error) {
    if (error.code === 'P2002') throw new CheckoutVoucherError('VOUCHER_APPLICATION_CONFLICT', 'Voucher application already exists for this order', 409);
    throw error;
  }
};

export const restoreVoucherForOrder = async (tx, { orderId, trigger, now = new Date() }) => {
  const application = await tx.voucherApplication.findUnique({ where: { orderId } });
  if (!application || application.restoredAt) return { restored: false, application };

  const marked = await tx.voucherApplication.updateMany({
    where: { id: application.id, restoredAt: null },
    data: { restoredAt: now, restoreTrigger: trigger }
  });
  if (marked.count !== 1) return { restored: false, application };

  const voucher = await tx.userVoucher.updateMany({
    where: { id: application.userVoucherId, status: 'USED', currentUsedOrderId: orderId },
    data: { status: 'AVAILABLE', currentUsedOrderId: null, usedAt: null, lastRestoredAt: now }
  });
  if (voucher.count !== 1) throw new CheckoutVoucherError('VOUCHER_APPLICATION_CONFLICT', 'Voucher restoration data is inconsistent', 409);
  return { restored: true, application };
};
