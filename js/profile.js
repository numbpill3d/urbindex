// Urbindex - Profile Module

function initProfile() {
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    loadUserProfile(user.uid);
  });
  
  document.addEventListener('user-signed-out', () => {
    clearProfile();
  });
}

async function loadUserProfile(userId) {
  if (!usersRef) {
    console.error('Users reference not available');
    return;
  }
  
  try {
    const userDoc = await usersRef.doc(userId).get();
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    updateProfileUI(userData);
    
    // Load user stats
    loadUserStats(userId);
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

function updateProfileUI(userData) {
  const profileName = document.getElementById('profile-name');
  const profileAvatar = document.getElementById('profile-avatar');
  const locationsCount = document.getElementById('locations-count');
  const userScore = document.getElementById('user-score');
  
  if (profileName) profileName.textContent = userData.displayName || 'Explorer';
  if (profileAvatar) profileAvatar.src = userData.photoURL || './images/default-avatar.png';
  if (locationsCount) locationsCount.textContent = userData.locationsCount || 0;
  if (userScore) userScore.textContent = userData.score || 0;
}

async function loadUserStats(userId) {
  if (!locationsRef || !usersRef) {
    console.error('Firebase references not available');
    return;
  }
  
  try {
    // Count user's locations
    const locationsSnapshot = await locationsRef.where('createdBy', '==', userId).get();
    const locationCount = locationsSnapshot.size;
    
    // Update user document
    await usersRef.doc(userId).update({
      locationsCount: locationCount
    });
    
    // Update UI
    const locationsCountEl = document.getElementById('locations-count');
    if (locationsCountEl) locationsCountEl.textContent = locationCount;
    
  } catch (error) {
    console.error('Error loading user stats:', error);
  }
}

function clearProfile() {
  const profileName = document.getElementById('profile-name');
  const profileAvatar = document.getElementById('profile-avatar');
  const locationsCount = document.getElementById('locations-count');
  const userScore = document.getElementById('user-score');
  
  if (profileName) profileName.textContent = 'Explorer';
  if (profileAvatar) profileAvatar.src = './images/default-avatar.png';
  if (locationsCount) locationsCount.textContent = '0';
  if (userScore) userScore.textContent = '0';
}

window.profileModule = {
  initProfile,
  loadUserProfile
};