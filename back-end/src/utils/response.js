/**
 * Base API response utility for consistent JSON responses.
 */

const responseUtility = {
  /**
   * Send a success response
   * @param {Object} res 
   * @param {Object} data 
   * @param {string} [message='Success'] 
   * @param {number} [statusCode=200] 
   */
  success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  /**
   * Send an error response
   * @param {Object} res 
   * @param {string} [message='Internal Server Error'] 
   * @param {number} [statusCode=500] 
   * @param {Object|Array} [errors=null] 
   */
  error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
    const responsePayload = {
      success: false,
      message,
    };

    if (errors) {
      responsePayload.errors = errors;
    }

    return res.status(statusCode).json(responsePayload);
  },

  /**
   * Send a paginated success response
   * @param {Object} res 
   * @param {Array} data 
   * @param {Object} pagination 
   * @param {number} pagination.totalItems 
   * @param {number} pagination.totalPages 
   * @param {number} pagination.currentPage 
   * @param {number} pagination.limit 
   * @param {string} [message='Success'] 
   * @param {number} [statusCode=200] 
   */
  paginate(res, data = [], pagination = {}, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      pagination: {
        totalItems: pagination.totalItems || 0,
        totalPages: pagination.totalPages || 0,
        currentPage: pagination.currentPage || 1,
        limit: pagination.limit || 10,
      },
    });
  },
};

module.exports = responseUtility;
