// utils/userResponse.js
/**
 * Formats a user object for consistent API responses.
 * @param {Object} user - The user model instance.
 * @returns {Object} A standardized user response object.
 */
const formatUserResponse = (user) => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    photo_url: user.photo_url || null, // Ensures a consistent null fallback if missing
  };
};

module.exports = { formatUserResponse };