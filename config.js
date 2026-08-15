// API Configuration
// This file determines the API URL based on the current environment
const API_CONFIG = {
    // In development, use localhost
    // In production, this should be replaced with the actual backend URL
    getBaseUrl: function() {
        // Check if we're running in production environment
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            // Production: Use the same host as the frontend, but with the backend port
            // You can override this by setting a specific API_URL in your deployment
            const productionApiUrl = window.location.protocol + '//' + window.location.hostname;
            // If your backend runs on a different port/domain in production, set it here:
            // return productionApiUrl + ':3001'; // Adjust port as needed
            return productionApiUrl; // Default to same host
        }
        
        // Development: Use localhost
        return 'http://localhost:3001';
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API_CONFIG;
}
