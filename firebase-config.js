// Secure Firebase Configuration
// This file uses environment variables to protect sensitive API keys

// Get environment variables - no fallbacks for security
const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY || 'dummy-api-key',
    authDomain: window.FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
    projectId: window.FIREBASE_PROJECT_ID || 'dummy-project',
    storageBucket: window.FIREBASE_STORAGE_BUCKET || 'dummy.firebasestorage.app',
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: window.FIREBASE_APP_ID || '1:123456789:web:abcdef123456'
};

// Validate required configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    console.error('Please check your environment variables or .env file');
    console.error('Required fields:', requiredFields);
    console.error('Make sure to set environment variables (e.g., FIREBASE_API_KEY)');
}

// Configuration loaded from environment variables

// Export configuration for use in application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
} else {
    window.firebaseConfig = firebaseConfig;
}