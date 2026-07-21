// src/controllers/healthController.js
const os = require('os');
const mongoose = require('mongoose');
const packageJson = require('../../package.json');

const serverStartTime = Date.now();

const healthCheck = async (req, res) => {
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
        rss: (memoryUsage.rss / 1024 / 1024).toFixed(2) + ' MB',
        heapTotal: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2) + ' MB',
        heapUsed: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        external: (memoryUsage.external / 1024 / 1024).toFixed(2) + ' MB',
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
};

module.exports = { healthCheck };