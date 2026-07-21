import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    GithubAuthProvider,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Import your central manager
// Go up two levels to reach the root, then into context
import { AuthManager } from '../../context/AuthContext.js';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBPasCzGfOA9pLMovpLxnQuqtfuVhXPti8",
  authDomain: "pte-hub-e94df.firebaseapp.com",
  projectId: "pte-hub-e94df",
  storageBucket: "pte-hub-e94df.appspot.com",
  messagingSenderId: "555571204435",
  appId: "1:555571204435:web:d9b972c2cdc3caf25f91a6",
  measurementId: "G-HX2PK85GGT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Exported for use in AuthContext.js


/* -----------------------------
   DETECT LOGIN STATE
----------------------------- */

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user.email);

        // Update centralized state
        AuthManager.updateState({
            name: user.displayName || "User",
            email: user.email,
            photo: user.photoURL
        });

        /* Update navbar immediately */
        const authButtons = document.getElementById("auth-buttons");
        const userProfile = document.getElementById("user-profile");

        if (authButtons && userProfile) {
            authButtons.style.display = "none";
            userProfile.style.display = "flex";

            const name = document.getElementById("user-name");
            const photo = document.getElementById("user-photo");

            if (name) name.textContent = user.displayName || "User";
            if (photo) photo.src = user.photoURL || "";
        }
    } else {
        console.log("User logged out");
        AuthManager.updateState(null); // Clear centralized state
    }
});


/* -----------------------------
   LOGIN PROVIDERS
----------------------------- */

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

/* GOOGLE LOGIN */
const googleBtn = document.querySelector(".google-login");
if (googleBtn) {
    googleBtn.addEventListener("click", () => {
        signInWithPopup(auth, googleProvider)
            .then(() => window.location.href = "../index.html")
            .catch((error) => console.error("Google login error:", error));
    });
}

/* GITHUB LOGIN */
const githubBtn = document.querySelector(".github-login");
if (githubBtn) {
    githubBtn.addEventListener("click", () => {
        signInWithPopup(auth, githubProvider)
            .then(() => window.location.href = "../index.html")
            .catch((error) => console.error("GitHub login error:", error));
    });
}


/* -----------------------------
   FIREBASE LOGOUT
----------------------------- */

window.firebaseLogout = function () {
    signOut(auth)
        .then(() => {
            console.log("User signed out");
            AuthManager.updateState(null);
            window.location.href = "/index.html";
        })
        .catch((error) => console.error("Logout error:", error));
};

/* -----------------------------
   UI INTERACTIONS
----------------------------- */
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