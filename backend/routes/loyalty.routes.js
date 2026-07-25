import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { claimMyTierBenefit, getMyLoyaltyAccount, getMyPointHistory, getMyTier, getMyTierBenefits } from '../controllers/loyalty.controller.js';

const router = express.Router();

router.use((req, res, next) => {
  req.rewardPointsErrorEnvelope = true;
  next();
});

router.get('/account', verifyToken, getMyLoyaltyAccount);
router.get('/points', verifyToken, getMyPointHistory);
router.get('/tier', verifyToken, getMyTier);
router.get('/tier-benefits', verifyToken, getMyTierBenefits);
router.post('/tier-benefits/:voucherDefinitionId/claim', verifyToken, claimMyTierBenefit);

export default router;
