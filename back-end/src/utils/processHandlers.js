// back-end/src/utils/processHandlers.js

const fs = require('fs');
const path = require('path');

// Configuration with environment variables support
const config = {
  gracefulShutdownTimeout: parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT) || 30000,
  logDirectory: process.env.LOG_DIRECTORY || path.join(__dirname, '../../logs'),
  memoryCheckInterval: parseInt(process.env.MEMORY_CHECK_INTERVAL) || 60000,
  memoryThreshold: parseFloat(process.env.MEMORY_THRESHOLD) || 0.85,
  enableFileLogging: process.env.ENABLE_FILE_LOGGING !== 'false',
  logLevel: process.env.LOG_LEVEL || 'INFO',
};

// Log levels priority
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  FATAL: 4,
};

const currentLogLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.INFO;

// Ensure log directory exists
if (config.enableFileLogging && !fs.existsSync(config.logDirectory)) {
  try {
    fs.mkdirSync(config.logDirectory, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// Logger function with context and log level filtering
const logWithContext = (level, message, context = {}) => {
  const levelPriority = LOG_LEVELS[level];
  
  // Skip logging if level is below configured threshold
  if (levelPriority < currentLogLevel) {
    return null;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    context,
    pid: process.pid,
    hostname: require('os').hostname(),
  };
  
  // Console output with colors (optional)
  const consoleMessage = `[${timestamp}] [${level}] ${message}`;
  switch (level) {
    case 'ERROR':
    case 'FATAL':
      console.error('\x1b[31m%s\x1b[0m', consoleMessage, context);
      break;
    case 'WARNING':
      console.warn('\x1b[33m%s\x1b[0m', consoleMessage, context);
      break;
    case 'DEBUG':
      console.debug('\x1b[36m%s\x1b[0m', consoleMessage, context);
      break;
    default:
      console.log(consoleMessage, context);
  }
  
  // File logging
  if (config.enableFileLogging) {
    try {
      const logFilePath = path.join(config.logDirectory, `process-${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFilePath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }
  
  return logEntry;
};

// Graceful shutdown handler with improved cleanup
const gracefulShutdown = async (signal) => {
  logWithContext('INFO', `Received ${signal}, starting graceful shutdown...`, { signal });
  
  // Prevent multiple shutdown attempts
  if (global.__shuttingDown) {
    logWithContext('WARNING', 'Shutdown already in progress, ignoring duplicate signal', { signal });
    return;
  }
  global.__shuttingDown = true;
  
  // Create shutdown timeout
  const timeout = setTimeout(() => {
    logWithContext('ERROR', 'Graceful shutdown timeout, forcing exit...', { 
      timeout: config.gracefulShutdownTimeout,
      signal 
    });
    process.exit(1);
  }, config.gracefulShutdownTimeout);
  
  try {
    // Perform cleanup operations in parallel with error handling
    const cleanupTasks = [
      closeDatabaseConnections,
      closeServerConnections,
      flushLogs,
      closeOtherConnections,
    ];
    
    const results = await Promise.allSettled(
      cleanupTasks.map(task => task().catch(err => {
        logWithContext('ERROR', 'Cleanup task failed', { 
          task: task.name, 
          error: err.message,
          stack: err.stack 
        });
        throw err;
      }))
    );
    
    // Log cleanup results
    results.forEach((result, index) => {
      const taskName = cleanupTasks[index].name;
      if (result.status === 'fulfilled') {
        logWithContext('DEBUG', `Cleanup task completed successfully`, { task: taskName });
      } else {
        logWithContext('ERROR', `Cleanup task failed`, { task: taskName, error: result.reason });
      }
    });
    
    clearTimeout(timeout);
    logWithContext('INFO', 'Graceful shutdown completed', { signal });
    process.exit(0);
  } catch (error) {
    logWithContext('FATAL', 'Error during graceful shutdown', { error: error.message });
    clearTimeout(timeout);
    process.exit(1);
  }
};

// Close other connections (Redis, queues, etc.)
const closeOtherConnections = async () => {
  try {
    // Add other connection closing logic here
    // Example: await redisClient.quit();
    logWithContext('INFO', 'Other connections closed');
  } catch (error) {
    logWithContext('ERROR', 'Failed to close other connections', { error: error.message });
    throw error;
  }
};

// Database connection closer with better error handling
const closeDatabaseConnections = async () => {
  try {
    // Add your database closing logic here
    // Example: await mongoose.disconnect();
    // Example: await pool.end();
    logWithContext('INFO', 'Database connections closed successfully');
    return true;
  } catch (error) {
    logWithContext('ERROR', 'Failed to close database connections', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
};

// Server connection closer with better error handling
const closeServerConnections = async () => {
  try {
    // Add your server closing logic here
    // Example: await server.close();
    // Example: await httpServer.close();
    logWithContext('INFO', 'Server connections closed successfully');
    return true;
  } catch (error) {
    logWithContext('ERROR', 'Failed to close server connections', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
};

// Log flush with better error handling
const flushLogs = async () => {
  try {
    // Add your log flush logic here
    // Example: await logger.flush();
    logWithContext('INFO', 'Logs flushed successfully');
    return true;
  } catch (error) {
    logWithContext('ERROR', 'Failed to flush logs', { 
      error: error.message,
      stack: error.stack 
    });
    throw error;
  }
};

// Memory usage monitoring with detailed metrics
const checkMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();
  const heapUsed = memoryUsage.heapUsed / 1024 / 1024;
  const heapTotal = memoryUsage.heapTotal / 1024 / 1024;
  const rss = memoryUsage.rss / 1024 / 1024;
  const external = memoryUsage.external / 1024 / 1024;
  const arrayBuffers = memoryUsage.arrayBuffers / 1024 / 1024;
  
  const memoryUtilization = heapTotal > 0 ? heapUsed / heapTotal : 0;
  
  const metrics = {
    heapUsed: `${heapUsed.toFixed(2)} MB`,
    heapTotal: `${heapTotal.toFixed(2)} MB`,
    rss: `${rss.toFixed(2)} MB`,
    external: `${external.toFixed(2)} MB`,
    arrayBuffers: `${arrayBuffers.toFixed(2)} MB`,
    utilization: `${(memoryUtilization * 100).toFixed(2)}%`,
  };
  
  if (memoryUtilization > config.memoryThreshold) {
    logWithContext('WARNING', '⚠️ High memory usage detected', metrics);
    
    // Additional warning for extremely high memory
    if (memoryUtilization > 0.95) {
      logWithContext('ERROR', '🔴 Critical memory usage detected!', metrics);
    }
  } else if (memoryUtilization > config.memoryThreshold * 0.8) {
    logWithContext('WARNING', '⚠️ Memory usage approaching threshold', metrics);
  } else {
    logWithContext('DEBUG', '✅ Memory usage normal', metrics);
  }
  
  return { 
    heapUsed, 
    heapTotal, 
    rss, 
    external, 
    arrayBuffers, 
    memoryUtilization 
  };
};

// Health check integration with detailed status
const healthCheck = () => {
  const memoryMetrics = checkMemoryUsage();
  const uptime = process.uptime();
  
  const healthStatus = {
    status: 'healthy',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
    uptimeSeconds: uptime,
    memory: memoryMetrics,
    pid: process.pid,
    ppid: process.ppid,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: require('os').cpus().length,
    memoryTotal: `${(require('os').totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    memoryFree: `${(require('os').freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
  };
  
  logWithContext('INFO', 'Health check performed', healthStatus);
  return healthStatus;
};

// Unhandled rejection handler with recovery
const handleUnhandledRejection = (reason, promise) => {
  logWithContext('ERROR', '❌ Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
    type: typeof reason,
  });
  
  // Attempt recovery for specific types of rejections
  if (reason instanceof Error) {
    const errorMessage = reason.message.toLowerCase();
    
    if (errorMessage.includes('econnrefused') || errorMessage.includes('connection refused')) {
      logWithContext('WARNING', '🔄 Database connection error, attempting recovery...', { 
        error: reason.message,
        attempt: 'reconnect'
      });
      // Implement recovery logic here
      // Example: setTimeout(() => reconnectDatabase(), 5000);
    } else if (errorMessage.includes('timeout')) {
      logWithContext('WARNING', '⏱️ Timeout error, retrying...', { error: reason.message });
      // Implement retry logic here
    }
  }
};

// Uncaught exception handler with graceful recovery
const handleUncaughtException = (error) => {
  logWithContext('FATAL', '💥 Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    code: error.code,
    syscall: error.syscall,
    errno: error.errno,
    path: error.path,
  });
  
  // Attempt to continue if possible
  if (error.code === 'EADDRINUSE') {
    logWithContext('WARNING', '🔌 Port in use, attempting to find alternative port...', { 
      error: error.message,
      port: error.port 
    });
    // Implement port recovery logic here
    // Example: process.env.PORT = parseInt(process.env.PORT) + 1;
    // setTimeout(() => restartServer(), 1000);
  } else if (error.code === 'ENOENT') {
    logWithContext('WARNING', '📁 File not found, attempting to create...', { 
      error: error.message,
      path: error.path 
    });
    // Implement file creation logic here
  } else {
    // For critical errors, exit gracefully
    gracefulShutdown('uncaughtException');
  }
};

// Warning handler with categorization
const handleWarning = (warning) => {
  const warningData = {
    name: warning.name,
    message: warning.message,
    stack: warning.stack,
    code: warning.code,
    detail: warning.detail,
  };
  
  logWithContext('WARNING', '⚠️ Node.js Warning', warningData);
  
  // Categorize warnings
  if (warning.name === 'DeprecationWarning') {
    logWithContext('WARNING', '📅 Deprecation warning received', {
      deprecation: warning.message,
      version: process.version,
      recommendation: 'Update to latest version or use alternative API'
    });
  } else if (warning.name === 'ExperimentalWarning') {
    logWithContext('WARNING', '🧪 Experimental feature in use', {
      feature: warning.message,
      stability: 'Experimental'
    });
  } else if (warning.name === 'MaxListenersWarning') {
    logWithContext('WARNING', '🔊 Max listeners exceeded', {
      warning: warning.message,
      suggestion: 'Increase max listeners or clean up event listeners'
    });
  }
};

// Signal handler with better management
const signalHandler = (signal) => {
  // Special handling for different signals
  switch (signal) {
    case 'SIGUSR1':
      logWithContext('INFO', '🔍 Received SIGUSR1, performing diagnostic dump');
      console.log(JSON.stringify(healthCheck(), null, 2));
      break;
    case 'SIGUSR2':
      logWithContext('INFO', '🔄 Received SIGUSR2, triggering memory cleanup');
      global.gc && global.gc();
      logWithContext('INFO', '🗑️ Garbage collection triggered');
      break;
    default:
      gracefulShutdown(signal);
  }
};

// Multiple handler registration with better management
const registerProcessHandlers = () => {
  // Check if already registered
  if (global.__handlersRegistered) {
    logWithContext('WARNING', 'Process handlers already registered, skipping duplicate registration');
    return () => {};
  }
  
  const handlers = {
    unhandledRejection: handleUnhandledRejection,
    uncaughtException: handleUncaughtException,
    warning: handleWarning,
    SIGTERM: () => signalHandler('SIGTERM'),
    SIGINT: () => signalHandler('SIGINT'),
    SIGHUP: () => signalHandler('SIGHUP'),
    SIGUSR1: () => signalHandler('SIGUSR1'),
    SIGUSR2: () => signalHandler('SIGUSR2'),
  };
  
  // Register handlers with error handling
  Object.entries(handlers).forEach(([signal, handler]) => {
    try {
      // Remove any existing handlers to prevent duplicate registrations
      process.removeAllListeners(signal);
      process.on(signal, handler);
      logWithContext('DEBUG', `✅ Process handler registered`, { signal });
    } catch (error) {
      logWithContext('ERROR', `❌ Failed to register handler for ${signal}`, { 
        error: error.message 
      });
    }
  });
  
  // Register memory monitoring interval
  const memoryInterval = setInterval(checkMemoryUsage, config.memoryCheckInterval);
  
  // Register health check endpoint for IPC
  process.on('message', (message) => {
    if (message === 'healthCheck') {
      const health = healthCheck();
      if (process.send) {
        process.send(health);
      }
    } else if (message === 'memoryUsage') {
      const memory = checkMemoryUsage();
      if (process.send) {
        process.send(memory);
      }
    }
  });
  
  // Clean up on exit
  process.on('exit', (code) => {
    clearInterval(memoryInterval);
    logWithContext('INFO', `🚪 Process exiting with code: ${code}`, { 
      exitCode: code,
      uptime: process.uptime()
    });
  });
  
  // Mark as registered
  global.__handlersRegistered = true;
  
  logWithContext('INFO', '✅ Process handlers registered successfully', {
    handlers: Object.keys(handlers),
    memoryCheckInterval: config.memoryCheckInterval,
    memoryThreshold: config.memoryThreshold,
    logLevel: config.logLevel,
    fileLogging: config.enableFileLogging,
  });
  
  // Return cleanup function
  return () => {
    Object.entries(handlers).forEach(([signal, handler]) => {
      process.off(signal, handler);
      logWithContext('DEBUG', `Process handler unregistered`, { signal });
    });
    clearInterval(memoryInterval);
    global.__handlersRegistered = false;
    logWithContext('INFO', '✅ Process handlers unregistered successfully');
  };
};

// Export handler registration and utilities
module.exports = {
  registerProcessHandlers,
  gracefulShutdown,
  healthCheck,
  checkMemoryUsage,
  logWithContext,
  config,
};

// Optional: Auto-register if this file is required directly
if (require.main === module) {
  registerProcessHandlers();
  logWithContext('INFO', 'Process handlers auto-registered');
}