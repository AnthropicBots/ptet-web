document.addEventListener("DOMContentLoaded", async function () {
    try {
        // ✅ FIX: Slash (/) hata kar relative path kar diya hai
        const navbarPath = window.location.pathname.includes("/pages/")
            ? "../components/navbar.html"
            : "components/navbar.html";

        const response = await fetch(navbarPath);

        if (!response.ok) throw new Error("Failed to load navbar");
        const data = await response.text();

        const placeholder = document.getElementById("navbar-placeholder");
        if (!placeholder) {
            console.warn("navbar-placeholder not found");
            return;
        }
        placeholder.innerHTML = data;

        // 2. Hamburger Toggle
        const hamburger = document.getElementById("hamburger");
        const navbar = document.getElementById("navbar");
        if (hamburger) {
            hamburger.addEventListener("click", () => navbar.classList.toggle("active"));
        }

        // Removed redundant theme toggle logic (handled by scripts/js/theme.js)

        // 4. Mobile Dropdown Click Support
        const dropdowns = document.querySelectorAll('.dropdown');
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle && window.innerWidth <= 768) {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                });
            }
        });

    } catch (error) {
        console.error("Error loading navbar:", error);
        const placeholder = document.getElementById("navbar-placeholder");
        if (placeholder) {
            placeholder.innerHTML = `<div style="padding: 1rem; text-align: center; color: red;">Navbar failed to load. Error: ${error.message}</div>`;
        }
    }
});