const { param } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validation');

exports.validateSavedMaterialParams = [
  param('id')
    .trim()
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),

  param('materialId')
    .optional()
    .trim()
    .isInt({ min: 1 })
    .withMessage('materialId must be a positive integer')
    .toInt(),

  handleValidationErrors,
];