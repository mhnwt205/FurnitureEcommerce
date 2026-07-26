import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import categoryRoutes from './routes/category.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import customerRoutes from './routes/customer.routes.js';
import adminAccountRoutes from './routes/admin-account.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import addressRoutes from './routes/address.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import reviewRoutes from './routes/review.routes.js';
import aiAdvisorRoutes from './routes/aiAdvisor.routes.js';
import consultationRequestRoutes from './routes/consultationRequest.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import promotionRoutes from './routes/promotion.routes.js';
import voucherRoutes from './routes/voucher.routes.js';
import publicVoucherRoutes from './routes/public-voucher.routes.js';
import voucherDefinitionRoutes from './routes/voucher-definition.routes.js';
import voucherClaimRoutes from './routes/voucher-claim.routes.js';
import voucherAssignmentRoutes from './routes/voucher-assignment.routes.js';
import loyaltyRoutes from './routes/loyalty.routes.js';
import { rewardCatalogRoutes, rewardRedemptionRoutes } from './routes/reward-catalog.routes.js';
import { adminSupportConversationRoutes, supportConversationRoutes } from './routes/supportConversation.routes.js';
import { isAllowedOrigin } from './utils/originPolicy.js';
import { createSupportConversationSocketServer } from './realtime/supportConversationSocket.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

const trustProxyHops = Number.parseInt(process.env.TRUST_PROXY_HOPS || '1', 10);
if (process.env.NODE_ENV === 'production' && Number.isSafeInteger(trustProxyHops) && trustProxyHops >= 0) {
  app.set('trust proxy', trustProxyHops);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/admin-accounts', adminAccountRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai-advisor', aiAdvisorRoutes);
app.use('/api/consultation-requests', consultationRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/public-vouchers', publicVoucherRoutes);
app.use('/api/voucher-definitions', voucherDefinitionRoutes);
app.use('/api/voucher-claims', voucherClaimRoutes);
app.use('/api/voucher-assignments', voucherAssignmentRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/reward-catalog', rewardCatalogRoutes);
app.use('/api/reward-redemptions', rewardRedemptionRoutes);
app.use('/api/support/conversations', supportConversationRoutes);
app.use('/api/admin/support/conversations', adminSupportConversationRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  const isSupportConversationRequest = req.path.startsWith('/api/support/conversations')
    || req.path.startsWith('/api/admin/support/conversations');
  if (err.message === 'Not allowed by CORS') {
    if (isSupportConversationRequest) {
      const requestId = typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length <= 128
        ? req.headers['x-request-id']
        : crypto.randomUUID();
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Origin not allowed by CORS' }, requestId });
    }
    return res.status(403).json({ message: 'Origin not allowed by CORS' });
  }
  if (isSupportConversationRequest) {
    const isMalformedJson = err instanceof SyntaxError && err.status === 400 && Object.hasOwn(err, 'body');
    const requestId = typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id'].length <= 128
      ? req.headers['x-request-id']
      : crypto.randomUUID();
    return res.status(isMalformedJson ? 400 : 500).json({
      error: {
        code: isMalformedJson ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR',
        message: isMalformedJson ? 'Request validation failed' : 'Internal server error'
      },
      requestId
    });
  }

  console.error('Unhandled request error', { method: req.method, path: req.path, name: err?.name });
  res.status(500).json({ message: 'Something went wrong. Please try again later.' });
});

const httpServer = createServer(app);
createSupportConversationSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
