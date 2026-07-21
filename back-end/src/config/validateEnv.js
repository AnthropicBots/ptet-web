/**
 * Environment Variable Validation Utility
 * Validates required environment variables before server startup
 * @module config/validateEnv
 */

const requiredEnvVars = ['PORT', 'MONGODB_URI'];

/**
 * Validates that all required environment variables are present.
 * Exits the process with an error message if any are missing.
 * Preserves the exact same behavior as the original server.js validation.
 */
const validateEnv = () => {
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingEnvVars.join(', ')}`
    );
    process.exit(1);
  }

  console.log('✅ Environment variables validated successfully.');
};

module.exports = validateEnv;