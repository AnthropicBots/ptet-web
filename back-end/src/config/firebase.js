const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration with environment variables
const config = {
  // Service Account JSON path
  serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || null,
  // Service Account JSON as string (for environment variables)
  serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null,
  // Project ID
  projectId: process.env.FIREBASE_PROJECT_ID || null,
  // Client Email
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || null,
  // Private Key
  privateKey: process.env.FIREBASE_PRIVATE_KEY || null,
  // Database URL
  databaseURL: process.env.FIREBASE_DATABASE_URL || null,
  // Storage Bucket
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || null,
  // Retry Configuration
  maxRetries: parseInt(process.env.FIREBASE_MAX_RETRIES) || 3,
  retryDelay: parseInt(process.env.FIREBASE_RETRY_DELAY) || 1000,
  // App Name (for multiple app support)
  appName: process.env.FIREBASE_APP_NAME || '[DEFAULT]',
};

// Logger function (using same logger as process handlers if available)
let logger = console;
try {
  const { logWithContext } = require('../utils/processHandlers');
  logger = {
    info: (msg, ctx) => logWithContext('INFO', msg, ctx),
    error: (msg, ctx) => logWithContext('ERROR', msg, ctx),
    warn: (msg, ctx) => logWithContext('WARNING', msg, ctx),
    debug: (msg, ctx) => logWithContext('DEBUG', msg, ctx),
  };
} catch (error) {
  // Fallback to console if processHandlers not available
  logger = {
    info: (msg, ctx) => console.log(`[INFO] ${msg}`, ctx || ''),
    error: (msg, ctx) => console.error(`[ERROR] ${msg}`, ctx || ''),
    warn: (msg, ctx) => console.warn(`[WARN] ${msg}`, ctx || ''),
    debug: (msg, ctx) => console.debug(`[DEBUG] ${msg}`, ctx || ''),
  };
}

// Validate environment configuration
const validateConfig = () => {
  const errors = [];
  const warnings = [];

  // Check for service account credentials
  const hasServiceAccountFile = config.serviceAccountPath && fs.existsSync(config.serviceAccountPath);
  const hasServiceAccountJson = config.serviceAccountJson;
  const hasIndividualCredentials = config.projectId && config.clientEmail && config.privateKey;

  if (!hasServiceAccountFile && !hasServiceAccountJson && !hasIndividualCredentials) {
    errors.push('No Firebase credentials found. Please provide either:');
    errors.push('  - FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file)');
    errors.push('  - FIREBASE_SERVICE_ACCOUNT_JSON (JSON string)');
    errors.push('  - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (individual credentials)');
  }

  // Validate individual credentials if provided
  if (config.projectId && !config.clientEmail) {
    warnings.push('FIREBASE_PROJECT_ID provided but FIREBASE_CLIENT_EMAIL is missing');
  }
  if (config.clientEmail && !config.privateKey) {
    warnings.push('FIREBASE_CLIENT_EMAIL provided but FIREBASE_PRIVATE_KEY is missing');
  }
  if (config.privateKey && !config.projectId) {
    warnings.push('FIREBASE_PRIVATE_KEY provided but FIREBASE_PROJECT_ID is missing');
  }

  // Validate service account file
  if (config.serviceAccountPath && !fs.existsSync(config.serviceAccountPath)) {
    errors.push(`Service account file not found: ${config.serviceAccountPath}`);
  }

  // Validate service account JSON
  if (config.serviceAccountJson) {
    try {
      JSON.parse(config.serviceAccountJson);
    } catch (error) {
      errors.push(`Invalid JSON in FIREBASE_SERVICE_ACCOUNT_JSON: ${error.message}`);
    }
  }

  return { errors, warnings };
};

// Get credentials from configuration
const getCredentials = () => {
  // Priority 1: Service Account JSON file
  if (config.serviceAccountPath && fs.existsSync(config.serviceAccountPath)) {
    logger.info('Loading Firebase credentials from service account file', {
      path: config.serviceAccountPath,
    });
    return admin.credential.cert(config.serviceAccountPath);
  }

  // Priority 2: Service Account JSON as string
  if (config.serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(config.serviceAccountJson);
      logger.info('Loading Firebase credentials from service account JSON', {
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
      });
      return admin.credential.cert(serviceAccount);
    } catch (error) {
      logger.error('Failed to parse service account JSON', { error: error.message });
      throw new Error(`Failed to parse service account JSON: ${error.message}`);
    }
  }

  // Priority 3: Individual environment variables
  if (config.projectId && config.clientEmail && config.privateKey) {
    const privateKey = config.privateKey.replace(/\\n/g, '\n');
    logger.info('Loading Firebase credentials from individual environment variables', {
      projectId: config.projectId,
      clientEmail: config.clientEmail,
    });
    return admin.credential.cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: privateKey,
    });
  }

  // Priority 4: Application Default Credentials (for Google Cloud environments)
  logger.info('Using Application Default Credentials for Firebase');
  return admin.credential.applicationDefault();
};

// Initialize Firebase with retry logic
const initializeFirebase = async (retryCount = 0) => {
  const appName = config.appName;

  // Check if app already exists
  let app = admin.apps.find(app => app.name === appName);
  if (app) {
    logger.info(`Firebase app already initialized: ${appName}`);
    return app;
  }

  try {
    // Validate configuration before initializing
    const { errors, warnings } = validateConfig();
    
    warnings.forEach(warning => logger.warn('Configuration warning', { warning }));
    
    if (errors.length > 0) {
      errors.forEach(error => logger.error('Configuration error', { error }));
      throw new Error(`Firebase configuration validation failed: ${errors.join(', ')}`);
    }

    // Get credentials
    const credential = getCredentials();

    // Build initialization options
    const options = {
      credential: credential,
    };

    // Add optional configurations if provided
    if (config.databaseURL) {
      options.databaseURL = config.databaseURL;
    }
    if (config.storageBucket) {
      options.storageBucket = config.storageBucket;
    }
    if (config.projectId) {
      options.projectId = config.projectId;
    }

    // Initialize the app
    app = admin.initializeApp(options, appName);
    
    logger.info(`Firebase Admin initialized successfully`, {
      appName: appName,
      projectId: app.options.projectId || 'unknown',
      credentialType: getCredentialType(credential),
    });

    return app;
  } catch (error) {
    logger.error(`Firebase initialization failed (attempt ${retryCount + 1}/${config.maxRetries + 1})`, {
      error: error.message,
      stack: error.stack,
    });

    // Retry logic
    if (retryCount < config.maxRetries) {
      const delay = config.retryDelay * Math.pow(2, retryCount); // Exponential backoff
      logger.info(`Retrying Firebase initialization in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return initializeFirebase(retryCount + 1);
    }

    throw new Error(`Failed to initialize Firebase after ${config.maxRetries + 1} attempts: ${error.message}`);
  }
};

// Helper function to determine credential type
const getCredentialType = (credential) => {
  if (credential instanceof admin.credential.Cert) {
    return 'Certificate';
  } else if (credential instanceof admin.credential.ApplicationDefault) {
    return 'Application Default';
  } else if (credential instanceof admin.credential.RefreshToken) {
    return 'Refresh Token';
  } else if (credential instanceof admin.credential.DeveloperProvider) {
    return 'Developer Provider';
  }
  return 'Unknown';
};

// Health check function
const healthCheck = async () => {
  try {
    const app = admin.apps.find(app => app.name === config.appName);
    if (!app) {
      return {
        status: 'unhealthy',
        message: 'Firebase app not initialized',
        appName: config.appName,
      };
    }

    // Test Firebase connectivity by checking project ID
    const projectId = app.options.projectId;
    if (!projectId) {
      return {
        status: 'unhealthy',
        message: 'Project ID not available',
        appName: config.appName,
      };
    }

    return {
      status: 'healthy',
      message: 'Firebase is operational',
      appName: config.appName,
      projectId: projectId,
      credentialType: getCredentialType(app.options.credential),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Health check failed: ${error.message}`,
      appName: config.appName,
      error: error.message,
    };
  }
};

// Cleanup function for graceful shutdown
const cleanup = async () => {
  try {
    const app = admin.apps.find(app => app.name === config.appName);
    if (app) {
      await app.delete();
      logger.info(`Firebase app deleted successfully: ${config.appName}`);
    }
  } catch (error) {
    logger.error('Failed to delete Firebase app', {
      error: error.message,
      appName: config.appName,
    });
    throw error;
  }
};

// Function to get Firebase instance
const getFirebaseApp = () => {
  const app = admin.apps.find(app => app.name === config.appName);
  if (!app) {
    throw new Error(`Firebase app not initialized: ${config.appName}`);
  }
  return app;
};

// Function to create additional Firebase apps (multiple app support)
const createFirebaseApp = async (appName, options = {}) => {
  try {
    // Check if app already exists
    let app = admin.apps.find(app => app.name === appName);
    if (app) {
      logger.warn(`Firebase app already exists: ${appName}`);
      return app;
    }

    // Get base credentials
    const credential = getCredentials();

    // Initialize new app with custom options
    app = admin.initializeApp({
      ...options,
      credential: credential,
    }, appName);

    logger.info(`Additional Firebase app created successfully`, {
      appName: appName,
      projectId: app.options.projectId || 'unknown',
    });

    return app;
  } catch (error) {
    logger.error(`Failed to create additional Firebase app: ${appName}`, {
      error: error.message,
    });
    throw error;
  }
};

// Export the initialized Firebase admin instance
let firebaseApp = null;

// Initialize immediately but handle errors gracefully
const initPromise = initializeFirebase()
  .then(app => {
    firebaseApp = app;
    return app;
  })
  .catch(error => {
    logger.error('Critical: Firebase initialization failed', {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw here, allow app to continue with fallback
    return null;
  });

// Export functions and admin instance
module.exports = {
  // Main Firebase admin instance (await this for initialization)
  get admin() {
    return admin;
  },

  // Get the initialized app (throws if not initialized)
  get app() {
    if (!firebaseApp) {
      throw new Error('Firebase app not initialized. Call initialize() first.');
    }
    return firebaseApp;
  },

  // Async initialization function
  initialize: async () => {
    if (!firebaseApp) {
      firebaseApp = await initPromise;
    }
    return firebaseApp;
  },

  // Health check
  healthCheck: healthCheck,

  // Cleanup
  cleanup: cleanup,

  // Get app by name
  getApp: getFirebaseApp,

  // Create additional app
  createApp: createFirebaseApp,

  // Configuration
  config: config,

  // Check if Firebase is initialized
  isInitialized: () => !!firebaseApp,

  // Credential validation
  validateConfig: validateConfig,

  // Raw admin instance for direct access (use with caution)
  adminInstance: admin,
};

// Log initialization status
initPromise.then(() => {
  logger.info('Firebase module loaded successfully');
}).catch(() => {
  logger.warn('Firebase module loaded but initialization failed');
});