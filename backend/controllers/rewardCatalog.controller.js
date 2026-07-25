import crypto from 'crypto';
import { z } from 'zod';
import { createNotification } from '../services/notification.service.js';
import { RewardCatalogError, listRewardCatalog, redeemReward } from '../services/rewardCatalog.service.js';

const itemIdSchema = z.coerce.number().int().positive().max(2_147_483_647);
const redemptionSchema = z.object({ rewardCatalogItemId: itemIdSchema }).strict();

const requestId = (req) => (
  typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length <= 128
    ? req.headers['x-request-id']
    : crypto.randomUUID()
);

const requireCustomer = (req) => {
  if (req.user?.role !== 'customer') throw new RewardCatalogError('FORBIDDEN', 'Customer access is required', 403);
};

const sendError = (req, res, error) => {
  const validation = error instanceof z.ZodError;
  const business = error instanceof RewardCatalogError;
  const details = validation ? { fields: error.issues.reduce((fields, issue) => {
    const key = issue.path.join('.') || 'request';
    fields[key] = [...(fields[key] || []), issue.message];
    return fields;
  }, {}) } : undefined;
  res.status(business ? error.status : (validation ? 400 : 500)).json({
    error: {
      code: business ? error.code : (validation ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR'),
      message: validation ? 'Request validation failed' : (business ? error.message : 'Internal server error'),
      ...(details ? { details } : {})
    },
    requestId: requestId(req)
  });
};

const notifyAfterCommit = (payload) => {
  createNotification(payload).catch((error) => console.error('Reward redemption notification failed', { code: error?.code, name: error?.name }));
};

export const getRewardCatalog = async (req, res) => {
  try {
    requireCustomer(req);
    res.status(200).json(await listRewardCatalog());
  } catch (error) { sendError(req, res, error); }
};

export const createRewardRedemption = async (req, res) => {
  try {
    requireCustomer(req);
    const { rewardCatalogItemId } = redemptionSchema.parse(req.body);
    const result = await redeemReward({ userId: req.user.id, rewardCatalogItemId });
    notifyAfterCommit({
      recipientId: req.user.id,
      actorId: req.user.id,
      type: 'REWARD_REDEEMED',
      module: 'loyalty',
      entityType: 'RewardRedemption',
      entityId: result.redemption.id,
      title: 'Reward redeemed',
      message: 'Your reward voucher is ready to use.',
      metadata: { path: `/profile/vouchers/${result.redemption.userVoucherId}` }
    });
    res.status(201).json({ data: result.dto, message: 'Reward redeemed successfully' });
  } catch (error) { sendError(req, res, error); }
};
