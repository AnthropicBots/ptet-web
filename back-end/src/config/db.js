/**
 * Database Configuration
 * @module config/db
 */

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  dialect: process.env.DB_DIALECT || 'postgres',
  pool: {
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    min: parseInt(process.env.DB_POOL_MIN, 10) || 0,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000
  },
  dialectOptions: {
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },
  logging: process.env.NODE_ENV === 'development' 
    ? (msg) => logger.debug(msg) 
    : false
};

// Initialize Sequelize
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    pool: dbConfig.pool,
    dialectOptions: dbConfig.dialectOptions,
    logging: dbConfig.logging,
    define: {
      timestamps: true,
      underscored: true
    }
  }
);

// Connection function with retry logic
const connectDB = async () => {
  let attempts = 0;
  const maxAttempts = parseInt(process.env.DB_RETRY_MAX, 10) || 3;
  const timeout = parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 5000;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      logger.info(`Database connection attempt ${attempts} of ${maxAttempts}`);

      // Set connection timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Connection timeout after ${timeout}ms`));
        }, timeout);
      });

      // Race between connection and timeout
      await Promise.race([
        sequelize.authenticate(),
        timeoutPromise
      ]);

      logger.info('Database connection established successfully');
      
      // Sync models with force: false by default
      await sequelize.sync({ 
        force: process.env.DB_FORCE_SYNC === 'true' ? true : false,
        alter: process.env.DB_ALTER_SYNC === 'true' ? true : false
      });
      
      logger.info('Database models synchronized');
      return sequelize;
      
    } catch (error) {
      logger.error(`Database connection attempt ${attempts} failed:`, error.message);
      
      if (attempts === maxAttempts) {
        logger.error(`Failed to connect after ${maxAttempts} attempts`);
        throw new Error(`Database connection failed: ${error.message}`);
      }
      
      // Exponential backoff
      const backoffTime = Math.pow(2, attempts) * 1000;
      logger.info(`Retrying in ${backoffTime / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
};

// Graceful shutdown function
const closeDB = async () => {
  try {
    await sequelize.close();
    logger.info('Database connection closed gracefully');
  } catch (error) {
    logger.error('Error closing database connection:', error.message);
    throw error;
  }
};

module.exports = {
  sequelize,
  connectDB,
  closeDB
};