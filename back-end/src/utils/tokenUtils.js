// utils/tokenUtils.js
const jwt = require('jsonwebtoken');

/**
 * Generates an access token for a given user.
 * @param {Object} user - The user object containing id and role.
 * @returns {string} JWT access token.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || 'fallback_access_secret',
    { expiresIn: '15m' }
  );
};

/**
 * Generates a refresh token for a given user.
 * @param {Object} user - The user object containing id.
 * @returns {string} JWT refresh token.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: '7d' }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };