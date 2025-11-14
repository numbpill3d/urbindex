// Secure Firebase Configuration
// This file uses environment variables to protect sensitive API keys

// Get environment variables with fallbacks for development
const firebaseConfig = {
    apiKey: window.ENV_FIREBASE_API_KEY || "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc", // TEMPORARY - Remove in production
    authDomain: window.ENV_FIREBASE_AUTH_DOMAIN || "urbindex-d69e1.firebaseapp.com",
    projectId: window.ENV_FIREBASE_PROJECT_ID || "urbindex-d69e1",
    storageBucket: window.ENV_FIREBASE_STORAGE_BUCKET || "urbindex-d69e1.firebasestorage.app",
    messagingSenderId: window.ENV_FIREBASE_MESSAGING_SENDER_ID || "889914696327",
    appId: window.ENV_FIREBASE_APP_ID || "1:889914696327:web:351daa656a4d12fa828e22"
};

// Validate required configuration
const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingFields = requiredFields.filter(field => !firebaseConfig[field]);

if (missingFields.length > 0) {
    console.error('Missing Firebase configuration fields:', missingFields);
    console.error('Please check your environment variables or .env file');
    console.error('Required fields:', requiredFields);
    console.error('Make sure to prefix environment variables with ENV_ (e.g., ENV_FIREBASE_API_KEY)');
}

// Log configuration status (remove in production)
if (firebaseConfig.apiKey.startsWith('AIzaSy') && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    console.warn('Firebase configuration is using hardcoded values');
    console.warn('For production, set environment variables to secure your API keys');
    console.warn('See .env.example for required environment variables');
}

// Export configuration for use in application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = firebaseConfig;
} else {
    window.firebaseConfig = firebaseConfig;
}