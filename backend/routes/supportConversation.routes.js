import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';
import { supportMessageHourRateLimiter, supportMessageMinuteRateLimiter } from '../middlewares/supportConversationRateLimit.middleware.js';
import {
  acceptConversationController,
  assignConversationController,
  closeConversationController,
  createCustomerConversation,
  getCustomerConversationMessagesController,
  getCustomerConversationController,
  getStaffConversationMessagesController,
  getStaffConversationController,
  listEligibleSupportAssigneesController,
  listCustomerConversationController,
  listStaffConversationController,
  reopenConversationController,
  sendCustomerConversationMessageController,
  sendStaffConversationMessageController
} from '../controllers/supportConversation.controller.js';

const withC2ErrorEnvelope = (req, res, next) => {
  req.supportConversationErrorEnvelope = true;
  next();
};

const customerRouter = express.Router();
customerRouter.use(withC2ErrorEnvelope, verifyToken);
customerRouter.post('/', createCustomerConversation);
customerRouter.get('/', listCustomerConversationController);
customerRouter.get('/:id/messages', getCustomerConversationMessagesController);
customerRouter.post('/:id/messages', supportMessageMinuteRateLimiter, supportMessageHourRateLimiter, sendCustomerConversationMessageController);
customerRouter.get('/:id', getCustomerConversationController);

const adminRouter = express.Router();
adminRouter.use(withC2ErrorEnvelope, verifyToken);
adminRouter.get('/', requirePermission('support_conversation.read'), listStaffConversationController);
adminRouter.get('/assignees', requirePermission('support_conversation.assign'), listEligibleSupportAssigneesController);
adminRouter.get('/:id/messages', requirePermission('support_conversation.read'), getStaffConversationMessagesController);
adminRouter.post('/:id/messages', requirePermission('support_conversation.reply'), supportMessageMinuteRateLimiter, supportMessageHourRateLimiter, sendStaffConversationMessageController);
adminRouter.get('/:id', requirePermission('support_conversation.read'), getStaffConversationController);
adminRouter.post('/:id/accept', requirePermission('support_conversation.accept'), acceptConversationController);
adminRouter.post('/:id/assign', requirePermission('support_conversation.assign'), assignConversationController);
adminRouter.post('/:id/close', requirePermission('support_conversation.close'), closeConversationController);
adminRouter.post('/:id/reopen', requirePermission('support_conversation.assign'), reopenConversationController);

export { customerRouter as supportConversationRoutes, adminRouter as adminSupportConversationRoutes };
