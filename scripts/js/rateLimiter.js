// ============================================
// RATE LIMITER - Frontend Implementation
// ============================================

class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes default
        this.maxAttempts = options.maxAttempts || 5; // 5 attempts default
        this.storageKey = options.storageKey || 'rate_limit_data';
        this.attempts = this.getAttempts();
    }

    // Get attempts from localStorage
    getAttempts() {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey));
            if (data && data.count && data.timestamp) {
                // Check if window has expired
                if (Date.now() - data.timestamp < this.windowMs) {
                    return data;
                }
            }
        } catch (e) {
            // Invalid data, reset
        }
        return { count: 0, timestamp: Date.now() };
    }

    // Save attempts to localStorage
    saveAttempts() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.attempts));
    }

    // Check if rate limit is exceeded
    isRateLimited() {
        // Reset if window expired
        if (Date.now() - this.attempts.timestamp > this.windowMs) {
            this.attempts = { count: 0, timestamp: Date.now() };
            this.saveAttempts();
            return false;
        }
        return this.attempts.count >= this.maxAttempts;
    }

    // Increment attempt count
    incrementAttempts() {
        // Reset if window expired
        if (Date.now() - this.attempts.timestamp > this.windowMs) {
            this.attempts = { count: 0, timestamp: Date.now() };
        }
        this.attempts.count++;
        this.saveAttempts();
    }

    // Get remaining attempts
    getRemainingAttempts() {
        if (Date.now() - this.attempts.timestamp > this.windowMs) {
            return this.maxAttempts;
        }
        return Math.max(0, this.maxAttempts - this.attempts.count);
    }

    // Get time remaining in seconds
    getTimeRemaining() {
        const elapsed = Date.now() - this.attempts.timestamp;
        const remaining = Math.max(0, this.windowMs - elapsed);
        return Math.ceil(remaining / 1000);
    }

    // Get formatted time remaining
    getFormattedTimeRemaining() {
        const seconds = this.getTimeRemaining();
        if (seconds < 60) {
            return `${seconds} seconds`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        } else {
            const hours = Math.ceil(seconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''}`;
        }
    }

    // Reset rate limit
    reset() {
        this.attempts = { count: 0, timestamp: Date.now() };
        this.saveAttempts();
    }
}

// ============================================
// LOGIN RATE LIMITER - 5 attempts per 15 minutes
// ============================================

const loginRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxAttempts: 5,
    storageKey: 'login_rate_limit'
});

// ============================================
// SIGNUP RATE LIMITER - 3 attempts per hour
// ============================================

const signupRateLimiter = new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxAttempts: 3,
    storageKey: 'signup_rate_limit'
});

// ============================================
// EXPORT FUNCTIONS
// ============================================

function checkLoginRateLimit() {
    if (loginRateLimiter.isRateLimited()) {
        const time = loginRateLimiter.getFormattedTimeRemaining();
        return {
            allowed: false,
            message: `Too many login attempts. Please try again after ${time}.`,
            remaining: loginRateLimiter.getRemainingAttempts(),
            timeRemaining: loginRateLimiter.getTimeRemaining()
        };
    }
    return {
        allowed: true,
        remaining: loginRateLimiter.getRemainingAttempts()
    };
}

function incrementLoginAttempts() {
    loginRateLimiter.incrementAttempts();
}

function checkSignupRateLimit() {
    if (signupRateLimiter.isRateLimited()) {
        const time = signupRateLimiter.getFormattedTimeRemaining();
        return {
            allowed: false,
            message: `Too many signup attempts. Please try again after ${time}.`,
            remaining: signupRateLimiter.getRemainingAttempts(),
            timeRemaining: signupRateLimiter.getTimeRemaining()
        };
    }
    return {
        allowed: true,
        remaining: signupRateLimiter.getRemainingAttempts()
    };
}

function incrementSignupAttempts() {
    signupRateLimiter.incrementAttempts();
}

function resetLoginRateLimit() {
    loginRateLimiter.reset();
}

function resetSignupRateLimit() {
    signupRateLimiter.reset();
}