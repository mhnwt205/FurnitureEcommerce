import express from 'express';
import { register, login, verifyEmail, googleLogin, refresh, logout, logoutAll, me, changePassword, forgotPassword, resetPassword } from '../controllers/auth.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';
import {
  forgotPasswordRateLimiter,
  googleRateLimiter,
  loginRateLimiter,
  refreshRateLimiter,
  resetPasswordRateLimiter
} from '../middlewares/authRateLimit.middleware.js';
import { requireAllowedCookieOrigin } from '../utils/originPolicy.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', loginRateLimiter, login);
router.get('/verify-email', verifyEmail);
router.post('/google', googleRateLimiter, googleLogin);
router.post('/refresh', refreshRateLimiter, requireAllowedCookieOrigin, refresh);
router.post('/logout', requireAllowedCookieOrigin, logout);
router.post('/logout-all', requireAllowedCookieOrigin, verifyToken, logoutAll);
router.get('/me', verifyToken, me);

router.put('/change-password', requireAllowedCookieOrigin, verifyToken, changePassword);
router.post('/forgot-password', forgotPasswordRateLimiter, forgotPassword);
router.post('/reset-password', resetPasswordRateLimiter, resetPassword);

export default router;
