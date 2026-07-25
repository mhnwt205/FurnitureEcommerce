import crypto from 'crypto';
import { z } from 'zod';
import {
  POINT_LEDGER_TYPES,
  RewardPointsError,
  getCustomerPointSummary,
  listCustomerPointHistory
} from '../services/rewardPoints.service.js';
import { getCustomerTierDetails } from '../services/tier.service.js';
import { TierVoucherClaimError, claimTierBenefit, listTierBenefits } from '../services/tierVoucherClaim.service.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(POINT_LEDGER_TYPES).optional()
}).strict();

const getRequestId = (req) => (
  typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length <= 128
    ? req.headers['x-request-id']
    : crypto.randomUUID()
);

const sendError = (req, res, error) => {
  const isValidation = error instanceof z.ZodError;
  const isBusiness = error instanceof RewardPointsError || error instanceof TierVoucherClaimError;
  const status = isBusiness ? error.status : (isValidation ? 400 : 500);
  const code = isBusiness ? error.code : (isValidation ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  const details = isValidation
    ? { fields: error.issues.reduce((result, issue) => {
      const key = issue.path.join('.') || 'request';
      result[key] = [...(result[key] || []), issue.message];
      return result;
    }, {}) }
    : undefined;
  return res.status(status).json({
    error: {
      code,
      message: isValidation ? 'Request validation failed' : (isBusiness ? error.message : 'Internal server error'),
      ...(details ? { details } : {})
    },
    requestId: getRequestId(req)
  });
};

const requireCustomer = (req) => {
  if (req.user?.role !== 'customer') {
    throw new RewardPointsError('FORBIDDEN', 'Customer access is required', 403);
  }
};

export const getMyLoyaltyAccount = async (req, res) => {
  try {
    requireCustomer(req);
    return res.status(200).json({ data: await getCustomerPointSummary(req.user.id) });
  } catch (error) {
    return sendError(req, res, error);
  }
};

export const getMyPointHistory = async (req, res) => {
  try {
    requireCustomer(req);
    const query = paginationSchema.parse(req.query);
    return res.status(200).json(await listCustomerPointHistory(req.user.id, query));
  } catch (error) {
    return sendError(req, res, error);
  }
};

export const getMyTier = async (req, res) => {
  try {
    requireCustomer(req);
    return res.status(200).json({ data: await getCustomerTierDetails(req.user.id) });
  } catch (error) {
    return sendError(req, res, error);
  }
};

export const getMyTierBenefits = async (req, res) => {
  try {
    requireCustomer(req);
    return res.status(200).json(await listTierBenefits(req.user.id));
  } catch (error) {
    return sendError(req, res, error);
  }
};

export const claimMyTierBenefit = async (req, res) => {
  try {
    requireCustomer(req);
    z.object({}).strict().parse(req.body || {});
    const voucherDefinitionId = z.coerce.number().int().positive().max(2_147_483_647).parse(req.params.voucherDefinitionId);
    const result = await claimTierBenefit({ userId: req.user.id, voucherDefinitionId });
    return res.status(201).json({
      data: { voucherDefinitionId, userVoucherId: result.voucher.id, claimStatus: 'CLAIMED' },
      message: 'Tier benefit claimed successfully'
    });
  } catch (error) {
    return sendError(req, res, error);
  }
};
