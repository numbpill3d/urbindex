// Urbindex - User Profile Module

// DOM Elements
const profileContainer = document.getElementById('profile-container');
const profileAvatar = document.getElementById('profile-avatar');
const profileName = document.getElementById('profile-name');
const profileJoined = document.getElementById('join-date');
const locationCount = document.getElementById('location-count');
const statExplored = document.getElementById('stat-explored');
const statShared = document.getElementById('stat-shared');
const statRating = document.getElementById('stat-rating');
const displayNameInput = document.getElementById('display-name');
const userBioInput = document.getElementById('user-bio');
const userThemeSelect = document.getElementById('user-theme');
const saveProfileBtn = document.getElementById('save-profile-btn');

// Current user profile data
let currentUserProfile = null;

// Initialize profile functionality
function initProfile() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    loadUserProfile(user.uid);
  });
  
  document.addEventListener('user-signed-out', () => {
    clearProfileUI();
  });
  
  // Set up save profile button
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', saveUserProfile);
  }
  
  // Set up theme selector
  if (userThemeSelect) {
    userThemeSelect.addEventListener('change', (e) => {
      applyTheme(e.target.value);
    });
  }
  
  // Set up follow buttons
  setupFollowButtons();
  
  // Set up messaging
  setupMessaging();
}

// Load user profile from Firestore
async function loadUserProfile(userId) {
  try {
    const userDoc = await usersRef.doc(userId).get();
    
    if (!userDoc.exists) {
      console.warn('User document not found');
      return;
    }
    
    const userData = userDoc.data();
    currentUserProfile = userData;
    
    // Update UI
    updateProfileUI(userData);
    
    // Load achievements and badges
    if (window.achievementsModule?.loadUserAchievements) {
      window.achievementsModule.loadUserAchievements(userId);
    }
    
    // Load challenges
    if (window.challengesModule?.loadUserChallenges) {
      window.challengesModule.loadUserChallenges(userId);
    }
    
    // Load following/followers
    loadFollowData(userId);
    
    // Load user stats
    loadUserStats(userId);
    
    return userData;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

// Update profile UI
function updateProfileUI(userData) {
  if (!profileContainer) return;
  
  // Update basic profile info
  if (profileAvatar) {
    profileAvatar.src = userData.photoURL || 'images/default-avatar.png';
  }
  
  if (profileName) {
    profileName.textContent = userData.displayName || 'Anonymous Explorer';
  }
  
  if (profileJoined && userData.createdAt) {
    const joinDate = userData.createdAt.toDate();
    profileJoined.textContent = joinDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  if (locationCount) {
    locationCount.textContent = userData.locationsCount || 0;
  }
  
  // Update stats
  if (statExplored) {
    statExplored.textContent = userData.locationsCount || 0;
  }
  
  if (statShared) {
    statShared.textContent = userData.sharedLocationsCount || 0;
  }
  
  if (statRating) {
    const rating = userData.averageRating || 0;
    statRating.textContent = rating.toFixed(1);
  }
  
  // Update form inputs
  if (displayNameInput) {
    displayNameInput.value = userData.displayName || '';
  }
  
  if (userBioInput) {
    userBioInput.value = userData.bio || '';
  }
  
  if (userThemeSelect) {
    userThemeSelect.value = userData.theme || 'cyberpunk';
    applyTheme(userData.theme || 'cyberpunk');
  }
  
  // Update rank badge if available
  if (window.achievementsModule?.getUserRankBadge) {
    const rankBadge = window.achievementsModule.getUserRankBadge(userData.badges || {});
    updateRankBadgeUI(rankBadge, userData.score || 0);
  }
  
  // Add social links if available
  if (userData.socialLinks) {
    updateSocialLinksUI(userData.socialLinks);
  }
  
  // Add exploration history if available
  if (userData.recentLocations) {
    updateExplorationHistoryUI(userData.recentLocations);
  }
}

// Clear profile UI
function clearProfileUI() {
  if (!profileContainer) return;
  
  // Clear basic profile info
  if (profileAvatar) {
    profileAvatar.src = 'images/default-avatar.png';
  }
  
  if (profileName) {
    profileName.textContent = 'Not Signed In';
  }
  
  if (profileJoined) {
    profileJoined.textContent = '';
  }
  
  if (locationCount) {
    locationCount.textContent = '0';
  }
  
  // Clear stats
  if (statExplored) {
    statExplored.textContent = '0';
  }
  
  if (statShared) {
    statShared.textContent = '0';
  }
  
  if (statRating) {
    statRating.textContent = '0';
  }
  
  // Clear form inputs
  if (displayNameInput) {
    displayNameInput.value = '';
  }
  
  if (userBioInput) {
    userBioInput.value = '';
  }
  
  // Clear achievements and badges
  const achievementsContainer = document.getElementById('achievements-container');
  if (achievementsContainer) {
    achievementsContainer.innerHTML = '<p class="no-items">Please sign in to view achievements</p>';
  }
  
  const badgesContainer = document.getElementById('badges-container');
  if (badgesContainer) {
    badgesContainer.innerHTML = '<p class="no-items">Please sign in to view badges</p>';
  }
  
  // Clear challenges
  const challengesContainer = document.getElementById('challenges-container');
  if (challengesContainer) {
    challengesContainer.innerHTML = '<p class="no-items">Please sign in to view challenges</p>';
  }
  
  // Clear rank badge
  const rankBadgeContainer = document.getElementById('rank-badge-container');
  if (rankBadgeContainer) {
    rankBadgeContainer.innerHTML = '';
  }
  
  // Clear social links
  const socialLinksContainer = document.getElementById('social-links-container');
  if (socialLinksContainer) {
    socialLinksContainer.innerHTML = '';
  }
  
  // Clear exploration history
  const explorationHistoryContainer = document.getElementById('exploration-history');
  if (explorationHistoryContainer) {
    explorationHistoryContainer.innerHTML = '';
  }
  
  // Clear following/followers
  const followingContainer = document.getElementById('following-container');
  if (followingContainer) {
    followingContainer.innerHTML = '';
  }
  
  const followersContainer = document.getElementById('followers-container');
  if (followersContainer) {
    followersContainer.innerHTML = '';
  }
}

// Save user profile
async function saveUserProfile() {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to save your profile');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Get form values
    const displayName = displayNameInput.value.trim();
    const bio = userBioInput.value.trim();
    const theme = userThemeSelect.value;
    
    // Validate display name
    if (!displayName) {
      alert('Display name cannot be empty');
      return;
    }
    
    // Update user profile
    await user.updateProfile({
      displayName
    });
    
    // Update Firestore user document
    await usersRef.doc(user.uid).update({
      displayName,
      bio,
      theme,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Apply theme
    applyTheme(theme);
    
    // Show success message
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Profile updated successfully', 'success');
    } else {
      alert('Profile updated successfully');
    }
    
    // Reload user profile
    loadUserProfile(user.uid);
  } catch (error) {
    console.error('Error saving user profile:', error);
    
    // Show error message
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Error updating profile. Please try again.', 'error');
    } else {
      alert('Error updating profile. Please try again.');
    }
  }
}

// Apply theme
function applyTheme(theme) {
  const body = document.body;
  
  // Remove existing theme classes
  body.classList.remove('theme-cyberpunk', 'theme-retro', 'theme-minimal');
  
  // Add new theme class
  body.classList.add(`theme-${theme}`);
  
  // Save theme preference to localStorage
  localStorage.setItem('theme', theme);
}

// Update rank badge UI
function updateRankBadgeUI(rankBadge, score) {
  const rankBadgeContainer = document.getElementById('rank-badge-container');
  if (!rankBadgeContainer) return;
  
  // Clear container
  rankBadgeContainer.innerHTML = '';
  
  if (!rankBadge && score < 100) {
    // No rank badge yet
    const nextRankProgress = window.achievementsModule?.getNextRankProgress(score);
    
    if (nextRankProgress?.next) {
      rankBadgeContainer.innerHTML = `
        <div class="rank-badge-display">
          <div class="rank-badge-icon">?</div>
          <div class="rank-badge-info">
            <h4>No Rank Yet</h4>
            <p>Earn ${nextRankProgress.next.threshold} points to reach ${nextRankProgress.next.name}</p>
            <div class="rank-progress">
              <div class="rank-progress-bar" style="width: ${nextRankProgress.progress}%"></div>
            </div>
            <div class="rank-progress-text">
              <span>${score} points</span>
              <span>${nextRankProgress.next.threshold} points</span>
            </div>
          </div>
        </div>
      `;
    }
  } else if (rankBadge) {
    // Has rank badge
    const nextRankProgress = window.achievementsModule?.getNextRankProgress(score);
    
    let progressBar = '';
    if (nextRankProgress?.next) {
      progressBar = `
        <div class="rank-progress">
          <div class="rank-progress-bar" style="width: ${nextRankProgress.progress}%"></div>
        </div>
        <div class="rank-progress-text">
          <span>${score} points</span>
          <span>${nextRankProgress.next.threshold} points</span>
        </div>
      `;
    } else {
      // Max rank
      progressBar = `
        <div class="rank-progress">
          <div class="rank-progress-bar" style="width: 100%"></div>
        </div>
        <div class="rank-progress-text">
          <span>${score} points</span>
          <span>Max Rank</span>
        </div>
      `;
    }
    
    rankBadgeContainer.innerHTML = `
      <div class="rank-badge-display">
        <div class="rank-badge-icon">${rankBadge.icon}</div>
        <div class="rank-badge-info">
          <h4>${rankBadge.name}</h4>
          <p>${rankBadge.description}</p>
          ${progressBar}
        </div>
      </div>
    `;
  }
}

// Update social links UI
function updateSocialLinksUI(socialLinks) {
  const socialLinksContainer = document.getElementById('social-links-container');
  if (!socialLinksContainer) return;
  
  // Clear container
  socialLinksContainer.innerHTML = '<h3>Social Links</h3>';
  
  if (Object.keys(socialLinks).length === 0) {
    socialLinksContainer.innerHTML += '<p class="no-items">No social links added yet</p>';
    return;
  }
  
  const socialLinksList = document.createElement('div');
  socialLinksList.className = 'social-links-list';
  
  // Add each social link
  Object.entries(socialLinks).forEach(([platform, url]) => {
    let icon = '';
    
    // Set icon based on platform
    switch (platform.toLowerCase()) {
      case 'twitter':
        icon = '🐦';
        break;
      case 'instagram':
        icon = '📷';
        break;
      case 'facebook':
        icon = '👤';
        break;
      case 'youtube':
        icon = '🎥';
        break;
      case 'twitch':
        icon = '🎮';
        break;
      case 'tiktok':
        icon = '🎵';
        break;
      case 'website':
        icon = '🌐';
        break;
      default:
        icon = '🔗';
    }
    
    const socialLinkItem = document.createElement('a');
    socialLinkItem.className = 'social-link-item';
    socialLinkItem.href = url;
    socialLinkItem.target = '_blank';
    socialLinkItem.rel = 'noopener noreferrer';
    
    socialLinkItem.innerHTML = `
      <span class="social-link-icon">${icon}</span>
      <span class="social-link-platform">${platform}</span>
    `;
    
    socialLinksList.appendChild(socialLinkItem);
  });
  
  socialLinksContainer.appendChild(socialLinksList);
  
  // Add edit button if it's the current user's profile
  if (authModule.isAuthenticated() && currentUserProfile && currentUserProfile.uid === authModule.getCurrentUser().uid) {
    const editButton = document.createElement('button');
    editButton.className = 'neon-button small';
    editButton.textContent = 'Edit Social Links';
    editButton.addEventListener('click', showSocialLinksEditor);
    
    socialLinksContainer.appendChild(editButton);
  }
}

// Show social links editor
function showSocialLinksEditor() {
  // Create modal for editing social links
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'social-links-modal';
  
  const socialLinks = currentUserProfile.socialLinks || {};
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>Edit Social Links</h2>
      <form id="social-links-form">
        <div class="form-group">
          <label for="twitter-link">Twitter</label>
          <input type="url" id="twitter-link" placeholder="https://twitter.com/yourusername" value="${socialLinks.Twitter || ''}">
        </div>
        <div class="form-group">
          <label for="instagram-link">Instagram</label>
          <input type="url" id="instagram-link" placeholder="https://instagram.com/yourusername" value="${socialLinks.Instagram || ''}">
        </div>
        <div class="form-group">
          <label for="facebook-link">Facebook</label>
          <input type="url" id="facebook-link" placeholder="https://facebook.com/yourusername" value="${socialLinks.Facebook || ''}">
        </div>
        <div class="form-group">
          <label for="youtube-link">YouTube</label>
          <input type="url" id="youtube-link" placeholder="https://youtube.com/c/yourchannel" value="${socialLinks.YouTube || ''}">
        </div>
        <div class="form-group">
          <label for="twitch-link">Twitch</label>
          <input type="url" id="twitch-link" placeholder="https://twitch.tv/yourusername" value="${socialLinks.Twitch || ''}">
        </div>
        <div class="form-group">
          <label for="tiktok-link">TikTok</label>
          <input type="url" id="tiktok-link" placeholder="https://tiktok.com/@yourusername" value="${socialLinks.TikTok || ''}">
        </div>
        <div class="form-group">
          <label for="website-link">Website</label>
          <input type="url" id="website-link" placeholder="https://yourwebsite.com" value="${socialLinks.Website || ''}">
        </div>
        <div class="form-actions">
          <button type="button" id="cancel-social-links-btn" class="neon-button">Cancel</button>
          <button type="submit" class="neon-button">Save</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Show modal
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  // Set up event listeners
  const closeBtn = modal.querySelector('.close-modal');
  const cancelBtn = modal.querySelector('#cancel-social-links-btn');
  const form = modal.querySelector('#social-links-form');
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  });
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!authModule.isAuthenticated()) {
      alert('Please sign in to save your social links');
      return;
    }
    
    const user = authModule.getCurrentUser();
    
    try {
      // Get form values
      const newSocialLinks = {
        Twitter: document.getElementById('twitter-link').value.trim(),
        Instagram: document.getElementById('instagram-link').value.trim(),
        Facebook: document.getElementById('facebook-link').value.trim(),
        YouTube: document.getElementById('youtube-link').value.trim(),
        Twitch: document.getElementById('twitch-link').value.trim(),
        TikTok: document.getElementById('tiktok-link').value.trim(),
        Website: document.getElementById('website-link').value.trim()
      };
      
      // Remove empty values
      Object.keys(newSocialLinks).forEach(key => {
        if (!newSocialLinks[key]) {
          delete newSocialLinks[key];
        }
      });
      
      // Update Firestore user document
      await usersRef.doc(user.uid).update({
        socialLinks: newSocialLinks,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Show success message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Social links updated successfully', 'success');
      } else {
        alert('Social links updated successfully');
      }
      
      // Close modal
      modal.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
      
      // Reload user profile
      loadUserProfile(user.uid);
    } catch (error) {
      console.error('Error saving social links:', error);
      
      // Show error message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error updating social links. Please try again.', 'error');
      } else {
        alert('Error updating social links. Please try again.');
      }
    }
  });
}

// Update exploration history UI
function updateExplorationHistoryUI(recentLocations) {
  const explorationHistoryContainer = document.getElementById('exploration-history');
  if (!explorationHistoryContainer) return;
  
  // Clear container
  explorationHistoryContainer.innerHTML = '<h3>Recent Explorations</h3>';
  
  if (recentLocations.length === 0) {
    explorationHistoryContainer.innerHTML += '<p class="no-items">No recent explorations</p>';
    return;
  }
  
  const explorationList = document.createElement('div');
  explorationList.className = 'exploration-list';
  
  // Add each location
  recentLocations.forEach(location => {
    const explorationItem = document.createElement('div');
    explorationItem.className = 'exploration-item';
    explorationItem.dataset.id = location.id;
    
    const date = location.visitedAt ? location.visitedAt.toDate() : new Date();
    const dateString = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    explorationItem.innerHTML = `
      <div class="exploration-icon ${location.category || 'default'}"></div>
      <div class="exploration-info">
        <h4>${location.name}</h4>
        <p>${location.description || 'No description'}</p>
        <div class="exploration-meta">
          <span class="exploration-date">${dateString}</span>
          <button class="view-on-map-btn" data-id="${location.id}">View on Map</button>
        </div>
      </div>
    `;
    
    explorationList.appendChild(explorationItem);
  });
  
  explorationHistoryContainer.appendChild(explorationList);
  
  // Add view all button
  const viewAllButton = document.createElement('button');
  viewAllButton.className = 'neon-button small';
  viewAllButton.textContent = 'View All Explorations';
  viewAllButton.addEventListener('click', () => {
    document.getElementById('my-locations-btn').click();
  });
  
  explorationHistoryContainer.appendChild(viewAllButton);
  
  // Add event listeners for view on map buttons
  const viewOnMapButtons = explorationHistoryContainer.querySelectorAll('.view-on-map-btn');
  viewOnMapButtons.forEach(button => {
    button.addEventListener('click', () => {
      const locationId = button.dataset.id;
      
      // Switch to map view
      document.getElementById('map-view-btn').click();
      
      // Find and show the location
      if (window.locationsModule?.showLocationOnMap) {
        window.locationsModule.showLocationOnMap(locationId);
      }
    });
  });
}

// Set up follow buttons
function setupFollowButtons() {
  // Event delegation for follow buttons
  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('follow-btn')) {
      if (!authModule.isAuthenticated()) {
        alert('Please sign in to follow users');
        return;
      }
      
      const userId = e.target.dataset.userId;
      const user = authModule.getCurrentUser();
      
      try {
        // Check if already following
        const followingRef = db.collection('following')
          .where('followerId', '==', user.uid)
          .where('followingId', '==', userId);
        
        const snapshot = await followingRef.get();
        
        if (snapshot.empty) {
          // Not following, so follow
          await db.collection('following').add({
            followerId: user.uid,
            followingId: userId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Update button
          e.target.textContent = 'Unfollow';
          e.target.classList.add('following');
          
          // Show success message
          if (window.offlineModule?.showToast) {
            window.offlineModule.showToast('User followed successfully', 'success');
          }
          
          // Reload follow data
          loadFollowData(user.uid);
        } else {
          // Already following, so unfollow
          const followDoc = snapshot.docs[0];
          await followDoc.ref.delete();
          
          // Update button
          e.target.textContent = 'Follow';
          e.target.classList.remove('following');
          
          // Show success message
          if (window.offlineModule?.showToast) {
            window.offlineModule.showToast('User unfollowed successfully', 'success');
          }
          
          // Reload follow data
          loadFollowData(user.uid);
        }
      } catch (error) {
        console.error('Error following/unfollowing user:', error);
        
        // Show error message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Error following/unfollowing user. Please try again.', 'error');
        } else {
          alert('Error following/unfollowing user. Please try again.');
        }
      }
    }
  });
}

// Load following/followers data
async function loadFollowData(userId) {
  try {
    // Get following
    const followingRef = db.collection('following').where('followerId', '==', userId);
    const followingSnapshot = await followingRef.get();
    
    const following = [];
    followingSnapshot.forEach(doc => {
      following.push(doc.data().followingId);
    });
    
    // Get followers
    const followersRef = db.collection('following').where('followingId', '==', userId);
    const followersSnapshot = await followersRef.get();
    
    const followers = [];
    followersSnapshot.forEach(doc => {
      followers.push(doc.data().followerId);
    });
    
    // Update UI
    updateFollowingUI(following);
    updateFollowersUI(followers);
    
    return { following, followers };
  } catch (error) {
    console.error('Error loading follow data:', error);
    return { following: [], followers: [] };
  }
}

// Update following UI
async function updateFollowingUI(following) {
  const followingContainer = document.getElementById('following-container');
  if (!followingContainer) return;
  
  // Clear container
  followingContainer.innerHTML = `<h3>Following (${following.length})</h3>`;
  
  if (following.length === 0) {
    followingContainer.innerHTML += '<p class="no-items">Not following anyone yet</p>';
    return;
  }
  
  const followingList = document.createElement('div');
  followingList.className = 'following-list';
  
  // Get user data for each following
  for (const followingId of following) {
    try {
      const userDoc = await usersRef.doc(followingId).get();
      
      if (!userDoc.exists) continue;
      
      const userData = userDoc.data();
      
      const followingItem = document.createElement('div');
      followingItem.className = 'follow-item';
      followingItem.dataset.userId = followingId;
      
      followingItem.innerHTML = `
        <img src="${userData.photoURL || 'images/default-avatar.png'}" alt="${userData.displayName}" class="follow-avatar">
        <div class="follow-info">
          <h4>${userData.displayName || 'Anonymous Explorer'}</h4>
          <p>${userData.locationsCount || 0} locations</p>
        </div>
        <button class="follow-btn following" data-user-id="${followingId}">Unfollow</button>
      `;
      
      followingList.appendChild(followingItem);
    } catch (error) {
      console.error('Error loading following user data:', error);
    }
  }
  
  followingContainer.appendChild(followingList);
}

// Update followers UI
async function updateFollowersUI(followers) {
  const followersContainer = document.getElementById('followers-container');
  if (!followersContainer) return;
  
  // Clear container
  followersContainer.innerHTML = `<h3>Followers (${followers.length})</h3>`;
  
  if (followers.length === 0) {
    followersContainer.innerHTML += '<p class="no-items">No followers yet</p>';
    return;
  }
  
  const followersList = document.createElement('div');
  followersList.className = 'followers-list';
  
  // Get user data for each follower
  for (const followerId of followers) {
    try {
      const userDoc = await usersRef.doc(followerId).get();
      
      if (!userDoc.exists) continue;
      
      const userData = userDoc.data();
      
      const followerItem = document.createElement('div');
      followerItem.className = 'follow-item';
      followerItem.dataset.userId = followerId;
      
      // Check if current user is following this follower
      let followButton = '';
      
      if (authModule.isAuthenticated()) {
        const currentUser = authModule.getCurrentUser();
        
        if (currentUser.uid !== followerId) {
          const followingRef = db.collection('following')
            .where('followerId', '==', currentUser.uid)
            .where('followingId', '==', followerId);
          
          const snapshot = await followingRef.get();
          
          if (snapshot.empty) {
            followButton = `<button class="follow-btn" data-user-id="${followerId}">Follow</button>`;
          } else {
            followButton = `<button class="follow-btn following" data-user-id="${followerId}">Unfollow</button>`;
          }
        }
      }
      
      followerItem.innerHTML = `
        <img src="${userData.photoURL || 'images/default-avatar.png'}" alt="${userData.displayName}" class="follow-avatar">
        <div class="follow-info">
          <h4>${userData.displayName || 'Anonymous Explorer'}</h4>
          <p>${userData.locationsCount || 0} locations</p>
        </div>
        ${followButton}
      `;
      
      followersList.appendChild(followerItem);
    } catch (error) {
      console.error('Error loading follower user data:', error);
    }
  }
  
  followersContainer.appendChild(followersList);
}

// Set up messaging
function setupMessaging() {
  // Event delegation for message buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('message-btn')) {
      if (!authModule.isAuthenticated()) {
        alert('Please sign in to send messages');
        return;
      }
      
      const userId = e.target.dataset.userId;
      showMessageModal(userId);
    }
  });
}

// Show message modal
async function showMessageModal(userId) {
  try {
    // Get user data
    const userDoc = await usersRef.doc(userId).get();
    
    if (!userDoc.exists) {
      alert('User not found');
      return;
    }
    
    const userData = userDoc.data();
    
    // Create modal for messaging
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'message-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h2>Message ${userData.displayName || 'User'}</h2>
        <form id="message-form">
          <div class="form-group">
            <label for="message-text">Message</label>
            <textarea id="message-text" rows="4" required placeholder="Type your message here..."></textarea>
          </div>
          <div class="form-actions">
            <button type="button" id="cancel-message-btn" class="neon-button">Cancel</button>
            <button type="submit" class="neon-button">Send</button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Show modal
    setTimeout(() => {
      modal.classList.add('active');
    }, 10);
    
    // Set up event listeners
    const closeBtn = modal.querySelector('.close-modal');
    const cancelBtn = modal.querySelector('#cancel-message-btn');
    const form = modal.querySelector('#message-form');
    
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    });
    
    cancelBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    });
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (!authModule.isAuthenticated()) {
        alert('Please sign in to send messages');
        return;
      }
      
      const user = authModule.getCurrentUser();
      const messageText = document.getElementById('message-text').value.trim();
      
      if (!messageText) {
        alert('Message cannot be empty');
        return;
      }
      
      try {
        // Create a new message
        await db.collection('messages').add({
          senderId: user.uid,
          senderName: user.displayName || 'Anonymous',
          senderPhotoURL: user.photoURL || null,
          recipientId: userId,
          recipientName: userData.displayName || 'Anonymous',
          recipientPhotoURL: userData.photoURL || null,
          text: messageText,
          read: false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Show success message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Message sent successfully', 'success');
        } else {
          alert('Message sent successfully');
        }
        
        // Close modal
        modal.classList.remove('active');
        setTimeout(() => {
          document.body.removeChild(modal);
        }, 300);
      } catch (error) {
        console.error('Error sending message:', error);
        
        // Show error message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Error sending message. Please try again.', 'error');
        } else {
          alert('Error sending message. Please try again.');
        }
      }
    });
  } catch (error) {
    console.error('Error showing message modal:', error);
    
    // Show error message
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Error showing message modal. Please try again.', 'error');
    } else {
      alert('Error showing message modal. Please try again.');
    }
  }
}

// Load user stats
async function loadUserStats(userId) {
  try {
    // Get user locations
    const locationsRef = db.collection('locations').where('createdBy', '==', userId);
    const locationsSnapshot = await locationsRef.get();
    
    // Get user comments
    const commentsRef = db.collection('comments').where('createdBy', '==', userId);
    const commentsSnapshot = await commentsRef.get();
    
    // Get user territories
    const territoriesRef = db.collection('territories').where('userId', '==', userId);
    const territoriesSnapshot = await territoriesRef.get();
    
    // Calculate stats
    const locationsCount = locationsSnapshot.size;
    const commentsCount = commentsSnapshot.size;
    const territoriesCount = territoriesSnapshot.size;
    
    // Calculate average rating
    let totalRating = 0;
    let ratingCount = 0;
    
    locationsSnapshot.forEach(doc => {
      const locationData = doc.data();
      if (locationData.rating && locationData.ratingCount) {
        totalRating += locationData.rating * locationData.ratingCount;
        ratingCount += locationData.ratingCount;
      }
    });
    
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // Get recent locations (last 5)
    const recentLocations = [];
    locationsSnapshot.forEach(doc => {
      recentLocations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort by createdAt (newest first)
    recentLocations.sort((a, b) => {
      const aDate = a.createdAt ? a.createdAt.toDate() : new Date(0);
      const bDate = b.createdAt ? b.createdAt.toDate() : new Date(0);
      return bDate - aDate;
    });
    
    // Take only the last 5
    const last5Locations = recentLocations.slice(0, 5);
    
    // Update user document with stats
    await usersRef.doc(userId).update({
      locationsCount,
      commentsCount,
      territoriesCount,
      averageRating,
      recentLocations: last5Locations,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update UI
    updateStatsUI(locationsCount, commentsCount, territoriesCount, averageRating);
    updateExplorationHistoryUI(last5Locations);
    
    return {
      locationsCount,
      commentsCount,
      territoriesCount,
      averageRating,
      recentLocations: last5Locations
    };
  } catch (error) {
    console.error('Error loading user stats:', error);
    return null;
  }
}

// Update stats UI
function updateStatsUI(locationsCount, commentsCount, territoriesCount, averageRating) {
  if (statExplored) {
    statExplored.textContent = locationsCount;
  }
  
  if (statShared) {
    statShared.textContent = locationsCount;
  }
  
  if (statRating) {
    statRating.textContent = averageRating.toFixed(1);
  }
}

// Export functions for use in other modules
window.profileModule = {
  initProfile,
  loadUserProfile,
  saveUserProfile,
  applyTheme
};
