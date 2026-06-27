import express from 'express';
import {
  assignConsultationRequest,
  createConsultationRequest,
  getAdminConsultationRequestById,
  getAdminConsultationRequests,
  getConsultationAssignees,
  getMyConsultationRequests,
  updateConsultationRequestNote,
  updateConsultationRequestStatus
} from '../controllers/consultationRequest.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import { verifyAdminOrStaff } from '../middlewares/admin.middleware.js';
import { requirePermission } from '../middlewares/permission.middleware.js';

const router = express.Router();

router.post('/', createConsultationRequest);
router.get('/my', verifyToken, getMyConsultationRequests);

router.get('/admin', verifyToken, verifyAdminOrStaff, requirePermission('consultation.view'), getAdminConsultationRequests);
router.get('/admin/assignees', verifyToken, verifyAdminOrStaff, requirePermission('consultation.view'), getConsultationAssignees);
router.get('/admin/:id', verifyToken, verifyAdminOrStaff, requirePermission('consultation.view'), getAdminConsultationRequestById);
router.patch('/admin/:id/status', verifyToken, verifyAdminOrStaff, requirePermission('consultation.update'), updateConsultationRequestStatus);
router.patch('/admin/:id/assign', verifyToken, verifyAdminOrStaff, requirePermission('consultation.update'), assignConsultationRequest);
router.patch('/admin/:id/note', verifyToken, verifyAdminOrStaff, requirePermission('consultation.update'), updateConsultationRequestNote);

export default router;