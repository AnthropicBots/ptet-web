const pino = require('pino');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

if (!isDev && !fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

const sensitiveKeys = [
    'password', 'token', 'secret', 'authorization', 'api_key',
    'access_token', 'refresh_token', 'credit_card', 'cvv',
    'ssn', 'email', 'phone', 'address'
];

function redactSensitiveData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const redacted = { ...obj };
    for (const key of Object.keys(redacted)) {
        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
            redacted[key] = '[REDACTED]';
        } else if (typeof redacted[key] === 'object') {
            redacted[key] = redactSensitiveData(redacted[key]);
        }
    }
    return redacted;
}

const baseOptions = {
    level: LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level: (label) => ({ level: label.toUpperCase() }),
        bindings: (bindings) => {
            return {
                pid: bindings.pid,
                env: process.env.NODE_ENV || 'development'
            };
        },
        log: (object) => {
            if (object.err) {
                return {
                    ...object,
                    error: {
                        message: object.err.message,
                        stack: isDev ? object.err.stack : undefined,
                        code: object.err.code,
                        name: object.err.name
                    }
                };
            }
            return object;
        }
    },
    base: {
        service: process.env.SERVICE_NAME || 'api-service',
        version: process.env.npm_package_version || '1.0.0'
    },
    redact: {
        paths: sensitiveKeys.map(k => `*.${k}`),
        censor: '[REDACTED]'
    }
};

let transport = undefined;

if (isDev) {
    transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
            hideObject: false
        }
    };
} else {
    const errorLogPath = path.join(LOG_DIR, 'error.log');
    const combinedLogPath = path.join(LOG_DIR, 'combined.log');

    transport = {
        targets: [
            {
                target: 'pino/file',
                options: {
                    destination: combinedLogPath,
                    mkdir: true,
                    append: true
                },
                level: 'info'
            },
            {
                target: 'pino/file',
                options: {
                    destination: errorLogPath,
                    mkdir: true,
                    append: true
                },
                level: 'error'
            }
        ]
    };
}

const logger = pino(baseOptions, transport);

const originalInfo = logger.info.bind(logger);
const originalError = logger.error.bind(logger);
const originalWarn = logger.warn.bind(logger);
const originalDebug = logger.debug.bind(logger);

logger.info = function(obj, ...args) {
    if (typeof obj === 'object' && obj !== null) {
        obj = redactSensitiveData(obj);
    }
    return originalInfo(obj, ...args);
};

logger.error = function(obj, ...args) {
    if (typeof obj === 'object' && obj !== null) {
        obj = redactSensitiveData(obj);
    }
    return originalError(obj, ...args);
};

logger.warn = function(obj, ...args) {
    if (typeof obj === 'object' && obj !== null) {
        obj = redactSensitiveData(obj);
    }
    return originalWarn(obj, ...args);
};

logger.debug = function(obj, ...args) {
    if (typeof obj === 'object' && obj !== null) {
        obj = redactSensitiveData(obj);
    }
    return originalDebug(obj, ...args);
};

function createChildLogger(component) {
    return logger.child({ component });
}

function createRequestLogger(req, res, next) {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || 
                      req.headers['x-correlation-id'] || 
                      require('crypto').randomUUID();

    req.requestId = requestId;

    const childLogger = logger.child({
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    });

    req.logger = childLogger;

    childLogger.info({
        type: 'request_start',
        query: isDev ? req.query : undefined,
        headers: isDev ? {
            'user-agent': req.headers['user-agent'],
            'content-type': req.headers['content-type']
        } : undefined
    }, 'Request started');

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        childLogger.info({
            type: 'request_end',
            statusCode: res.statusCode,
            duration,
            contentLength: res.getHeader('content-length')
        }, 'Request completed');
    });

    next();
}

function createErrorLogger(err, req, res, next) {
    const logLevel = err.status >= 500 ? 'error' : 'warn';
    const logger = req.logger || createChildLogger('error-handler');

    logger[logLevel]({
        type: 'error',
        error: {
            message: err.message,
            status: err.status || 500,
            code: err.code,
            stack: isDev ? err.stack : undefined
        },
        request: {
            method: req.method,
            url: req.url,
            body: isDev ? req.body : undefined
        }
    }, `Error occurred: ${err.message}`);

    next(err);
}

function getLogLevel() {
    return LOG_LEVEL;
}

function setLogLevel(level) {
    if (['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(level)) {
        logger.level = level;
        console.log(`Log level changed to ${level}`);
    }
}

function getChildLogger(component) {
    return createChildLogger(component);
}

module.exports = {
    logger,
    createChildLogger,
    createRequestLogger,
    createErrorLogger,
    getLogLevel,
    setLogLevel,
    getChildLogger
};