const mongoose = require('mongoose');
const logger = require('./serverLogger');

const gracefulShutdown = (server, signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error('Shutdown timeout. Forcefully exiting...');
    process.exit(1);
  }, 10000);

  server.close(async () => {
    clearTimeout(shutdownTimeout);
    logger.info('Closing MongoDB connection...');

    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed.');
      logger.info('Server shut down gracefully.');
      process.exit(0);
    } catch (err) {
      logger.error(`Error during shutdown: ${err.message}`);
      process.exit(1);
    }
  });
};

const setupGracefulShutdown = (server) => {
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => {
      gracefulShutdown(server, signal);
    });
  });
};

module.exports = setupGracefulShutdown;