// config/cookieConfig.js

/**
 * Shared configuration for refresh token cookies.
 * Ensures consistent creation and clearing across all authentication flows.
 */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

module.exports = { cookieOptions };