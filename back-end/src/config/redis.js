const Redis = require('ioredis');

const redisOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  connectionTimeout: parseInt(process.env.REDIS_CONNECTION_TIMEOUT) || 10000,
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT) || 5000,
  
  retryStrategy(times) {
    const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES) || 10;
    if (times > maxRetries) {
      console.error(`Redis: Max retries (${maxRetries}) reached, giving up`);
      return null;
    }
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis: Retry attempt ${times}/${maxRetries} in ${delay}ms`);
    return delay;
  },
  
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ETIMEDOUT', 'ECONNRESET'];
    if (targetErrors.some(e => err.message.includes(e))) {
      console.log(`Redis: Reconnecting on error: ${err.message}`);
      return true;
    }
    return false;
  },
  
  maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST) || 3,
  enableReadyCheck: true,
  lazyConnect: false,
  
  tls: process.env.REDIS_USE_TLS === 'true' ? {
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false'
  } : undefined,
  
  sentinel: process.env.REDIS_USE_SENTINEL === 'true' ? {
    masters: [process.env.REDIS_SENTINEL_MASTER || 'mymaster'],
    sentinelHost: process.env.REDIS_SENTINEL_HOST,
    sentinelPort: parseInt(process.env.REDIS_SENTINEL_PORT) || 26379
  } : undefined,
  
  cluster: process.env.REDIS_USE_CLUSTER === 'true' ? {
    nodes: JSON.parse(process.env.REDIS_CLUSTER_NODES || '[]')
  } : undefined
};

let redis = null;
let isConnecting = false;
let isConnected = false;

function createRedisClient() {
  if (redis && isConnected) {
    return redis;
  }

  if (isConnecting) {
    console.log('Redis: Connection already in progress, waiting...');
    return redis;
  }

  isConnecting = true;
  console.log('Redis: Creating new connection...');

  if (redisOptions.cluster && redisOptions.cluster.nodes.length > 0) {
    redis = new Redis.Cluster(redisOptions.cluster.nodes, {
      redisOptions: {
        password: redisOptions.password,
        tls: redisOptions.tls
      },
      clusterRetryStrategy: redisOptions.retryStrategy
    });
  } else if (redisOptions.sentinel && redisOptions.sentinel.sentinelHost) {
    redis = new Redis({
      sentinels: [{
        host: redisOptions.sentinel.sentinelHost,
        port: redisOptions.sentinel.sentinelPort
      }],
      name: redisOptions.sentinel.masters[0],
      password: redisOptions.password,
      tls: redisOptions.tls
    });
  } else {
    redis = new Redis(redisOptions);
  }

  setupEventHandlers(redis);
  return redis;
}

function setupEventHandlers(client) {
  client.on('connect', () => {
    isConnecting = false;
    console.log('Redis: Connected successfully');
  });

  client.on('ready', () => {
    isConnected = true;
    console.log('Redis: Ready to accept commands');
  });

  client.on('error', (err) => {
    console.error('Redis: Connection error:', err.message);
    isConnected = false;
  });

  client.on('reconnecting', (delay) => {
    console.log(`Redis: Reconnecting in ${delay}ms`);
  });

  client.on('end', () => {
    isConnected = false;
    isConnecting = false;
    console.log('Redis: Connection closed');
  });

  client.on('close', () => {
    isConnected = false;
    console.log('Redis: Connection closed');
  });
}

async function healthCheck() {
  try {
    if (!redis || !isConnected) {
      return { status: 'unhealthy', error: 'Not connected' };
    }

    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);

    return {
      status: 'healthy',
      latency: latency,
      version: versionMatch ? versionMatch[1] : 'unknown',
      connected: isConnected,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connected: isConnected,
      timestamp: new Date().toISOString()
    };
  }
}

async function getStats() {
  try {
    if (!redis || !isConnected) {
      return { error: 'Not connected' };
    }

    const [info, memory, clients] = await Promise.all([
      redis.info('stats'),
      redis.info('memory'),
      redis.info('clients')
    ]);

    const parseInfo = (str) => {
      const result = {};
      str.split('\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key.trim()] = value.trim();
        }
      });
      return result;
    };

    const stats = parseInfo(info);
    const memoryStats = parseInfo(memory);
    const clientStats = parseInfo(clients);

    return {
      totalCommands: parseInt(stats.total_commands_processed) || 0,
      totalConnections: parseInt(stats.total_connections_received) || 0,
      usedMemory: parseInt(memoryStats.used_memory) || 0,
      usedMemoryHuman: memoryStats.used_memory_human || '0',
      connectedClients: parseInt(clientStats.connected_clients) || 0,
      blockedClients: parseInt(clientStats.blocked_clients) || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function gracefulShutdown() {
  console.log('Redis: Graceful shutdown initiated...');

  if (redis) {
    try {
      await redis.quit();
      console.log('Redis: Connection closed gracefully');
    } catch (error) {
      console.error('Redis: Error during graceful shutdown:', error.message);
      await redis.disconnect();
    }
  }

  isConnected = false;
  isConnecting = false;
  redis = null;
}

async function getClient() {
  if (!redis || !isConnected) {
    redis = createRedisClient();
  }
  return redis;
}

function isReady() {
  return isConnected && redis && redis.status === 'ready';
}

const client = createRedisClient();

module.exports = {
  redis: client,
  getClient,
  healthCheck,
  getStats,
  gracefulShutdown,
  isReady,
  isConnected: () => isConnected,
  createRedisClient
};