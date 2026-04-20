import app from './app';
import { ENV } from './config/env';
import logger from './utils/logger';

const startServer = (): void => {
  const server = app.listen(ENV.PORT, () => {
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`  ArcPact Backend is running`);
    logger.info(`  Port     : ${ENV.PORT}`);
    logger.info(`  Env      : ${ENV.NODE_ENV}`);
    logger.info(`  Health   : http://localhost:${ENV.PORT}/api/v1/health`);
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${ENV.PORT} is already in use. Choose a different port.`);
    } else {
      logger.error(`Server error: ${error.message}`);
    }
    process.exit(1);
  });

  process.on('SIGINT', () => {
    logger.info('Shutting down ArcPact server...');
    server.close(() => {
      logger.info('Server closed. Goodbye.');
      process.exit(0);
    });
  });
};

startServer();
