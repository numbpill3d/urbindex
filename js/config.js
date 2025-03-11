// Firebase Configuration for Urbindex
// Replace with your own Firebase project configuration

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "urbindex.firebaseapp.com",
  projectId: "urbindex",
  storageBucket: "urbindex.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

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
