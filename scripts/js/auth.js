// ---- user database ----
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

// ---- current session ----
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

//  REGISTER
function initRegister() {
    const form = document.getElementById("registerForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

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

        users.push({ name, email, password });
        saveUsers(users);

        saveSession(name, email, password);
        window.location.href = "/index.html";
    });
}

//  LOGIN
function initLogin() {
    const form = document.getElementById("loginForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        const users = getUsers();
        const user = users.find((u) => u.email === email && u.password === password);

        if (!user) {
            alert("Invalid email or password.");
            return;
        }

        saveSession(user.name, user.email, user.password);
        window.location.href = "/index.html";
    });
}

//  PROFILE PAGE
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

//  LOGOUT (delegated – works for navbar or account button)
document.addEventListener("click", (e) => {
    const btn = e.target.closest("#logout-btn, .logout-btn");
    if (!btn) return;

    clearSession();
    window.location.href = "/index.html";
});

// ---- run page-specific setup ----
initRegister();
initLogin();
initProfile();


// ============================================
// PASSWORD SHOW/HIDE TOGGLE - FIXED
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const input = this.closest('.password-group').querySelector('input');
            const isPassword = input.type === 'password';

            // Toggle input type
            input.type = isPassword ? 'text' : 'password';

            // ✅ Toggle class on button - CSS handles icon visibility
            this.classList.toggle('visible');
            
            // Update aria-label
            this.setAttribute(
                'aria-label',
                isPassword ? 'Hide password' : 'Show password'
            );
        });

        // Keyboard support
        button.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
});