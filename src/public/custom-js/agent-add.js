form.addEventListener("submit", async (event) => {
    event.preventDefault(); // Prevent the form from submitting normally

    // Password validation
    if (password.value !== confirm_password.value) {
        document.getElementById('password-error').style.display = 'block';
        document.getElementById('password-error').textContent = 'Passwords do not match';
        return;
    }

    // Hide the error message if passwords match
    document.getElementById('password-error').style.display = 'none';
    document.getElementById('password-error').textContent = '';

    // Get selected languages
    const selectedLanguages = Array.from(document.querySelectorAll('#language option:checked'))
        .map(option => option.value);

    // Create the data object to send
    const adminadd = {
        name: agent_name.value,
        phone: phone.value,
        email: email.value,
        password: password.value,
        language: selectedLanguages.join(','), // Convert array to comma-separated string
        user_role: 2
    };

    try {
        const response = await fetch("/agent-add", { // Ensure the correct endpoint
            method: "POST",
            body: JSON.stringify(adminadd),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (data.status === "failed") {
            success.style.display = "none";
            failed.style.display = "block";
            failed.innerText = data.message;
        } else {
            success.style.display = "block";
            failed.style.display = "none";
            success.innerText = data.message;
        }
    } catch (error) {
        // Handle any errors that occur during the fetch request
        console.error("Error:", error);
        failed.style.display = "block";
        failed.innerText = "An error occurred. Please try again.";
    }
});
