// Junk Deal - Frontend Application
console.log('Junk Deal app initialized');

// API Configuration
const API_BASE_URL = process.env.API_URL || 'https://katiedayjunk1.github.io/yard-sale-cleanup/';
const API_URL = process.env.REACT_APP_API_URL || ' http://localhost:5000&#x27 ';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, ready to start app');
    initializeApp();
});

async function initializeApp() {
    try {
        // Check if backend is available
        const response = await fetch(`${API_URL}/health`);
        if (response.ok) {
            console.log('Backend is available');
        }
    } catch (error) {
        console.warn('Backend not available:', error.message);
    }
}

// Event listeners
document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', () => {
        console.log('Button clicked');
        // Add your event handler here
    });
});
