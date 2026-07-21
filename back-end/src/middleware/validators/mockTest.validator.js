const { query, param, body } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validation');

const ALLOWED_TEST_TYPES = ['subject', 'chapter', 'full-length'];
const ALLOWED_DIFFICULTIES = ['easy', 'medium', 'hard'];
const ALLOWED_SORT_FIELDS = ['created_at', 'title', 'duration', 'difficulty', 'total_questions'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

/**
 * Validation rules for GET /api/mock-tests
 * Includes pagination, search, sort, and filter validation
 */
exports.validateGetTests = [
  // ============ PAGINATION VALIDATION ============
  
  // Page validation - min 1
  query('page')
    .optional()
    .trim()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer (min: 1)')
    .toInt()
    .default(1),

  // Limit validation - min 1, max 100
  query('limit')
    .optional()
    .trim()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt()
    .default(10),

  // ============ SEARCH VALIDATION ============
  
  // Search validation - trim, min length 2
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Search query must be at least 2 characters')
    .escape() // Prevent XSS
    .customSanitizer(value => {
      // Remove special characters that might cause issues
      return value.replace(/[^\w\s]/gi, '');
    }),

  // ============ SORT VALIDATION ============
  
  // Sort field validation - only allowed fields
  query('sort')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_SORT_FIELDS)
    .withMessage(`Sort field must be one of: ${ALLOWED_SORT_FIELDS.join(', ')}`)
    .default('created_at'),

  // Sort order validation - asc or desc
  query('order')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_SORT_ORDERS)
    .withMessage(`Order must be one of: ${ALLOWED_SORT_ORDERS.join(', ')}`)
    .default('desc'),

  // ============ FILTER VALIDATION ============
  
  // Type filter - single or multiple values
  query('type')
    .optional()
    .trim()
    .toLowerCase()
    .custom(value => {
      // Check if it's a single value or comma-separated list
      if (typeof value === 'string' && value.includes(',')) {
        const types = value.split(',').map(t => t.trim().toLowerCase());
        const invalidTypes = types.filter(t => !ALLOWED_TEST_TYPES.includes(t));
        if (invalidTypes.length > 0) {
          throw new Error(`Invalid test types: ${invalidTypes.join(', ')}. Allowed: ${ALLOWED_TEST_TYPES.join(', ')}`);
        }
        return true;
      }
      return ALLOWED_TEST_TYPES.includes(value);
    })
    .withMessage(`Type must be one of: ${ALLOWED_TEST_TYPES.join(', ')} or a comma-separated list`),

  // Difficulty filter - single or multiple values
  query('difficulty')
    .optional()
    .trim()
    .toLowerCase()
    .custom(value => {
      if (typeof value === 'string' && value.includes(',')) {
        const difficulties = value.split(',').map(d => d.trim().toLowerCase());
        const invalidDifficulties = difficulties.filter(d => !ALLOWED_DIFFICULTIES.includes(d));
        if (invalidDifficulties.length > 0) {
          throw new Error(`Invalid difficulties: ${invalidDifficulties.join(', ')}. Allowed: ${ALLOWED_DIFFICULTIES.join(', ')}`);
        }
        return true;
      }
      return ALLOWED_DIFFICULTIES.includes(value);
    })
    .withMessage(`Difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')} or a comma-separated list`),

  // Duration filter - min 1
  query('duration')
    .optional()
    .trim()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (min: 1)')
    .toInt(),

  // Duration range - min and max
  query('duration_min')
    .optional()
    .trim()
    .isInt({ min: 1 })
    .withMessage('Duration min must be a positive integer')
    .toInt(),

  query('duration_max')
    .optional()
    .trim()
    .isInt({ min: 1 })
    .withMessage('Duration max must be a positive integer')
    .toInt()
    .custom((value, { req }) => {
      if (req.query.duration_min && value < parseInt(req.query.duration_min)) {
        throw new Error('Duration max must be greater than or equal to duration min');
      }
      return true;
    }),

  // ============ ADDITIONAL FILTERS ============
  
  // Total questions filter
  query('total_questions')
    .optional()
    .trim()
    .isInt({ min: 1 })
    .withMessage('Total questions must be a positive integer')
    .toInt(),

  // Is premium filter - boolean
  query('is_premium')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['true', 'false', 'all'])
    .withMessage('is_premium must be true, false, or all')
    .default('all'),

  // Status filter
  query('status')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['active', 'inactive', 'draft', 'all'])
    .withMessage('Status must be active, inactive, draft, or all')
    .default('active'),

  // ============ DATE RANGE FILTERS ============
  
  // Created date range
  query('created_from')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('created_from must be a valid ISO date')
    .toDate(),

  query('created_to')
    .optional()
    .trim()
    .isISO8601()
    .withMessage('created_to must be a valid ISO date')
    .toDate()
    .custom((value, { req }) => {
      if (req.query.created_from && value < new Date(req.query.created_from)) {
        throw new Error('created_to must be greater than or equal to created_from');
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validation rules for GET /api/mock-tests/:id
 */
exports.validateMockTestId = [
  param('id')
    .trim()
    .isUUID()
    .withMessage('id must be a valid UUID'),

  handleValidationErrors,
];

/**
 * Validation rules for POST /api/mock-tests
 * Create new mock test
 */
exports.validateCreateMockTest = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .escape(),

  body('type')
    .notEmpty()
    .withMessage('Type is required')
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_TEST_TYPES)
    .withMessage(`Type must be one of: ${ALLOWED_TEST_TYPES.join(', ')}`),

  body('difficulty')
    .notEmpty()
    .withMessage('Difficulty is required')
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_DIFFICULTIES)
    .withMessage(`Difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}`),

  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes')
    .toInt(),

  body('total_questions')
    .notEmpty()
    .withMessage('Total questions is required')
    .isInt({ min: 1, max: 200 })
    .withMessage('Total questions must be between 1 and 200')
    .toInt(),

  body('passing_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100')
    .toInt()
    .default(70),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .escape(),

  body('is_premium')
    .optional()
    .isBoolean()
    .withMessage('is_premium must be a boolean')
    .toBoolean()
    .default(false),

  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Instructions cannot exceed 2000 characters')
    .escape(),

  handleValidationErrors,
];

/**
 * Validation rules for PATCH /api/mock-tests/:id
 * Update mock test
 */
exports.validateUpdateMockTest = [
  param('id')
    .trim()
    .isUUID()
    .withMessage('id must be a valid UUID'),

  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .escape(),

  body('type')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_TEST_TYPES)
    .withMessage(`Type must be one of: ${ALLOWED_TEST_TYPES.join(', ')}`),

  body('difficulty')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_DIFFICULTIES)
    .withMessage(`Difficulty must be one of: ${ALLOWED_DIFFICULTIES.join(', ')}`),

  body('duration')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes')
    .toInt(),

  body('total_questions')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Total questions must be between 1 and 200')
    .toInt(),

  body('passing_score')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100')
    .toInt(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .escape(),

  body('is_premium')
    .optional()
    .isBoolean()
    .withMessage('is_premium must be a boolean')
    .toBoolean(),

  body('status')
    .optional()
    .trim()
    .toLowerCase()
    .isIn(['active', 'inactive', 'draft'])
    .withMessage('Status must be active, inactive, or draft'),

  body('instructions')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Instructions cannot exceed 2000 characters')
    .escape(),

  handleValidationErrors,
];

// Export constants for use in other files
module.exports = {
  validateGetTests,
  validateMockTestId,
  validateCreateMockTest,
  validateUpdateMockTest,
  ALLOWED_TEST_TYPES,
  ALLOWED_DIFFICULTIES,
  ALLOWED_SORT_FIELDS,
  ALLOWED_SORT_ORDERS,
};