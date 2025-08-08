// Firebase configuration with environment variables
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || "urbindex-d69e1.firebaseapp.com",
    projectId: process.env.FIREBASE_PROJECT_ID || "urbindex-d69e1",
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "urbindex-d69e1.firebasestorage.app",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "889914696327",
    appId: process.env.FIREBASE_APP_ID || "1:889914696327:web:351daa656a4d12fa828e22"
};

// Content Security Policy headers
const cspHeaders = {
    'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com",
        "font-src 'self' https://cdnjs.cloudflare.com"
    ].join('; ')
};

export { firebaseConfig, cspHeaders };