import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { createRewardRedemption, getRewardCatalog } from '../controllers/rewardCatalog.controller.js';

const applyLoyaltyErrorEnvelope = (router) => {
  router.use((req, res, next) => {
    req.rewardPointsErrorEnvelope = true;
    next();
  });
  return router;
};

export const rewardCatalogRoutes = applyLoyaltyErrorEnvelope(express.Router());
export const rewardRedemptionRoutes = applyLoyaltyErrorEnvelope(express.Router());

rewardCatalogRoutes.get('/', verifyToken, getRewardCatalog);
rewardRedemptionRoutes.post('/', verifyToken, createRewardRedemption);

export default rewardCatalogRoutes;
