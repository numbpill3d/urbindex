// Firebase Configuration for Urbindex
// Using Firebase v9 SDK with compatibility mode

const firebaseConfig = {
  apiKey: "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc",
  authDomain: "urbindex-d69e1.firebaseapp.com",
  projectId: "urbindex-d69e1",
  storageBucket: "urbindex-d69e1.firebasestorage.app",
  messagingSenderId: "889914696327",
  appId: "1:889914696327:web:351daa656a4d12fa828e22",
  measurementId: "G-HFS8F0KZSH"
};

// Initialize Firebase with error handling
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Initialize Firestore with enhanced error handling
let db;
try {
  db = firebase.firestore();
  
  // Enable offline persistence with better error handling
  db.enablePersistence({ synchronizeTabs: true })
    .then(() => {
      console.log('Firestore persistence enabled for offline use');
    })
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not supported by this browser');
      } else {
        console.error('Firestore persistence error:', err);
      }
    });
} catch (error) {
  console.error('Firestore initialization error:', error);
}

// Export Firebase services with error handling
let auth, storage;
try {
  auth = firebase.auth();
  storage = firebase.storage();
} catch (error) {
  console.error('Firebase services initialization error:', error);
}

// Collection references with null checks
const locationsRef = db ? db.collection('locations') : null;
const usersRef = db ? db.collection('users') : null;
const ratingsRef = db ? db.collection('ratings') : null;
const commentsRef = db ? db.collection('comments') : null;
const territoriesRef = db ? db.collection('territories') : null;
const crewsRef = db ? db.collection('crews') : null;
const crewMembersRef = db ? db.collection('crewMembers') : null;
const geocachesRef = db ? db.collection('geocaches') : null;

// Export for global access
window.firebaseConfig = firebaseConfig;
window.db = db;
window.auth = auth;
window.storage = storage;
