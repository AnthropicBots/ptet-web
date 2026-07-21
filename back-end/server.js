/**
 * Server Configuration
 * @module server
 */

require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const mongoose = require('mongoose');
const logger = require("./src/utils/serverLogger");
const packageJson = require('./package.json'); // 🟢 Fixed: Added missing import
const setupGracefulShutdown = require('./src/utils/gracefulShutdown'); // 🟢 Fixed: Added import for #243
const { formatMemory } = require('./src/utils/memoryFormatter');
const PORT = process.env.PORT || 5000;

require('./src/models');

const { streakJob } = require('./src/jobs/streakJob');
const { logServerStartup } = require('./src/utils/serverStartupLogger')
// ==================== ENVIRONMENT VALIDATION ====================
validateEnv();

// ==================== UNHANDLED REJECTIONS & EXCEPTIONS ====================
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught Exception');
  process.exit(1);
});

// ==================== HEALTH CHECK ENDPOINT ====================
app.get('/health', async (req, res) => {
  const memoryUsage = process.memoryUsage();

  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown',
    connected: dbState === 1,
  };

  let appStatus = 'healthy';
  let dbLatency = null;

  if (dbStatus.connected) {
    const startPing = Date.now();
    try {
      await mongoose.connection.db.admin().ping();
      dbLatency = Date.now() - startPing;
    } catch (err) {
      appStatus = 'degraded';
      dbLatency = 'error';
    }
  } else {
    appStatus = 'unhealthy';
  }

  return res.status(appStatus === 'unhealthy' ? 503 : 200).json({
    status: appStatus === 'healthy' ? 'OK' : appStatus === 'degraded' ? 'DEGRADED' : 'UNHEALTHY',
    timestamp: new Date().toISOString(),
    application: {
      name: packageJson.name || 'Express App',
      version: packageJson.version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      startTime: new Date(serverStartTime).toISOString(),
      uptime: process.uptime(),
      processId: process.pid,
      nodeVersion: process.version,
    },
    system: {
      memory: {
        rss: formatMemory(memoryUsage.rss),
        heapTotal: formatMemory(memoryUsage.heapTotal),
        heapUsed: formatMemory(memoryUsage.heapUsed),
        external: formatMemory(memoryUsage.external),
      },
      platform: os.platform(),
      arch: os.arch(),
    },
    dependencies: {
      database: {
        type: 'MongoDB',
        status: dbStatus.state,
        connected: dbStatus.connected,
        latency: dbLatency !== null && typeof dbLatency === 'number' ? `${dbLatency}ms` : 'N/A',
      },
    },
  });
});

// ==================== START SERVER ====================
const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      const env = process.env.NODE_ENV || 'development';
      logServerStartup(PORT, env, 'started');
      streakJob.start(); // Cron job starts here
    });

    return server;
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// ==================== INITIALIZE SERVER ====================
const initializeServer = async () => {
  const server = await startServer();
  // 🔥 Fixed: Using the imported helper (Issue #243)
  setupGracefulShutdown(server);
};

// ==================== START APPLICATION ====================
initializeServer().catch((err) => {
  logger.error(`Application startup failed: ${err.message}`);
  process.exit(1);
});

module.exports = app;