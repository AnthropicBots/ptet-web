const { body } = require('express-validator');
const { handleValidationErrors } = require('../middlewares/validation');

const nameValidator = body('name')
    .optional({ nullable: false })
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces');

const emailValidator = body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Please provide a valid email address');

const passwordValidator = body('password')
    .trim()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number');

const tokenValidator = body('token')
    .trim()
    .notEmpty()
    .withMessage('Token is required');

const photoUrlValidator = body('photo_url')
    .optional({ nullable: true })
    .trim()
    .isURL({
        protocols: ['http', 'https'],
        require_protocol: true,
    })
    .withMessage('photo_url must be a valid URL');

exports.validateRegister = [
    body('name')
        .exists({ checkFalsy: true })
        .withMessage('Name is required')
        .bail()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    body('email')
        .exists({ checkFalsy: true })
        .withMessage('Email is required')
        .bail()
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address'),

    body('password')
        .exists({ checkFalsy: true })
        .withMessage('Password is required')
        .bail()
        .trim()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/[A-Z]/)
        .withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/)
        .withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain at least one number'),

    handleValidationErrors,
];

exports.validateLogin = [
    body('email')
        .exists({ checkFalsy: true })
        .withMessage('Email is required')
        .bail()
        .trim()
        .normalizeEmail()
        .isEmail()
        .withMessage('Please provide a valid email address'),

    body('password')
        .exists({ checkFalsy: true })
        .withMessage('Password is required')
        .bail()
        .trim()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),

    handleValidationErrors,
];

exports.validateSocialAuth = [
    body('token')
        .exists({ checkFalsy: true })
        .withMessage('Firebase ID token is required')
        .bail()
        .trim()
        .isString()
        .withMessage('Token must be a string'),

    handleValidationErrors,
];

exports.validateUpdateMe = [
    body().custom((value) => {
        const allowedFields = ['name', 'photo_url'];
        const keys = Object.keys(value || {});

        if (keys.length === 0) {
            throw new Error('At least one field is required to update profile');
        }

        const invalidFields = keys.filter((key) => !allowedFields.includes(key));
        if (invalidFields.length > 0) {
            throw new Error(`Invalid fields: ${invalidFields.join(', ')}`);
        }

        return true;
    }),

    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    body('photo_url')
        .optional({ nullable: true })
        .trim()
        .isURL({
            protocols: ['http', 'https'],
            require_protocol: true,
        })
        .withMessage('photo_url must be a valid URL'),

    handleValidationErrors,
];