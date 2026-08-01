import dotenv from 'dotenv';
import { createServer } from 'http';
import { createApp } from './app.js';
import prisma from './prismaClient.js';
import { validateEnvironment } from './config/env.js';
import { createSupportConversationSocketServer } from './realtime/supportConversationSocket.js';
import { logger } from './utils/logger.js';
import { createShutdownController } from './utils/shutdown.js';
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

dotenv.config({ quiet: true });

let httpServer = null;
let socketServer = null;
const lifecycle = createShutdownController({ prisma, logger });

export const shutdown = (options) => lifecycle.shutdown(options);

const installProcessHandlers = () => {
  process.once('SIGTERM', () => void shutdown({ reason: 'SIGTERM' }));
  process.once('SIGINT', () => void shutdown({ reason: 'SIGINT' }));
  process.once('uncaughtException', (error) => {
    logger.error('fatal_process_error', { reason: 'uncaughtException' }, error);
    void shutdown({ reason: 'uncaughtException', exitCode: 1 });
  });
  process.once('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error('Unhandled promise rejection');
    logger.error('fatal_process_error', { reason: 'unhandledRejection' }, error);
    void shutdown({ reason: 'unhandledRejection', exitCode: 1 });
  });
};

export const startServer = () => {
  try {
    const configuration = validateEnvironment();
    if (configuration.legacyJwt) logger.warn('legacy_jwt_secret_fallback');
    const app = createApp({ getIsShuttingDown: lifecycle.getIsShuttingDown });
    httpServer = createServer(app);
    socketServer = createSupportConversationSocketServer(httpServer);
    lifecycle.setResources({ server: httpServer, io: socketServer });
    const port = process.env.PORT || 5000;
    httpServer.listen(port, () => logger.info('server_started', { reason: 'listening' }));
    installProcessHandlers();
    return httpServer;
  } catch (error) {
    console.error('[Startup] Application startup failed', {
      errorName: error?.name,
      message: error?.message,
      issues: error?.issues,
      stack: error?.stack,
    });

    logger.error(
      'application_startup_failed',
      {
        errorName: error?.name,
        message: error?.message,
        issues: error?.issues,
      },
      error,
    );

    process.exitCode = 1;
    return null;
  }
};

startServer();
