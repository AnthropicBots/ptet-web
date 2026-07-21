/**
 * Converts memory bytes to a formatted string in Megabytes (MB).
 * @param {number} bytes - Memory size in bytes.
 * @returns {string} - Formatted string with MB suffix and 2 decimal places.
 */
const formatMemory = (bytes) => {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
};

module.exports = { formatMemory };