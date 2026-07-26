import express from 'express';
import { logger as defaultLogger } from '../utils/logger.js';

const probeDatabase = (prisma, timeoutMs) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(Object.assign(new Error('Readiness probe timed out'), { code: 'READINESS_TIMEOUT' })), timeoutMs);
  Promise.resolve(prisma.$queryRawUnsafe('SELECT 1')).then(
    (value) => { clearTimeout(timeout); resolve(value); },
    (error) => { clearTimeout(timeout); reject(error); }
  );
});

export const createHealthRouter = ({ prisma, getIsShuttingDown = () => false, logger = defaultLogger, timeoutMs = 2000 }) => {
  const router = express.Router();
  router.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ status: 'ok', uptime: Number(process.uptime().toFixed(2)) });
  });
  router.get('/ready', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    if (getIsShuttingDown()) return res.status(503).json({ status: 'not_ready' });
    try {
      await probeDatabase(prisma, timeoutMs);
      return res.status(200).json({ status: 'ready' });
    } catch (error) {
      logger.warn('readiness_check_failed', { requestId: req.requestId, errorCode: error?.code }, error);
      return res.status(503).json({ status: 'not_ready' });
    }
  });
  return router;
};
