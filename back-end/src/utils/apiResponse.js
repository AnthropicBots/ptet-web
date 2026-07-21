/**
 * Utility functions for standardized API responses
 * @module utils/apiResponse
 */

/**
 * Success response (200)
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} JSON response
 */
const success = (
  res,
  data = null,
  message = "Success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 * @returns {Object} JSON response
 */
const created = (res, data = null, message = "Resource created successfully") => {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
};

/**
 * No Content response (204)
 * @param {Object} res - Express response object
 * @returns {Object} Empty response with 204 status
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Validation Error response (422)
 * @param {Object} res - Express response object
 * @param {*} errors - Validation error details
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const validationError = (res, errors = null, message = "Validation failed") => {
  return res.status(422).json({
    success: false,
    message,
    errors,
  });
};

/**
 * Unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const unauthorized = (res, message = "Unauthorized access") => {
  return res.status(401).json({
    success: false,
    message,
  });
};

/**
 * Forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const forbidden = (res, message = "Access forbidden") => {
  return res.status(403).json({
    success: false,
    message,
  });
};

/**
 * Not Found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @returns {Object} JSON response
 */
const notFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message,
  });
};

/**
 * Error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} JSON response
 */
const error = (
  res,
  message = "Something went wrong",
  statusCode = 500
) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * Paginated response (200)
 * @param {Object} res - Express response object
 * @param {Array} data - Paginated data array
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total items count
 * @param {string} message - Success message
 * @returns {Object} JSON response with pagination metadata
 */
const paginate = (
  res,
  data,
  page,
  limit,
  total,
  message = "Success"
) => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
  });
};

module.exports = {
  success,
  created,
  noContent,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  error,
  paginate,
};