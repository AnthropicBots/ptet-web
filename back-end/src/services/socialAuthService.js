// services/socialAuthService.js
const { User } = require('../models');

/**
 * Finds an existing social user or creates a new one if they don't exist.
 * @param {Object} params - The parameters for finding/creating the user.
 * @param {string} params.email - User's email.
 * @param {string} params.name - User's name from Firebase.
 * @param {string} params.picture - User's profile picture URL.
 * @param {string} params.provider - Auth provider ('google' or 'github').
 * @param {string} params.defaultName - Fallback name if name is missing.
 * @returns {Promise<Object>} The found or created User object.
 */
const findOrCreateSocialUser = async ({ email, name, picture, provider, defaultName }) => {
  if (!email) {
    throw new Error('No email associated with this token');
  }

  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await User.create({
      email,
      name: name || defaultName,
      photo_url: picture,
      provider: provider,
      role: 'user'
    });
  }
  return user;
};

module.exports = { findOrCreateSocialUser };