/**
 * Authentication Module with Security Improvements
 * @module auth
 */

// ==================== CONSTANTS ====================
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

// ==================== TOAST NOTIFICATION SYSTEM ====================
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        // Create container if not exists
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 1000;
            display: flex; flex-direction: column; gap: 10px;
            max-width: 350px; width: 100%;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const colors = {
        success: '#10b981', error: '#ef4444', warning: '#f59e0b', info: '#3b82f6'
    };
    toast.style.cssText = `
        background: white; padding: 16px 20px; border-radius: 8px;
        border-left: 4px solid ${colors[type] || colors.info};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        color: #1f2937;
    `;
    toast.textContent = message;
    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// ==================== PASSWORD HASHING (Simple Hash for Demo) ====================
function hashPassword(password) {
    // Note: In production, use bcrypt on the server
    // This is a simple client-side hash for demo
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return 'hashed_' + hash.toString(36);
}

function verifyPassword(password, hashed) {
    return hashPassword(password) === hashed;
}

// ==================== USER DATABASE (Secure) ====================
function getUsers() {
    try {
        const data = localStorage.getItem('pte_users_secure');
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem('pte_users_secure', JSON.stringify(users));
}

// ==================== SESSION MANAGEMENT ====================
function saveSession(user, rememberMe = false) {
    const sessionData = {
        loggedIn: true,
        name: user.name || 'User',
        email: user.email,
        loginTime: Date.now(),
        expiresIn: rememberMe ? REMEMBER_ME_DURATION : SESSION_TIMEOUT,
        rememberMe: rememberMe
    };
    localStorage.setItem('pte_session', JSON.stringify(sessionData));
}

function getSession() {
    try {
        const data = localStorage.getItem('pte_session');
        if (!data) return null;
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem('pte_session');
    localStorage.removeItem('pte_login_attempts');
}

function isSessionValid() {
    const session = getSession();
    if (!session || !session.loggedIn) return false;
    
    const elapsed = Date.now() - session.loginTime;
    const timeout = session.rememberMe ? REMEMBER_ME_DURATION : SESSION_TIMEOUT;
    
    if (elapsed > timeout) {
        clearSession();
        showToast('Session expired. Please log in again.', 'warning');
        return false;
    }
    return true;
}

// ==================== ACCOUNT LOCKOUT ====================
function getLoginAttempts(email) {
    try {
        const data = localStorage.getItem('pte_login_attempts');
        if (!data) return {};
        const attempts = JSON.parse(data);
        // Clean old entries
        Object.keys(attempts).forEach(key => {
            if (Date.now() - attempts[key].timestamp > LOCKOUT_DURATION) {
                delete attempts[key];
            }
        });
        return attempts;
    } catch (e) {
        return {};
    }
}

function recordFailedAttempt(email) {
    const attempts = getLoginAttempts(email);
    if (!attempts[email]) {
        attempts[email] = { count: 0, timestamp: Date.now() };
    }
    attempts[email].count++;
    attempts[email].timestamp = Date.now();
    localStorage.setItem('pte_login_attempts', JSON.stringify(attempts));
}

function isAccountLocked(email) {
    const attempts = getLoginAttempts(email);
    if (!attempts[email]) return false;
    if (attempts[email].count >= MAX_LOGIN_ATTEMPTS) {
        const lockoutRemaining = LOCKOUT_DURATION - (Date.now() - attempts[email].timestamp);
        if (lockoutRemaining > 0) {
            const minutes = Math.ceil(lockoutRemaining / 60000);
            showToast(`Account locked. Try again in ${minutes} minute(s).`, 'error');
            return true;
        }
        // Reset attempts after lockout duration
        delete attempts[email];
        localStorage.setItem('pte_login_attempts', JSON.stringify(attempts));
    }
    return false;
}

// ==================== VALIDATION ====================
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

function validatePasswordStrength(password) {
    const checks = {
        length: password.length >= 8,
        hasLower: /[a-z]/.test(password),
        hasUpper: /[A-Z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    const score = Object.values(checks).filter(Boolean).length;
    return {
        score: score,
        isStrong: score >= 4,
        checks: checks,
        message: score <= 2 ? 'Weak' : score === 3 ? 'Medium' : 'Strong'
    };
}

function getPasswordStrengthColor(strength) {
    if (strength === 'Weak') return '#ef4444';
    if (strength === 'Medium') return '#f59e0b';
    return '#10b981';
}

// ==================== PASSWORD STRENGTH INDICATOR ====================
function initPasswordStrength(inputId, indicatorId) {
    const input = document.getElementById(inputId);
    const indicator = document.getElementById(indicatorId);
    if (!input || !indicator) return;

    input.addEventListener('input', function() {
        const result = validatePasswordStrength(this.value);
        if (this.value.length === 0) {
            indicator.innerHTML = '';
            return;
        }
        const color = getPasswordStrengthColor(result.message);
        indicator.innerHTML = `
            <span style="color: ${color}; font-size: 12px; font-weight: 600;">
                ${result.message}
            </span>
            <div style="display: flex; gap: 4px; margin-top: 4px;">
                ${[1,2,3,4,5].map(i => `
                    <div style="height: 4px; flex: 1; background: ${i <= result.score ? color : '#e5e7eb'}; border-radius: 2px;"></div>
                `).join('')}
            </div>
        `;
    });
}

// ==================== XSS PROTECTION ====================
function sanitizeInput(input) {
    const element = document.createElement('div');
    element.textContent = input;
    return element.innerHTML;
}

// ==================== REGISTER FUNCTION ====================
function initRegister() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Initialize password strength indicator
    initPasswordStrength('regPassword', 'passwordStrength');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regConfirm').value;

        // Validation
        if (!name || !email || !password) {
            showToast('Please fill in all fields.', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        const strength = validatePasswordStrength(password);
        if (!strength.isStrong) {
            showToast('Password must contain uppercase, lowercase, number, and special character.', 'error');
            return;
        }

        if (password !== confirm) {
            showToast('Passwords do not match.', 'error');
            return;
        }

        const users = getUsers();
        if (users.some((u) => u.email === email)) {
            showToast('An account with this email already exists.', 'warning');
            return;
        }

        // Hash password before storing
        const hashedPassword = hashPassword(password);
        users.push({ 
            name: sanitizeInput(name), 
            email, 
            password: hashedPassword,
            createdAt: Date.now(),
            isVerified: false
        });
        saveUsers(users);

        saveSession({ name, email });
        showToast('Registration successful! Welcome!', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);
    });
}

// ==================== LOGIN FUNCTION ====================
function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        if (!email || !password) {
            showToast('Please enter email and password.', 'error');
            return;
        }

        if (!validateEmail(email)) {
            showToast('Please enter a valid email address.', 'error');
            return;
        }

        // Check account lockout
        if (isAccountLocked(email)) {
            return;
        }

        const users = getUsers();
        const user = users.find((u) => u.email === email);

        if (!user) {
            recordFailedAttempt(email);
            showToast('Invalid email or password.', 'error');
            return;
        }

        // Verify password (hashed)
        if (!verifyPassword(password, user.password)) {
            recordFailedAttempt(email);
            showToast('Invalid email or password.', 'error');
            return;
        }

        // Reset login attempts on success
        const attempts = getLoginAttempts(email);
        delete attempts[email];
        localStorage.setItem('pte_login_attempts', JSON.stringify(attempts));

        saveSession(user, rememberMe);
        showToast('Welcome back, ' + user.name + '!', 'success');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 500);
    });
}

// ==================== PROFILE PAGE ====================
function initProfile() {
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');
    const passwordEl = document.getElementById('profilePassword');
    const photoEl = document.getElementById('profilePhoto');

    if (!nameEl && !emailEl && !passwordEl) return;

    if (!isSessionValid()) {
        window.location.href = 'login.html';
        return;
    }

    const session = getSession();
    if (nameEl) nameEl.textContent = session?.name || 'User';
    if (emailEl) emailEl.textContent = session?.email || '';

    // Password show/hide in profile
    if (passwordEl) {
        const userEmail = session?.email;
        const users = getUsers();
        const user = users.find(u => u.email === userEmail);
        const realPassword = user?.password || '';

        passwordEl.textContent = '••••••••';
        const toggleBtn = document.getElementById('togglePassword');
        if (toggleBtn) {
            let visible = false;
            toggleBtn.addEventListener('click', () => {
                visible = !visible;
                if (visible) {
                    passwordEl.textContent = 'Password: ' + realPassword.substring(0, 8) + '...';
                } else {
                    passwordEl.textContent = '••••••••';
                }
            });
        }
    }

    // Handle profile photo upload
    if (photoEl) {
        const photoInput = document.getElementById('photoInput');
        if (photoInput) {
            photoInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        photoEl.src = event.target.result;
                        localStorage.setItem('pte_user_photo', event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        // Load saved photo
        const savedPhoto = localStorage.getItem('pte_user_photo');
        if (savedPhoto) {
            photoEl.src = savedPhoto;
        }
    }
}

// ==================== LOGOUT ====================
document.addEventListener('click', (e) => {
    const btn = e.target.closest('#logout-btn, .logout-btn');
    if (!btn) return;

    e.preventDefault();
    clearSession();
    showToast('Logged out successfully.', 'info');
    setTimeout(() => {
        window.location.href = '/index.html';
    }, 500);
});

// ==================== AUTH CHECK ON PAGE LOAD ====================
document.addEventListener('DOMContentLoaded', () => {
    // Check session for protected pages
    const protectedPages = ['profile.html', 'dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        if (!isSessionValid()) {
            window.location.href = 'login.html';
        }
    }

    // Initialize page-specific functions
    initRegister();
    initLogin();
    initProfile();

    // Password toggle for login/register
    document.querySelectorAll('.toggle-password').forEach((btn) => {
        btn.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input && input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else if (input) {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // Add toast container CSS
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
});