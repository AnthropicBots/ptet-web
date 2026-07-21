document.addEventListener("DOMContentLoaded", () => {
    loadAuthPopup();
});

let popupLoaded = false;
let popupContent = null;

function loadAuthPopup() {
    const container = document.getElementById("auth-popup-placeholder");
    if (!container) {
        console.warn("Auth popup placeholder not found");
        return;
    }

    const isSubpage = window.location.pathname.includes('/pages/');
    const popupPath = isSubpage ? '../components/auth-popup.html' : 'components/auth-popup.html';

    container.innerHTML = '<div class="auth-loading">Loading...</div>';

    fetch(popupPath)
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
            }
            return res.text();
        })
        .then(data => {
            container.innerHTML = data;
            popupLoaded = true;
            popupContent = container;
            setupPopupEvents();
            console.log("Auth popup loaded successfully");
        })
        .catch(error => {
            console.error("Failed to load auth popup:", error);
            container.innerHTML = `
                <div class="auth-error">
                    <p>Failed to load authentication. Please refresh the page.</p>
                    <button onclick="loadAuthPopup()">Retry</button>
                </div>
            `;
        });
}

function setupPopupEvents() {
    const popup = document.getElementById("authPopup");
    if (!popup) return;

    const closeBtn = document.getElementById("authPopupClose");
    if (closeBtn) {
        closeBtn.addEventListener("click", hideAuthPopup);
        closeBtn.setAttribute("aria-label", "Close authentication popup");
    }

    const overlay = document.getElementById("authPopup");
    if (overlay) {
        overlay.addEventListener("click", function(e) {
            if (e.target === overlay) {
                hideAuthPopup();
            }
        });
    }

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && isPopupOpen()) {
            hideAuthPopup();
            e.preventDefault();
        }
    });

    const firstInput = popup.querySelector("input, button, a");
    if (firstInput) {
        popup.addEventListener("focusin", function(e) {
            const focusableElements = popup.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];

            if (e.target === last && !e.shiftKey) {
                e.preventDefault();
                first.focus();
            } else if (e.target === first && e.shiftKey) {
                e.preventDefault();
                last.focus();
            }
        });
    }
}

function isPopupOpen() {
    const popup = document.getElementById("authPopup");
    return popup && popup.style.display === "flex";
}

function showAuthPopup() {
    const popup = document.getElementById("authPopup");
    if (!popup) {
        console.warn("Auth popup not found");
        return;
    }

    popup.style.display = "flex";
    document.body.style.overflow = "hidden";
    popup.setAttribute("aria-modal", "true");
    popup.setAttribute("role", "dialog");
    popup.setAttribute("aria-labelledby", "authPopupTitle");

    const firstFocusable = popup.querySelector("input, button, a");
    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
    }

    console.log("Auth popup opened");
}

function hideAuthPopup() {
    const popup = document.getElementById("authPopup");
    if (!popup) return;

    popup.style.display = "none";
    document.body.style.overflow = "";
    popup.removeAttribute("aria-modal");

    const triggerButton = document.querySelector("[data-auth-trigger]");
    if (triggerButton) {
        triggerButton.focus();
    }

    console.log("Auth popup closed");
}

function toggleAuthPopup() {
    if (isPopupOpen()) {
        hideAuthPopup();
    } else {
        showAuthPopup();
    }
}

function setAuthRedirect(redirectUrl) {
    const popup = document.getElementById("authPopup");
    if (popup) {
        popup.dataset.redirectUrl = redirectUrl;
    }
}

function getAuthRedirect() {
    const popup = document.getElementById("authPopup");
    return popup ? popup.dataset.redirectUrl : null;
}

document.addEventListener("click", function(e) {
    if (e.target.id === "authPopupClose") {
        hideAuthPopup();
    }

    const overlay = document.getElementById("authPopup");
    if (e.target === overlay) {
        hideAuthPopup();
    }

    if (e.target.closest("[data-auth-trigger]")) {
        e.preventDefault();
        showAuthPopup();
    }
});

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && isPopupOpen()) {
        hideAuthPopup();
        e.preventDefault();
    }

    if (e.key === "Enter" && e.target.closest("[data-auth-trigger]")) {
        e.preventDefault();
        showAuthPopup();
    }
});

window.showAuthPopup = showAuthPopup;
window.hideAuthPopup = hideAuthPopup;
window.toggleAuthPopup = toggleAuthPopup;
window.loadAuthPopup = loadAuthPopup;
window.setAuthRedirect = setAuthRedirect;
window.getAuthRedirect = getAuthRedirect;