import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';

export class VoucherError extends Error {
  constructor(code, message, status = 409, details) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const decimal = (value) => new Prisma.Decimal(value);
const nowUtc = () => new Date();
const normalizeCode = (value) => String(value || '').trim().toUpperCase();
const normalizeAcquisitionSource = (source) => source === 'TIER_CLAIM' ? 'TIER_REWARD' : source;

const definitionDto = (definition) => ({
  id: definition.id,
  code: definition.normalizedCode,
  name: definition.name,
  description: definition.description,
  discountType: definition.discountType,
  discountValueVnd: definition.discountValue.toString(),
  maximumDiscountAmountVnd: definition.maximumDiscountVnd?.toString() ?? null,
  minimumOrderAmountVnd: definition.minimumOrderVnd?.toString() ?? null,
  isActive: definition.isActive,
  publicClaimEnabled: definition.publicClaimEnabled,
  audienceType: definition.audienceType,
  minimumTier: definition.minimumTier,
  claimStartsAt: definition.claimStartsAt,
  claimEndsAt: definition.claimEndsAt,
  fixedExpiresAt: definition.fixedExpiresAt,
  validityDaysAfterIssue: definition.validityDays,
  createdAt: definition.createdAt,
  updatedAt: definition.updatedAt,
  rewardConfig: definition.rewardCatalogItems?.[0] ? {
    pointCost: definition.rewardCatalogItems[0].pointCost,
    inventoryLimit: definition.rewardCatalogItems[0].inventoryLimit,
    redeemedCount: definition.rewardCatalogItems[0].redeemedCount,
    isActive: definition.rewardCatalogItems[0].isActive,
    validityDays: definition.rewardCatalogItems[0].validityDays
  } : null
});

const effectiveStatus = (voucher, now = nowUtc()) => {
  if (voucher.status === 'USED') return 'USED';
  return voucher.expiresAt <= now ? 'EXPIRED' : 'AVAILABLE';
};

const userVoucherDto = (voucher, now = nowUtc()) => ({
  id: voucher.id,
  voucherDefinitionId: voucher.voucherDefinitionId,
  code: voucher.issuedCode,
  name: voucher.issuedName,
  description: voucher.issuedDescription,
  discountType: voucher.issuedDiscountType,
  discountValueVnd: voucher.issuedDiscountValue.toString(),
  maximumDiscountAmountVnd: voucher.issuedMaximumDiscountVnd?.toString() ?? null,
  minimumOrderAmountVnd: voucher.issuedMinimumOrderVnd?.toString() ?? null,
  acquisitionSource: normalizeAcquisitionSource(voucher.source),
  status: voucher.status,
  effectiveStatus: effectiveStatus(voucher, now),
  issuedAt: voucher.issuedAt,
  expiresAt: voucher.expiresAt,
  usedAt: voucher.usedAt,
  currentUsedOrderId: voucher.currentUsedOrderId ?? null
});

const calculateExpiresAt = (definition, issuedAt) => {
  if (definition.fixedExpiresAt) return definition.fixedExpiresAt;
  if (definition.validityDays) return new Date(issuedAt.getTime() + definition.validityDays * 86_400_000);
  throw new VoucherError('VOUCHER_CONFIGURATION_INVALID', 'Voucher expiry is not configured', 400);
};

const issuedSnapshot = (definition, source, issuedAt = nowUtc(), expiresAt = null) => ({
  voucherDefinitionId: definition.id,
  source,
  status: 'AVAILABLE',
  issuedCode: definition.normalizedCode,
  issuedName: definition.name,
  issuedDescription: definition.description,
  issuedDiscountType: definition.discountType,
  issuedDiscountValue: definition.discountValue,
  issuedMaximumDiscountVnd: definition.maximumDiscountVnd,
  issuedMinimumOrderVnd: definition.minimumOrderVnd,
  issuedAt,
  expiresAt: expiresAt || calculateExpiresAt(definition, issuedAt)
});

const AUDIENCE_BY_SOURCE = Object.freeze({
  PUBLIC_CLAIM: 'PUBLIC',
  TIER_REWARD: 'MINIMUM_TIER',
  TIER_CLAIM: 'MINIMUM_TIER',
  POINT_REDEMPTION: 'POINT_REDEMPTION',
  ADMIN_ASSIGNMENT: 'ADMIN_ASSIGNMENT'
});

const SOURCE_REFERENCE_TYPE = Object.freeze({
  PUBLIC_CLAIM: 'PUBLIC_CLAIM',
  POINT_REDEMPTION: 'REWARD_REDEMPTION',
  ADMIN_ASSIGNMENT: 'ADMIN_ASSIGNMENT_RECIPIENT',
  TIER_REWARD: 'TIER_VOUCHER_CLAIM',
  TIER_CLAIM: 'TIER_VOUCHER_CLAIM'
});

const assertIssuanceAudience = (definition, source) => {
  const expectedAudience = AUDIENCE_BY_SOURCE[source];
  if (!expectedAudience) throw new VoucherError('VOUCHER_SOURCE_INVALID', 'Voucher source is invalid', 400);
  // Null is the 11B transition state for legacy definitions that could not be
  // classified deterministically. Existing issuance remains compatible until
  // the audience configuration rollout is complete.
  if (definition.audienceType !== null && definition.audienceType !== expectedAudience) {
    throw new VoucherError('VOUCHER_AUDIENCE_NOT_ELIGIBLE', 'Voucher is not available for this issuance source');
  }
};

const persistSourceReference = async (tx, sourceReference, voucherId) => {
  if (!sourceReference) return;
  if (sourceReference.type === 'PUBLIC_CLAIM') {
    await tx.publicVoucherClaim.create({
      data: { userId: sourceReference.userId, voucherDefinitionId: sourceReference.voucherDefinitionId, userVoucherId: voucherId }
    });
    return;
  }
  if (sourceReference.type === 'REWARD_REDEMPTION') {
    await tx.rewardRedemption.update({ where: { id: sourceReference.id }, data: { userVoucherId: voucherId } });
    return;
  }
  if (sourceReference.type === 'ADMIN_ASSIGNMENT_RECIPIENT') {
    await tx.voucherAssignmentRecipient.create({
      data: { voucherAssignmentId: sourceReference.voucherAssignmentId, userId: sourceReference.userId, userVoucherId: voucherId }
    });
    return;
  }
  if (sourceReference.type === 'TIER_VOUCHER_CLAIM') {
    await tx.tierVoucherClaim.update({ where: { id: sourceReference.id }, data: { userVoucherId: voucherId } });
    return;
  }
  throw new VoucherError('VOUCHER_SOURCE_REFERENCE_INVALID', 'Voucher source reference is invalid', 400);
};

export const validateDefinitionConfiguration = (definition) => {
  const discountValue = definition.discountValue ?? definition.discountValueVnd;
  const maximumDiscount = definition.maximumDiscountVnd ?? definition.maximumDiscountAmountVnd;
  const minimumOrder = definition.minimumOrderVnd ?? definition.minimumOrderAmountVnd;
  const validityDays = definition.validityDays ?? definition.validityDaysAfterIssue;
  const value = new Prisma.Decimal(discountValue);
  const maximum = maximumDiscount == null ? null : new Prisma.Decimal(maximumDiscount);
  const minimum = minimumOrder == null ? null : new Prisma.Decimal(minimumOrder);
  const failures = [];
  if (value.lte(0)) failures.push('discountValueVnd must be greater than zero');
  if (minimum?.lt(0)) failures.push('minimumOrderAmountVnd must be nonnegative');
  if (definition.discountType === 'FIXED_AMOUNT' && maximum !== null) failures.push('maximumDiscountAmountVnd is only valid for percentage vouchers');
  if (definition.discountType === 'PERCENTAGE') {
    if (value.gt(100)) failures.push('discountPercentage must not exceed 100');
    if (maximum === null || maximum.lte(0)) failures.push('maximumDiscountAmountVnd is required for percentage vouchers');
  }
  if (definition.claimStartsAt && definition.claimEndsAt && definition.claimStartsAt >= definition.claimEndsAt) failures.push('claimEndsAt must be after claimStartsAt');
  if (definition.fixedExpiresAt && validityDays) failures.push('Only one expiry policy may be configured');
  if (!definition.fixedExpiresAt && !validityDays) failures.push('An expiry policy is required');
  if (validityDays !== null && validityDays !== undefined && validityDays <= 0) failures.push('validityDaysAfterIssue must be positive');
  if (failures.length) throw new VoucherError('VOUCHER_DEFINITION_CONFIGURATION_INVALID', 'Voucher definition configuration is invalid', 400, { fields: failures });
};

const validateAudienceConfiguration = (definition) => {
  const failures = [];
  const audience = definition.audienceType;
  const minimumTier = definition.minimumTier;
  const validAudiences = new Set(['PUBLIC', 'MINIMUM_TIER', 'POINT_REDEMPTION', 'ADMIN_ASSIGNMENT']);
  const validTiers = new Set(['BRONZE', 'SILVER', 'GOLD', 'DIAMOND']);

  if (!validAudiences.has(audience)) failures.push('audienceType is invalid');
  if (audience === 'MINIMUM_TIER' && !validTiers.has(minimumTier)) {
    failures.push('minimumTier is required for MINIMUM_TIER audience');
  }
  if (audience !== 'MINIMUM_TIER' && minimumTier !== null) {
    failures.push('minimumTier must be null unless audienceType is MINIMUM_TIER');
  }
  if (failures.length) {
    throw new VoucherError('VOUCHER_DEFINITION_CONFIGURATION_INVALID', 'Voucher definition configuration is invalid', 400, { fields: failures });
  }
};

const assertClaimable = (definition, now = nowUtc()) => {
  if (!definition) throw new VoucherError('VOUCHER_DEFINITION_NOT_FOUND', 'Voucher definition not found', 404);
  if (!definition.isActive) throw new VoucherError('VOUCHER_DEFINITION_INACTIVE', 'Voucher definition is inactive');
  if (!definition.publicClaimEnabled) throw new VoucherError('VOUCHER_PUBLIC_CLAIM_DISABLED', 'Public claim is disabled');
  try {
    validateDefinitionConfiguration(definition);
  } catch (error) {
    if (error instanceof VoucherError && error.code === 'VOUCHER_DEFINITION_CONFIGURATION_INVALID') {
      throw new VoucherError('VOUCHER_CONFIGURATION_INVALID', 'Voucher configuration is invalid', 400);
    }
    throw error;
  }
  if (definition.claimStartsAt && now < definition.claimStartsAt) throw new VoucherError('VOUCHER_CLAIM_NOT_STARTED', 'Voucher claim has not started');
  if (definition.claimEndsAt && now > definition.claimEndsAt) throw new VoucherError('VOUCHER_CLAIM_ENDED', 'Voucher claim has ended');
};

const definitionSorts = new Set(['code', 'name', 'isActive', 'publicClaimEnabled', 'claimStartsAt', 'createdAt', 'updatedAt']);
const definitionOrderBy = (sortBy = 'updatedAt', sortOrder = 'desc') => {
  if (!definitionSorts.has(sortBy)) throw new VoucherError('VALIDATION_ERROR', 'Unsupported sortBy value', 400);
  return [{ [sortBy === 'code' ? 'normalizedCode' : sortBy]: sortOrder }, { id: sortOrder }];
};

export const listDefinitions = async ({ page = 1, limit = 20, search, isActive, publicClaimEnabled, discountType, audienceType, sortBy, sortOrder }) => {
  const where = {
    ...(search ? {
      OR: [
        { normalizedCode: { contains: normalizeCode(search) } },
        { name: { contains: search } },
        { description: { contains: search } }
      ]
    } : {}),
    ...(isActive === undefined ? {} : { isActive }),
    ...(publicClaimEnabled === undefined ? {} : { publicClaimEnabled }),
    ...(audienceType ? { audienceType } : {}),
    ...(discountType ? { discountType } : {})
  };
  const [totalItems, rows] = await prisma.$transaction([
    prisma.voucherDefinition.count({ where }),
    prisma.voucherDefinition.findMany({ where, include: { rewardCatalogItems: true }, orderBy: definitionOrderBy(sortBy, sortOrder), skip: (page - 1) * limit, take: limit })
  ]);
  return { data: rows.map(definitionDto), pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

export const getDefinition = async (id) => {
  const definition = await prisma.voucherDefinition.findUnique({ where: { id }, include: { rewardCatalogItems: true } });
  if (!definition) throw new VoucherError('VOUCHER_DEFINITION_NOT_FOUND', 'Voucher definition not found', 404);
  return definitionDto(definition);
};

const definitionPersistence = (definition) => ({
  normalizedCode: normalizeCode(definition.code),
  name: definition.name,
  description: definition.description ?? null,
  discountType: definition.discountType,
  discountValue: decimal(definition.discountValueVnd),
  maximumDiscountVnd: definition.maximumDiscountAmountVnd == null ? null : decimal(definition.maximumDiscountAmountVnd),
  minimumOrderVnd: definition.minimumOrderAmountVnd == null ? null : decimal(definition.minimumOrderAmountVnd),
  claimStartsAt: definition.claimStartsAt ?? null,
  claimEndsAt: definition.claimEndsAt ?? null,
  fixedExpiresAt: definition.fixedExpiresAt ?? null,
  validityDays: definition.validityDaysAfterIssue ?? null,
  audienceType: definition.audienceType,
  minimumTier: definition.audienceType === 'MINIMUM_TIER' ? definition.minimumTier : null,
  publicClaimEnabled: definition.audienceType === 'PUBLIC',
  isActive: definition.isActive
});

const rewardConfigData = (config, definitionIsActive = true) => {
  if (!config || !Number.isInteger(config.pointCost) || config.pointCost <= 0) {
    throw new VoucherError('VOUCHER_REWARD_CONFIGURATION_INVALID', 'Điểm cần đổi phải là số nguyên dương.', 400);
  }
  if (config.inventoryLimit !== null && config.inventoryLimit !== undefined && (!Number.isInteger(config.inventoryLimit) || config.inventoryLimit < 0)) {
    throw new VoucherError('VOUCHER_REWARD_CONFIGURATION_INVALID', 'Giới hạn số lượng phải là số nguyên không âm.', 400);
  }
  return { pointCost: config.pointCost, inventoryLimit: config.inventoryLimit ?? null, validityDays: config.validityDays ?? null, isActive: definitionIsActive && (config.isActive ?? true) };
};

const syncRewardCatalog = async (tx, definitionId, audience, config, definitionIsActive) => {
  if (audience !== 'POINT_REDEMPTION') {
    await tx.rewardCatalogItem.updateMany({ where: { voucherDefinitionId: definitionId }, data: { isActive: false } });
    return;
  }
  const data = rewardConfigData(config, definitionIsActive);
  await tx.rewardCatalogItem.upsert({ where: { voucherDefinitionId: definitionId }, create: { voucherDefinitionId: definitionId, ...data }, update: data });
};

export const createDefinition = async (data, actorId) => {
  validateDefinitionConfiguration(data);
  validateAudienceConfiguration(data);
  try {
    const definition = await prisma.$transaction(async (tx) => {
      const created = await tx.voucherDefinition.create({ data: { ...definitionPersistence(data), createdById: actorId } });
      await syncRewardCatalog(tx, created.id, data.audienceType, data.rewardConfig, created.isActive);
      return tx.voucherDefinition.findUnique({ where: { id: created.id }, include: { rewardCatalogItems: true } });
    });
    return definitionDto(definition);
  } catch (error) {
    if (error.code === 'P2002') throw new VoucherError('VOUCHER_DEFINITION_CODE_ALREADY_EXISTS', 'Voucher definition code already exists');
    throw error;
  }
};

export const updateDefinition = async (id, patch) => {
  const existing = await prisma.voucherDefinition.findUnique({ where: { id }, include: { rewardCatalogItems: true } });
  if (!existing) throw new VoucherError('VOUCHER_DEFINITION_NOT_FOUND', 'Voucher definition not found', 404);
  const candidate = {
    code: patch.code ?? existing.normalizedCode,
    name: patch.name ?? existing.name,
    description: patch.description === undefined ? existing.description : patch.description,
    discountType: patch.discountType ?? existing.discountType,
    discountValueVnd: patch.discountValueVnd ?? existing.discountValue.toString(),
    maximumDiscountAmountVnd: patch.maximumDiscountAmountVnd === undefined ? existing.maximumDiscountVnd?.toString() ?? null : patch.maximumDiscountAmountVnd,
    minimumOrderAmountVnd: patch.minimumOrderAmountVnd === undefined ? existing.minimumOrderVnd?.toString() ?? null : patch.minimumOrderAmountVnd,
    claimStartsAt: patch.claimStartsAt === undefined ? existing.claimStartsAt : patch.claimStartsAt,
    claimEndsAt: patch.claimEndsAt === undefined ? existing.claimEndsAt : patch.claimEndsAt,
    fixedExpiresAt: patch.fixedExpiresAt === undefined ? existing.fixedExpiresAt : patch.fixedExpiresAt,
    validityDaysAfterIssue: patch.validityDaysAfterIssue === undefined ? existing.validityDays : patch.validityDaysAfterIssue,
    audienceType: patch.audienceType ?? existing.audienceType,
    minimumTier: patch.audienceType && patch.audienceType !== 'MINIMUM_TIER'
      ? (patch.minimumTier === undefined ? null : patch.minimumTier)
      : (patch.minimumTier === undefined ? existing.minimumTier : patch.minimumTier),
    publicClaimEnabled: patch.publicClaimEnabled ?? existing.publicClaimEnabled,
    isActive: patch.isActive ?? existing.isActive
  };
  validateDefinitionConfiguration(candidate);
  if (candidate.audienceType !== null) validateAudienceConfiguration(candidate);
  const data = definitionPersistence(candidate);
  if (patch.isActive === undefined) delete data.isActive;
  try {
    const definition = await prisma.$transaction(async (tx) => {
      const updated = await tx.voucherDefinition.update({ where: { id }, data });
      const existingConfig = existing.rewardCatalogItems[0] ? {
        pointCost: existing.rewardCatalogItems[0].pointCost,
        inventoryLimit: existing.rewardCatalogItems[0].inventoryLimit,
        validityDays: existing.rewardCatalogItems[0].validityDays,
        isActive: existing.rewardCatalogItems[0].isActive
      } : null;
      await syncRewardCatalog(tx, id, candidate.audienceType, patch.rewardConfig ?? existingConfig, updated.isActive);
      return tx.voucherDefinition.findUnique({ where: { id }, include: { rewardCatalogItems: true } });
    });
    return definitionDto(definition);
  } catch (error) {
    if (error.code === 'P2002') throw new VoucherError('VOUCHER_DEFINITION_CODE_ALREADY_EXISTS', 'Voucher definition code already exists');
    throw error;
  }
};

const voucherSorts = new Set(['expiresAt', 'issuedAt', 'usedAt', 'id']);
const voucherOrderBy = (status, sortBy, sortOrder) => {
  const field = sortBy || (status === 'USED' ? 'usedAt' : 'expiresAt');
  if (!voucherSorts.has(field)) throw new VoucherError('VALIDATION_ERROR', 'Unsupported sortBy value', 400);
  const order = sortOrder || (status === 'USED' ? 'desc' : 'asc');
  return [{ [field]: order }, { id: 'desc' }];
};

export const listMyVouchers = async (userId, { status = 'AVAILABLE', acquisitionSource, page = 1, limit = 20, sortBy, sortOrder }) => {
  const now = nowUtc();
  const sourceFilter = acquisitionSource === 'TIER_REWARD'
    ? { in: ['TIER_REWARD', 'TIER_CLAIM'] }
    : acquisitionSource;
  const where = {
    userId,
    ...(sourceFilter ? { source: sourceFilter } : {}),
    ...(status === 'USED' ? { status: 'USED' } : status === 'EXPIRED' ? { status: 'AVAILABLE', expiresAt: { lte: now } } : { status: 'AVAILABLE', expiresAt: { gt: now } })
  };
  const [totalItems, rows] = await prisma.$transaction([
    prisma.userVoucher.count({ where }),
    prisma.userVoucher.findMany({ where, orderBy: voucherOrderBy(status, sortBy, sortOrder), skip: (page - 1) * limit, take: limit })
  ]);
  return { data: rows.map((voucher) => userVoucherDto(voucher, now)), pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } };
};

export const getMyVoucher = async (userId, id) => {
  const voucher = await prisma.userVoucher.findFirst({ where: { id, userId } });
  if (!voucher) throw new VoucherError('VOUCHER_NOT_FOUND', 'Voucher not found', 404);
  return userVoucherDto(voucher);
};

const publicVoucherDto = (definition, customerClaimed) => ({
  voucherDefinitionId: definition.id,
  code: definition.normalizedCode,
  name: definition.name,
  description: definition.description,
  discountType: definition.discountType,
  discountValueVnd: definition.discountValue.toString(),
  maximumDiscountAmountVnd: definition.maximumDiscountVnd?.toString() ?? null,
  minimumOrderAmountVnd: definition.minimumOrderVnd?.toString() ?? null,
  validFrom: definition.claimStartsAt,
  validTo: definition.claimEndsAt,
  claimStatus: customerClaimed ? 'CLAIMED' : 'CLAIMABLE'
});

export const listPublicVouchers = async (userId) => {
  const now = nowUtc();
  const definitions = await prisma.voucherDefinition.findMany({
    where: {
      isActive: true,
      publicClaimEnabled: true,
      AND: [
        { OR: [{ claimStartsAt: null }, { claimStartsAt: { lte: now } }] },
        { OR: [{ claimEndsAt: null }, { claimEndsAt: { gte: now } }] }
      ]
    },
    include: {
      publicClaims: {
        where: { userId },
        select: { id: true }
      }
    },
    orderBy: [{ claimEndsAt: 'asc' }, { id: 'asc' }]
  });

  return {
    data: definitions.flatMap((definition) => {
      try {
        validateDefinitionConfiguration(definition);
        return [publicVoucherDto(definition, definition.publicClaims.length > 0)];
      } catch (error) {
        if (error instanceof VoucherError) return [];
        throw error;
      }
    })
  };
};

export const claimVoucher = async ({ userId, voucherDefinitionId }) => {
  try {
    const voucher = await prisma.$transaction(async (tx) => {
      const definition = await tx.voucherDefinition.findUnique({ where: { id: voucherDefinitionId } });
      assertClaimable(definition);
      const existing = await tx.publicVoucherClaim.findUnique({
        where: { userId_voucherDefinitionId: { userId, voucherDefinitionId } },
        select: { id: true }
      });
      if (existing) throw new VoucherError('VOUCHER_ALREADY_CLAIMED', 'Voucher has already been claimed');
      return issueVoucher(tx, {
        userId,
        definition,
        source: 'PUBLIC_CLAIM',
        sourceReference: { type: 'PUBLIC_CLAIM', userId, voucherDefinitionId }
      });
    });
    return { voucher, dto: userVoucherDto(voucher) };
  } catch (error) {
    if (error instanceof VoucherError) throw error;
    if (error.code === 'P2002') throw new VoucherError('VOUCHER_ALREADY_CLAIMED', 'Voucher has already been claimed');
    throw error;
  }
};

// Kept for the separately scoped assignment endpoint already mounted in C1.
export const hashAssignment = ({ voucherDefinitionId, recipientUserIds, reason }) => crypto.createHash('sha256').update(JSON.stringify({ voucherDefinitionId, recipientUserIds: [...new Set(recipientUserIds)].sort((a, b) => a - b), reason: reason || null })).digest('hex');
const assertAssignable = (definition) => {
  if (!definition) throw new VoucherError('VOUCHER_DEFINITION_NOT_FOUND', 'Voucher definition not found', 404);
  if (!definition.isActive) throw new VoucherError('VOUCHER_DEFINITION_INACTIVE', 'Voucher definition is inactive');
  try {
    validateDefinitionConfiguration(definition);
  } catch (error) {
    if (error instanceof VoucherError && error.code === 'VOUCHER_DEFINITION_CONFIGURATION_INVALID') {
      throw new VoucherError('VOUCHER_CONFIGURATION_INVALID', 'Voucher configuration is invalid', 400);
    }
    throw error;
  }
};

export const issueVoucher = async (tx, { userId, definition, source, expiresAt, sourceReference }) => {
  assertAssignable(definition);
  assertIssuanceAudience(definition, source);
  if (sourceReference && SOURCE_REFERENCE_TYPE[source] !== sourceReference.type) {
    throw new VoucherError('VOUCHER_SOURCE_REFERENCE_INVALID', 'Voucher source reference is invalid', 400);
  }
  const voucher = await tx.userVoucher.create({
    data: { userId, ...issuedSnapshot(definition, source, nowUtc(), expiresAt) }
  });
  await persistSourceReference(tx, sourceReference, voucher.id);
  return voucher;
};
export const assignVouchers = async ({ actorId, voucherDefinitionId, recipientUserIds, reason, requestKey, payloadHash }) => {
  const existing = await prisma.voucherAssignment.findUnique({
    where: { actorId_requestKey: { actorId, requestKey } },
    include: { recipients: { include: { userVoucher: true } } }
  });
  if (existing) {
    if (existing.payloadHash !== payloadHash) throw new VoucherError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency key belongs to a different request');
    return { replay: true, assignment: existing };
  }
  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const definition = await tx.voucherDefinition.findUnique({ where: { id: voucherDefinitionId } });
      assertAssignable(definition);
      if (definition.audienceType !== 'ADMIN_ASSIGNMENT') {
        throw new VoucherError('VOUCHER_ASSIGNMENT_AUDIENCE_INVALID', 'Voucher is not available for admin assignment', 400);
      }
      const ids = [...new Set(recipientUserIds)];
      const recipients = await tx.user.findMany({ where: { id: { in: ids }, role: 'customer', isActive: true }, select: { id: true } });
      if (recipients.length !== ids.length) throw new VoucherError('VOUCHER_ASSIGNMENT_RECIPIENT_INVALID', 'One or more recipients are invalid', 400);
      const created = await tx.voucherAssignment.create({ data: { actorId, voucherDefinitionId, requestKey, payloadHash, reason: reason || null } });
      for (const recipient of recipients) {
        await issueVoucher(tx, {
          userId: recipient.id,
          definition,
          source: 'ADMIN_ASSIGNMENT',
          sourceReference: { type: 'ADMIN_ASSIGNMENT_RECIPIENT', voucherAssignmentId: created.id, userId: recipient.id }
        });
      }
      return tx.voucherAssignment.findUnique({ where: { id: created.id }, include: { recipients: { include: { userVoucher: true } } } });
    });
    return { replay: false, assignment };
  } catch (error) {
    if (error.code === 'P2002') {
      const replay = await prisma.voucherAssignment.findUnique({ where: { actorId_requestKey: { actorId, requestKey } }, include: { recipients: { include: { userVoucher: true } } } });
      if (replay && replay.payloadHash === payloadHash) return { replay: true, assignment: replay };
      if (replay) throw new VoucherError('IDEMPOTENCY_KEY_CONFLICT', 'Idempotency key belongs to a different request');
    }
    throw error;
  }
};
export const assignmentDto = (assignment) => ({
  assignmentId: assignment.id,
  voucherDefinitionId: assignment.voucherDefinitionId,
  recipientCount: assignment.recipients.length,
  reason: assignment.reason,
  createdAt: assignment.createdAt,
  recipients: assignment.recipients.map((item) => ({ userId: item.userId, userVoucherId: item.userVoucherId }))
});
