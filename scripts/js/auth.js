// ============================================
// RATE LIMITER CLASS
// ============================================

class RateLimiter {
    constructor(options = {}) {
        this.windowMs = options.windowMs || 15 * 60 * 1000;
        this.maxAttempts = options.maxAttempts || 5;
        this.storageKey = options.storageKey || 'rate_limit_data';
        this.attempts = this.getAttempts();
    }

    getAttempts() {
        try {
            const data = JSON.parse(localStorage.getItem(this.storageKey));
            if (data && data.count && data.timestamp) {
                if (Date.now() - data.timestamp < this.windowMs) {
                    return data;
                }
            }
        } catch (e) {}
        return { count: 0, timestamp: Date.now() };
    }

    saveAttempts() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.attempts));
    }

    isRateLimited() {
        if (Date.now() - this.attempts.timestamp > this.windowMs) {
            this.attempts = { count: 0, timestamp: Date.now() };
            this.saveAttempts();
            return false;
        }
        return this.attempts.count >= this.maxAttempts;
    }

    incrementAttempts() {
        if (Date.now() - this.attempts.timestamp > this.windowMs) {
            this.attempts = { count: 0, timestamp: Date.now() };
        }
        this.attempts.count++;
        this.saveAttempts();
    }

    getRemainingAttempts() {
        if (Date.now() - this.attempts.timestamp > this.windowMs) {
            return this.maxAttempts;
        }
        return Math.max(0, this.maxAttempts - this.attempts.count);
    }

    getTimeRemaining() {
        const elapsed = Date.now() - this.attempts.timestamp;
        const remaining = Math.max(0, this.windowMs - elapsed);
        return Math.ceil(remaining / 1000);
    }

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

    reset() {
        this.attempts = { count: 0, timestamp: Date.now() };
        this.saveAttempts();
    }
}

// ============================================
// RATE LIMITER INSTANCES
// ============================================

const loginRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    storageKey: 'login_rate_limit'
});

const signupRateLimiter = new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxAttempts: 3,
    storageKey: 'signup_rate_limit'
});

// ============================================
// RATE LIMITER FUNCTIONS
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

function resetLoginRateLimit() {
    loginRateLimiter.reset();
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

// ============================================
// USER DATABASE
// ============================================

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem("pte_users")) || [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem("pte_users", JSON.stringify(users));
}

// ============================================
// SESSION MANAGEMENT
// ============================================

function saveSession(name, email, password) {
    localStorage.setItem("pte_user_logged_in", "true");
    localStorage.setItem("pte_user_name", name || "User");
    localStorage.setItem("pte_user_email", email || "");
    localStorage.setItem("pte_user_password", password || "");
}

function clearSession() {
    localStorage.removeItem("pte_user_logged_in");
    localStorage.removeItem("pte_user_name");
    localStorage.removeItem("pte_user_email");
    localStorage.removeItem("pte_user_password");
    localStorage.removeItem("pte_user_photo");
}

// ============================================
// REGISTER WITH RATE LIMITING
// ============================================

function initRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Check rate limit
        const rateLimitCheck = checkSignupRateLimit();
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return;
        }

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim().toLowerCase();
        const password = document.getElementById("regPassword").value;
        const confirm = document.getElementById("regConfirm").value;

        if (!name || !email || !password) {
            alert("Please fill in all fields.");
            return;
        }
        if (password.length < 6) {
            alert("Password must be at least 6 characters.");
            return;
        }
        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }

        const users = getUsers();
        if (users.some((u) => u.email === email)) {
            alert("An account with this email already exists. Please log in.");
            return;
        }

        // Increment signup attempts
        incrementSignupAttempts();

        users.push({ name, email, password });
        saveUsers(users);

        saveSession(name, email, password);
        window.location.href = "/index.html";
    });
}

// ============================================
// LOGIN WITH RATE LIMITING
// ============================================

function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        // Check rate limit
        const rateLimitCheck = checkLoginRateLimit();
        if (!rateLimitCheck.allowed) {
            alert(rateLimitCheck.message);
            return;
        }

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        const users = getUsers();
        const user = users.find((u) => u.email === email && u.password === password);

        if (!user) {
            // Increment login attempts on failure
            incrementLoginAttempts();
            
            const remaining = loginRateLimiter.getRemainingAttempts();
            if (remaining > 0) {
                alert(`Invalid email or password. ${remaining} attempt(s) remaining.`);
            } else {
                const time = loginRateLimiter.getFormattedTimeRemaining();
                alert(`Too many failed attempts. Please try again after ${time}.`);
            }
            return;
        }

        // Reset login attempts on success
        resetLoginRateLimit();

        saveSession(user.name, user.email, user.password);
        window.location.href = "/index.html";
    });
}

// ============================================
// PROFILE PAGE
// ============================================

function initProfile() {
    const nameEl = document.getElementById("profileName");
    const emailEl = document.getElementById("profileEmail");
    const passwordEl = document.getElementById("profilePassword");
    if (!nameEl && !emailEl && !passwordEl) return; 

    if (localStorage.getItem("pte_user_logged_in") !== "true") {
        window.location.href = "login.html";
        return;
    }

    if (nameEl) nameEl.textContent = localStorage.getItem("pte_user_name") || "User";
    if (emailEl) emailEl.textContent = localStorage.getItem("pte_user_email") || "";

    if (passwordEl) {
        const realPassword = localStorage.getItem("pte_user_password") || "";
        passwordEl.textContent = "••••••••"; 

        const toggleBtn = document.getElementById("togglePassword");
        if (toggleBtn) {
            let visible = false;
            toggleBtn.addEventListener("click", () => {
                visible = !visible;
                passwordEl.textContent = visible ? realPassword : "••••••••";
                toggleBtn.querySelector("i").className = visible ? "fas fa-eye-slash" : "fas fa-eye";
                toggleBtn.setAttribute("aria-label", visible ? "Hide password" : "Show password");
            });
        }
    }
}

// ============================================
// LOGOUT
// ============================================

document.addEventListener("click", (e) => {
    const btn = e.target.closest("#logout-btn, .logout-btn");
    if (!btn) return;

    clearSession();
    window.location.href = "/index.html";
});

// ============================================
// PASSWORD SHOW/HIDE TOGGLE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const input = this.closest('.password-group').querySelector('input');
            const isPassword = input.type === 'password';

            input.type = isPassword ? 'text' : 'password';
            this.classList.toggle('visible');
            this.setAttribute(
                'aria-label',
                isPassword ? 'Hide password' : 'Show password'
            );
        });

        button.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
});

// ============================================
// RUN PAGE-SPECIFIC SETUP
// ============================================

initRegister();
initLogin();
initProfile();