// back-end/src/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// ==================== VALIDATION RULES ====================
const updateProfileValidation = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone must be between 10 and 15 characters'),
  body('target_score')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('Target score must be between 0 and 120'),
  body('test_date').optional().isISO8601().withMessage('Invalid date format'),
  body('country_applying_to').optional().isString().trim(),
  body('visa_type').optional().isString().trim(),
  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
];

const changePasswordValidation = [
  body('currentPassword')
    .isString()
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage(
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
];

const changeEmailValidation = [
  body('newEmail').isEmail().withMessage('Invalid email format'),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const deactivateValidation = [
  body('password')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Password is required'),
];

// ==================== ROUTES ====================

// Get user profile
router.get('/:id/profile', authenticate, userController.getProfile);

// Update user profile
router.patch(
  '/:id/profile',
  authenticate,
  updateProfileValidation,
  userController.updateProfile
);

// Change password
router.put(
  '/:id/change-password',
  authenticate,
  changePasswordValidation,
  userController.changePassword
);

// Change email
router.put(
  '/:id/change-email',
  authenticate,
  changeEmailValidation,
  userController.changeEmail
);

// Verify email change
router.get('/verify-email', userController.verifyEmailChange);

// Upload profile image
router.post(
  '/:id/upload-image',
  authenticate,
  upload.single('profileImage'),
  userController.uploadProfileImage
);

// Get user preferences
router.get('/:id/preferences', authenticate, userController.getUserPreferences);

// Update user preferences
router.put(
  '/:id/preferences',
  authenticate,
  userController.updateUserPreferences
);

// Get user activity logs
router.get(
  '/:id/activity',
  authenticate,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('filter').optional().isString().trim(),
    query('sort')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort must be asc or desc'),
  ],
  userController.getUserActivity
);

// Get dashboard data
router.get('/:id/dashboard', authenticate, userController.getDashboardData);

// Get user progress
router.get(
  '/:id/progress',
  authenticate,
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
  ],
  userController.getUserProgress
);

// Get user weak areas
router.get('/:id/weak-areas', authenticate, userController.getWeakAreas);

// Get user stats
router.get('/:id/stats', authenticate, userController.getUserStats);

// Deactivate account
router.post(
  '/:id/deactivate',
  authenticate,
  deactivateValidation,
  userController.deactivateAccount
);

// Reactivate account
router.post('/:id/reactivate', authenticate, userController.reactivateAccount);

// Delete account (permanent)
router.delete(
  '/:id/delete',
  authenticate,
  deactivateValidation,
  userController.deleteAccount
);

module.exports = router;
