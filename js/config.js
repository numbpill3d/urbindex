// Firebase Configuration for Urbindex
// Replace with your own Firebase project configuration

const firebaseConfig = {
  apiKey: "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc",
  authDomain: "urbindex-d69e1.firebaseapp.com",
  projectId: "urbindex-d69e1",
  storageBucket: "urbindex-d69e1.firebasestorage.app",
  messagingSenderId: "889914696327",
  appId: "1:889914696327:web:351daa656a4d12fa828e22",
  measurementId: "G-HFS8F0KZSH"
};

// NOTE: The above configuration is a placeholder.
// To get your own Firebase configuration:
// 1. Go to https://console.firebase.google.com/
// 2. Create a new project or select an existing one
// 3. Click on the web icon (</>) to add a web app to your project
// 4. Register your app with a nickname
// 5. Copy the firebaseConfig object and replace the above values

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence()
  .then(() => {
    console.log('Firestore persistence enabled for offline use');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser does not support all of the features required for persistence
      console.warn('Firestore persistence not supported by this browser');
    } else {
      console.error('Firestore persistence error:', err);
    }
  });

// Export Firebase services
const auth = firebase.auth();
const storage = firebase.storage();

// Collection references
const locationsRef = db.collection('locations');
const usersRef = db.collection('users');
const ratingsRef = db.collection('ratings');
