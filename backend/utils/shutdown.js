const closeHttpServer = (server) => new Promise((resolve, reject) => {
  if (!server) return resolve();
  server.close((error) => error ? reject(error) : resolve());
});

export const createShutdownController = ({ prisma, logger, deadlineMs = 30_000, setTimer = setTimeout, clearTimer = clearTimeout, exit = process.exit, processRef = process } = {}) => {
  let shuttingDown = false;
  let shutdownPromise = null;
  let httpServer = null;
  let socketServer = null;

  const setResources = ({ server, io } = {}) => {
    httpServer = server ?? httpServer;
    socketServer = io ?? socketServer;
  };

  const shutdown = ({ reason, exitCode = 0 } = {}) => {
    if (shutdownPromise) return shutdownPromise;
    shuttingDown = true;
    logger.info('shutdown_started', { reason });
    shutdownPromise = (async () => {
      const deadline = setTimer(() => {
        logger.error('shutdown_timeout', { reason });
        exit(1);
      }, deadlineMs);
      let finalExitCode = exitCode;
      try {
        try {
          await socketServer?.close();
        } catch (error) {
          finalExitCode = 1;
          logger.error('shutdown_socket_close_failed', {}, error);
        }
        try {
          await closeHttpServer(httpServer);
        } catch (error) {
          finalExitCode = 1;
          logger.error('shutdown_http_close_failed', {}, error);
        }
        try {
          await prisma?.$disconnect();
        } catch (error) {
          finalExitCode = 1;
          logger.error('shutdown_prisma_disconnect_failed', {}, error);
        }
      } finally {
        clearTimer(deadline);
        processRef.exitCode = finalExitCode;
        logger.info('shutdown_completed', { reason });
      }
    })();
    return shutdownPromise;
  };

  return { getIsShuttingDown: () => shuttingDown, setResources, shutdown };
};
