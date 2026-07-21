const logger = require('./serverLogger'); // Same directory

/**
 * Logs essential server startup information.
 * @param {number|string} port - The port the server is running on.
 * @param {string} environment - The current Node environment.
 * @param {string} [cronStatus='started'] - Status of the cron job.
 */
const logServerStartup = (port, environment, cronStatus = 'started') => {
  logger.info(`Server running on port ${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`Environment: ${environment}`);
  logger.info(`Cron jobs ${cronStatus}`);
};

module.exports = { logServerStartup };