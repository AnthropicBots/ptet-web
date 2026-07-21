const { param } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validation');

exports.validateMaterialId = [
  param('id')
    .trim()
    .isInt({ min: 1 })
    .withMessage('id must be a positive integer')
    .toInt(),

  handleValidationErrors,
];