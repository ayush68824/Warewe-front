// API Configuration
const API_BASE_URL = 'https://warewe-backe.onrender.com';

// DOM Elements
const emailInput = document.getElementById('emailInput');
const verifyBtn = document.getElementById('verifyBtn');
const resultSection = document.getElementById('resultSection');
const errorMsg = document.getElementById('errorMsg');

const typoInput = document.getElementById('typoInput');
const typoBtn = document.getElementById('typoBtn');
const typoResult = document.getElementById('typoResult');

// Result display elements
const resultBadge = document.getElementById('resultBadge');
const resultEmail = document.getElementById('resultEmail');
const resultStatus = document.getElementById('resultStatus');
const resultSubresult = document.getElementById('resultSubresult');
const resultDomain = document.getElementById('resultDomain');
const resultMX = document.getElementById('resultMX');
const resultTime = document.getElementById('resultTime');
const resultError = document.getElementById('resultError');
const resultSuggestion = document.getElementById('resultSuggestion');
const resultTimestamp = document.getElementById('resultTimestamp');
const mxRow = document.getElementById('mxRow');
const errorRow = document.getElementById('errorRow');
const suggestionRow = document.getElementById('suggestionRow');

// Verify email function
async function verifyEmail() {
    const email = emailInput.value.trim();
    
    // Validation
    if (!email) {
        showError('Please enter an email address');
        return;
    }

    // Basic email format check
    if (!email.includes('@')) {
        showError('Please enter a valid email address');
        return;
    }

    // Hide previous results and errors
    hideError();
    hideResult();

    // Show loading state
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE_URL}/api/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        // Handle all status codes (200, 202, 400, 500, etc.)
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            throw new Error(`Server returned invalid response: ${response.status} ${response.statusText}`);
        }

        // Backend returns 400 for invalid emails, but still includes the data
        // So we check if data.data exists (the verification result)
        if (data.data) {
            displayResult(data.data);
        } else if (data.error) {
            showError(data.error + (data.message ? ': ' + data.message : ''));
        } else {
            showError('Unexpected response from server');
        }
    } catch (error) {
        console.error('Error:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            showError('Failed to connect to the server. Make sure the backend is running on port 3000.');
        } else {
            showError(error.message || 'An error occurred while verifying the email');
        }
    } finally {
        setLoading(false);
    }
}

// Check typo function
async function checkTypo() {
    const email = typoInput.value.trim();
    
    if (!email) {
        typoResult.style.display = 'none';
        return;
    }

    // Validate email format (must contain @)
    if (!email.includes('@')) {
        typoResult.className = 'typo-result no-suggestion';
        typoResult.innerHTML = `
            <p style="color: #e74c3c;"><strong>Invalid format:</strong> "${email}" is not a valid email address. Please enter an email with @ symbol (e.g., user@example.com)</p>
        `;
        typoResult.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/did-you-mean`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success !== undefined && data.data) {
            displayTypoResult(data.data);
        } else if (data.error) {
            typoResult.className = 'typo-result no-suggestion';
            typoResult.innerHTML = `<p style="color: #e74c3c;">Error: ${data.error}</p>`;
            typoResult.style.display = 'block';
        } else {
            // Fallback if no data
            typoResult.className = 'typo-result no-suggestion';
            typoResult.innerHTML = '<p>Unable to process request. Please try again.</p>';
            typoResult.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        typoResult.className = 'typo-result no-suggestion';
        typoResult.innerHTML = '<p style="color: #e74c3c;">Failed to connect to the server. Make sure the backend is running.</p>';
        typoResult.style.display = 'block';
    }
}

// Display verification result
function displayResult(data) {
    resultEmail.textContent = data.email || 'N/A';
    resultStatus.textContent = data.result || 'N/A';
    resultSubresult.textContent = data.subresult || 'N/A';
    resultDomain.textContent = data.domain || 'N/A';
    resultTime.textContent = `${data.executiontime}s`;
    resultTimestamp.textContent = new Date(data.timestamp).toLocaleString();

    // MX Records
    if (data.mxRecords && Array.isArray(data.mxRecords) && data.mxRecords.length > 0) {
        resultMX.textContent = data.mxRecords.join(', ');
        mxRow.style.display = 'flex';
    } else {
        resultMX.textContent = 'None';
        mxRow.style.display = 'flex'; // Always show MX row, even if empty
    }

    // Error
    if (data.error) {
        resultError.textContent = data.error;
        errorRow.style.display = 'flex';
    } else {
        errorRow.style.display = 'none';
    }

    // Suggestion
    if (data.didyoumean) {
        resultSuggestion.textContent = data.didyoumean;
        resultSuggestion.onclick = () => {
            emailInput.value = data.didyoumean;
            verifyEmail();
        };
        suggestionRow.style.display = 'flex';
    } else {
        suggestionRow.style.display = 'none';
    }

    // Badge styling
    resultBadge.textContent = data.result || 'unknown';
    resultBadge.className = `badge ${data.result || 'unknown'}`;

    // Show result section
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Display typo result
function displayTypoResult(data) {
    if (!data) {
        typoResult.className = 'typo-result no-suggestion';
        typoResult.innerHTML = '<p>No data received from server.</p>';
        typoResult.style.display = 'block';
        return;
    }

    if (data.hasSuggestion && data.suggestion) {
        typoResult.className = 'typo-result has-suggestion';
        typoResult.innerHTML = `
            <p><strong>Original:</strong> ${data.original || 'N/A'}</p>
            <p><strong>Suggestion:</strong> <span style="color: #667eea; font-weight: 600;">${data.suggestion}</span></p>
            <button class="btn-primary" style="margin-top: 10px; width: 100%;" onclick="useSuggestion('${data.suggestion}')">
                Use This Email
            </button>
        `;
    } else {
        typoResult.className = 'typo-result no-suggestion';
        typoResult.innerHTML = `
            <p>No typo detected. "${data.original || 'N/A'}" looks correct!</p>
        `;
    }
    typoResult.style.display = 'block';
}

// Use suggestion
function useSuggestion(email) {
    emailInput.value = email;
    typoInput.value = email;
    verifyEmail();
}

// Show error message
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.style.display = 'block';
}

// Hide error message
function hideError() {
    errorMsg.style.display = 'none';
}

// Hide result section
function hideResult() {
    resultSection.style.display = 'none';
}

// Set loading state
function setLoading(loading) {
    verifyBtn.disabled = loading;
    const btnText = verifyBtn.querySelector('.btn-text');
    const btnLoader = verifyBtn.querySelector('.btn-loader');
    
    if (loading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
    } else {
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// Event Listeners
verifyBtn.addEventListener('click', verifyEmail);
emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        verifyEmail();
    }
});

typoBtn.addEventListener('click', checkTypo);
typoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkTypo();
    }
});
typoInput.addEventListener('input', () => {
    // Debounce for real-time checking
    clearTimeout(typoInput.debounceTimer);
    if (typoInput.value.trim() && typoInput.value.includes('@')) {
        typoInput.debounceTimer = setTimeout(() => {
            checkTypo();
        }, 500); // Wait 500ms after user stops typing
    } else if (!typoInput.value.trim()) {
        typoResult.style.display = 'none';
    }
});

// Make useSuggestion available globally
window.useSuggestion = useSuggestion;
