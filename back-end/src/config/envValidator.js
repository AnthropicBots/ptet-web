
const REQUIRED_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'REDIS_HOST',
  'REDIS_PORT',
  'GOOGLE_APPLICATION_CREDENTIALS',
];

const validateEnv = () => {
  const missingVars = REQUIRED_ENV_VARS.filter((varName) => {
    const value = process.env[varName];
    return !value || value.trim() === '';
  });

  if (missingVars.length > 0) {
    console.error('❌ Environment Validation Failed: Missing required environment variables.');
    console.error(`   Missing: ${missingVars.join(', ')}`);
    console.error('   Please check your .env file and ensure all required variables are set.');
    process.exit(1); 
  }

  console.log('✅ Environment Variables Validation Passed.');
};

module.exports = { validateEnv };