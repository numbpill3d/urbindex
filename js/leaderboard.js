// Urbindex - Leaderboard Module

// DOM Elements
const leaderboardList = document.getElementById('leaderboard-list');

// Initialize leaderboard functionality
function initLeaderboard() {
  // Set up event listeners
  document.getElementById('leaderboard-btn').addEventListener('click', () => {
    loadLeaderboard();
  });
  
  // Load leaderboard data when user signs in
  document.addEventListener('user-signed-in', () => {
    loadLeaderboard();
  });
}

// Load leaderboard data from Firestore
function loadLeaderboard() {
  // Clear the list first
  clearLeaderboard();
  
  // Show loading state
  showLeaderboardLoading();
  
  // Calculate user scores
  calculateUserScores()
    .then(userScores => {
      // Sort users by score in descending order
      const sortedUsers = userScores.sort((a, b) => b.score - a.score);
      
      // Display the leaderboard
      if (sortedUsers.length === 0) {
        showEmptyLeaderboard();
      } else {
        displayLeaderboard(sortedUsers);
      }
    })
    .catch(error => {
      console.error('Error loading leaderboard:', error);
      showLeaderboardError();
    });
}

// Calculate scores for all users
function calculateUserScores() {
  return new Promise((resolve, reject) => {
    // Get all users
    usersRef.get()
      .then(usersSnapshot => {
        const users = [];
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          users.push({
            id: doc.id,
            displayName: userData.displayName || 'Anonymous Explorer',
            photoURL: userData.photoURL || 'images/default-avatar.png',
            locationsCount: userData.locationsCount || 0,
            score: 0 // Will be calculated
          });
        });
        
        // Get all locations to calculate scores
        return locationsRef.get().then(locationsSnapshot => {
          // Create a map of user IDs to their locations
          const userLocations = {};
          
          locationsSnapshot.forEach(doc => {
            const locationData = doc.data();
            const userId = locationData.createdBy;
            
            if (!userId) return;
            
            if (!userLocations[userId]) {
              userLocations[userId] = [];
            }
            
            userLocations[userId].push({
              id: doc.id,
              upvotes: locationData.upvotes || 0,
              downvotes: locationData.downvotes || 0
            });
          });
          
          // Calculate score for each user
          users.forEach(user => {
            const locations = userLocations[user.id] || [];
            
            // Base score: 10 points per location
            let score = locations.length * 10;
            
            // Additional points from ratings
            locations.forEach(location => {
              // 2 points per upvote, -1 point per downvote
              score += (location.upvotes * 2) - location.downvotes;
            });
            
            user.score = Math.max(0, score); // Ensure score is not negative
            user.locationsCount = locations.length;
          });
          
          resolve(users);
        });
      })
      .catch(error => {
        console.error('Error calculating user scores:', error);
        reject(error);
      });
  });
}

// Display the leaderboard
function displayLeaderboard(users) {
  // Clear any existing content
  clearLeaderboard();
  
  // Create and append list items for each user
  users.forEach((user, index) => {
    const rank = index + 1;
    const listItem = createLeaderboardItem(user, rank);
    leaderboardList.appendChild(listItem);
  });
}

// Create a leaderboard item
function createLeaderboardItem(user, rank) {
  const listItem = document.createElement('li');
  listItem.className = 'list-item leaderboard-item';
  
  // Add special class for top 3
  if (rank <= 3) {
    listItem.classList.add(`rank-${rank}`);
  }
  
  // Create content
  listItem.innerHTML = `
    <div class="leaderboard-rank">${rank}</div>
    <div class="leaderboard-user">
      <img src="${user.photoURL}" alt="${user.displayName}" class="leaderboard-avatar">
      <div class="leaderboard-user-info">
        <h3>${user.displayName}</h3>
        <p>${user.locationsCount} location${user.locationsCount !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <div class="leaderboard-score">${user.score}</div>
  `;
  
  return listItem;
}

// Clear the leaderboard
function clearLeaderboard() {
  if (leaderboardList) {
    leaderboardList.innerHTML = '';
  }
}

// Show loading state
function showLeaderboardLoading() {
  if (leaderboardList) {
    leaderboardList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Loading leaderboard...</p>
      </div>
    `;
  }
}

// Show empty state
function showEmptyLeaderboard() {
  if (leaderboardList) {
    leaderboardList.innerHTML = `
      <div class="empty-state">
        <p>No explorers found.</p>
        <p>Be the first to add locations and climb the ranks!</p>
      </div>
    `;
  }
}

// Show error state
function showLeaderboardError() {
  if (leaderboardList) {
    leaderboardList.innerHTML = `
      <div class="error-state">
        <p>Error loading leaderboard.</p>
        <button id="retry-leaderboard" class="neon-button">Retry</button>
      </div>
    `;
    
    // Add retry button event listener
    document.getElementById('retry-leaderboard').addEventListener('click', loadLeaderboard);
  }
}

// Export functions for use in other modules
window.leaderboardModule = {
  initLeaderboard,
  loadLeaderboard
};
