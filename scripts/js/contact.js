document.addEventListener("DOMContentLoaded", () => {
    const contactForm = document.getElementById("contactForm");
    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const subjectInput = document.getElementById("contact-subject");
    const messageInput = document.getElementById("contact-message");

    const successModal = document.getElementById("successModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const modalSubmissionDetails = document.getElementById("modalSubmissionDetails");

    // Email validation helper
    const isValidEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    // Helper to toggle validation error styling
    const showFieldError = (inputElement, show) => {
        const formGroup = inputElement.closest(".form-group");
        if (formGroup) {
            if (show) {
                formGroup.classList.add("invalid-field");
            } else {
                formGroup.classList.remove("invalid-field");
            }
        }
    };

    // Real-time cleanup validation listeners
    [nameInput, emailInput, subjectInput, messageInput].forEach(input => {
        // Clear error on input focus or text input
        input.addEventListener("input", () => showFieldError(input, false));
        input.addEventListener("blur", () => {
            // Validate on blur for better UX
            validateField(input);
        });
    });

    // Individual field validation checker
    const validateField = (input) => {
        let isValid = true;

        if (input === nameInput) {
            isValid = nameInput.value.trim().length >= 2;
        } else if (input === emailInput) {
            isValid = isValidEmail(emailInput.value.trim());
        } else if (input === subjectInput) {
            isValid = subjectInput.value.trim().length > 0;
        } else if (input === messageInput) {
            isValid = messageInput.value.trim().length >= 10;
        }

        showFieldError(input, !isValid);
        return isValid;
    };

    // Form Submission Handler
    contactForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Run full validation check
        const isNameValid = validateField(nameInput);
        const isEmailValid = validateField(emailInput);
        const isSubjectValid = validateField(subjectInput);
        const isMessageValid = validateField(messageInput);

        const isFormValid = isNameValid && isEmailValid && isSubjectValid && isMessageValid;

        if (!isFormValid) {
            // Focus on the first invalid field
            if (!isNameValid) nameInput.focus();
            else if (!isEmailValid) emailInput.focus();
            else if (!isSubjectValid) subjectInput.focus();
            else if (!isMessageValid) messageInput.focus();
            return;
        }

        // Gather submitted values
        const nameVal = nameInput.value.trim();
        const emailVal = emailInput.value.trim();
        const subjectVal = subjectInput.value.trim();
        const messageVal = messageInput.value.trim();
        const timestampVal = new Date().toLocaleString();

        // Create submission metadata object
        const newSubmission = {
            id: "pte_feedback_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
            name: nameVal,
            email: emailVal,
            subject: subjectVal,
            message: messageVal,
            timestamp: timestampVal
        };

        // Persist to localStorage for demo/review purposes
        try {
            const existingSubmissionsRaw = localStorage.getItem("pte_contact_submissions");
            const existingSubmissions = existingSubmissionsRaw ? JSON.parse(existingSubmissionsRaw) : [];
            
            existingSubmissions.push(newSubmission);
            localStorage.setItem("pte_contact_submissions", JSON.stringify(existingSubmissions));

            // Log details in the console for open-source maintainers/mentors to verify
            console.group("PTE HUB - Contact Submission Successful");
            console.log("New Submission Metadata:", newSubmission);
            console.log("All Submissions in LocalStorage:", existingSubmissions);
            console.groupEnd();
        } catch (err) {
            console.error("Failed to save submission to localStorage:", err);
        }

        // Populate details into the Success Modal
        modalSubmissionDetails.innerHTML = `
            <h4>Submission Info (Stored Locally)</h4>
            <ul>
                <li><strong>Name:</strong> ${escapeHTML(newSubmission.name)}</li>
                <li><strong>Email:</strong> ${escapeHTML(newSubmission.email)}</li>
                <li><strong>Subject:</strong> ${escapeHTML(newSubmission.subject)}</li>
                <li><strong>Time:</strong> ${newSubmission.timestamp}</li>
            </ul>
        `;

        // Display Success Modal
        successModal.classList.add("active");

        // Reset the form input fields and clean up class states
        contactForm.reset();
        [nameInput, emailInput, subjectInput, messageInput].forEach(input => showFieldError(input, false));
    });

    // Close Modal Event Handler
    closeModalBtn.addEventListener("click", () => {
        successModal.classList.remove("active");
    });

    // Close Modal when clicking outside the card
    successModal.addEventListener("click", (e) => {
        if (e.target === successModal) {
            successModal.classList.remove("active");
        }
    });

    // Simple HTML escaping helper for safe modal injection
    function escapeHTML(str) {
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
