class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = null) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const ErrorTypes = {
    VALIDATION: 'VALIDATION_ERROR',
    DUPLICATE: 'DUPLICATE_KEY_ERROR',
    NOT_FOUND: 'RESOURCE_NOT_FOUND',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    DATABASE: 'DATABASE_ERROR',
    INTERNAL: 'INTERNAL_SERVER_ERROR',
    BAD_REQUEST: 'BAD_REQUEST'
};

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let errorCode = err.errorCode || ErrorTypes.INTERNAL;
    let stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

    if (err.name === 'ValidationError') {
        statusCode = 400;
        errorCode = ErrorTypes.VALIDATION;
        const errors = Object.values(err.errors).map(e => e.message);
        message = errors.join(', ');
    } else if (err.code === 11000) {
        statusCode = 409;
        errorCode = ErrorTypes.DUPLICATE;
        const field = Object.keys(err.keyPattern)[0];
        message = field + ' already exists. Please use a different value.';
    } else if (err.name === 'CastError') {
        statusCode = 400;
        errorCode = ErrorTypes.NOT_FOUND;
        message = 'Invalid ' + err.path + ': ' + err.value;
    } else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = ErrorTypes.UNAUTHORIZED;
        message = 'Invalid authentication token. Please login again.';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = ErrorTypes.UNAUTHORIZED;
        message = 'Authentication token expired. Please login again.';
    } else if (err.name === 'DocumentNotFoundError') {
        statusCode = 404;
        errorCode = ErrorTypes.NOT_FOUND;
        message = err.message || 'Resource not found';
    } else if (err instanceof AppError) {
        statusCode = err.statusCode || 500;
        message = err.message || 'Internal Server Error';
        errorCode = err.errorCode || ErrorTypes.INTERNAL;
    }

    if (process.env.NODE_ENV === 'development') {
        console.error('ERROR OCCURRED');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Method:', req.method);
        console.error('Path:', req.originalUrl);
        console.error('Status:', statusCode);
        console.error('Message:', message);
        console.error('Error Code:', errorCode);
        console.error('Stack Trace:');
        console.error(err.stack);
    } else {
        console.error('ERROR', {
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            method: req.method,
            statusCode: statusCode,
            message: message,
            errorCode: errorCode
        });
    }

    const response = {
        success: false,
        statusCode: statusCode,
        message: message,
        errorCode: errorCode
    };

    if (process.env.NODE_ENV === 'development') {
        response.stack = stack;
        response.path = req.originalUrl;
        response.method = req.method;
        response.timestamp = new Date().toISOString();
    }

    if (err.name === 'ValidationError' && process.env.NODE_ENV === 'development') {
        response.details = Object.values(err.errors).map(e => ({
            field: e.path,
            message: e.message,
            value: e.value
        }));
    }

    res.status(statusCode).json(response);
};

module.exports = {
    errorHandler: errorHandler,
    AppError: AppError,
    ErrorTypes: ErrorTypes
};