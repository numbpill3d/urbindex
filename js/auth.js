// Urbindex - Authentication Module

// DOM Elements with null checks
let loginButton, logoutButton, userInfo, userName, userAvatar;

function initDOMElements() {
  loginButton = document.getElementById('login-button');
  logoutButton = document.getElementById('logout-button');
  userInfo = document.getElementById('user-info');
  userName = document.getElementById('user-name');
  userAvatar = document.getElementById('user-avatar');
}

// Current user state
let currentUser = null;

// Google Auth Provider
const googleAuthProvider = new firebase.auth.GoogleAuthProvider();

// Initialize auth state observer
function initAuth() {
  // Initialize DOM elements
  initDOMElements();
  
  // Check if Firebase auth is available
  if (!auth) {
    console.error('Firebase auth not initialized');
    return;
  }
  
  // Listen for auth state changes
  auth.onAuthStateChanged(user => {
    if (user) {
      // User is signed in
      currentUser = user;
      onUserSignedIn(user);
    } else {
      // User is signed out
      currentUser = null;
      onUserSignedOut();
    }
  });

  // Set up event listeners with null checks
  if (loginButton) {
    loginButton.addEventListener('click', signInWithGoogle);
  }
  if (logoutButton) {
    logoutButton.addEventListener('click', signOut);
  }
}

// Sign in with Google
function signInWithGoogle() {
  // Show loading state
  loginButton.disabled = true;
  loginButton.textContent = 'Signing in...';

  auth.signInWithPopup(googleAuthProvider)
    .then(result => {
      // This gives you a Google Access Token
      const credential = result.credential;
      const token = credential.accessToken;
      
      // The signed-in user info
      const user = result.user;
      
      // Create or update user document in Firestore
      return createOrUpdateUserProfile(user);
    })
    .catch(error => {
      console.error('Authentication Error:', error);
      showAuthError(error.message);
    })
    .finally(() => {
      // Reset button state
      loginButton.disabled = false;
      loginButton.textContent = 'Sign In';
    });
}

// Sign out
function signOut() {
  const user = auth.currentUser;
  
  // Mark user as offline before signing out
  if (user) {
    usersRef.doc(user.uid).update({
      online: false,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
      auth.signOut()
        .then(() => {
          console.log('User signed out');
        })
        .catch(error => {
          console.error('Sign out Error:', error);
        });
    })
    .catch(error => {
      console.error('Error updating online status:', error);
      // Still try to sign out even if updating status fails
      auth.signOut();
    });
  } else {
    auth.signOut()
      .then(() => {
        console.log('User signed out');
      })
      .catch(error => {
        console.error('Sign out Error:', error);
      });
  }
}

// Create or update user profile in Firestore
function createOrUpdateUserProfile(user) {
  const userProfile = {
    uid: user.uid,
    displayName: user.displayName || 'Anonymous Explorer',
    email: user.email,
    photoURL: user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=0a0a20&color=05d9e8&size=128',
    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
    online: true, // Mark user as online
    locationsCount: 0, // Will be updated when fetching user data
    score: 0 // Will be updated when fetching user data
  };

  // Check if user exists
  return usersRef.doc(user.uid).get()
    .then(doc => {
      if (doc.exists) {
        // Update existing user
        return usersRef.doc(user.uid).update({
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
          lastLogin: userProfile.lastLogin,
          online: true // Mark user as online
        });
      } else {
        // Create new user
        userProfile.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        return usersRef.doc(user.uid).set(userProfile);
      }
    })
    .catch(error => {
      console.error('Error updating user profile:', error);
    });
}

// Handle user signed in state
function onUserSignedIn(user) {
  // Update UI
  loginButton.classList.add('hidden');
  userInfo.classList.remove('hidden');
  userName.textContent = user.displayName || 'Explorer';
  userAvatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || 'User') + '&background=0a0a20&color=05d9e8&size=128';
  
  // Fetch user data from Firestore to get latest stats
  fetchUserData(user.uid);
  
  // Dispatch event for other modules
  document.dispatchEvent(new CustomEvent('user-signed-in', { detail: user }));
}

// Handle user signed out state
function onUserSignedOut() {
  // Update UI
  loginButton.classList.remove('hidden');
  userInfo.classList.add('hidden');
  userName.textContent = '';
  userAvatar.src = '';
  
  // Dispatch event for other modules
  document.dispatchEvent(new CustomEvent('user-signed-out'));
}

// Fetch user data from Firestore
function fetchUserData(uid) {
  usersRef.doc(uid).get()
    .then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        // Update user stats in UI if needed
        // This could be used to display user score or other stats
      } else {
        console.warn('No user data found in Firestore');
      }
    })
    .catch(error => {
      console.error('Error fetching user data:', error);
    });
}

// Show authentication error
function showAuthError(message) {
  // You could implement a toast notification here
  console.error('Auth Error:', message);
  
  // Simple alert for now
  alert(`Authentication Error: ${message}`);
}

// Check if user is authenticated
function isAuthenticated() {
  return !!currentUser;
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Export functions for use in other modules
window.authModule = {
  initAuth,
  signInWithGoogle,
  signOut,
  isAuthenticated,
  getCurrentUser
};
