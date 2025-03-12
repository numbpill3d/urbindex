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
            territoriesCount: 0, // Will be calculated
            crewId: userData.crewId || null,
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
              downvotes: locationData.downvotes || 0,
              rating: locationData.rating || 0,
              ratingCount: locationData.ratingCount || 0,
              claimedBy: locationData.claimedBy || null
            });
          });
          
          // Get all territories to calculate territory scores
          return territoriesRef.get().then(territoriesSnapshot => {
            // Create a map of user IDs to their territories
            const userTerritories = {};
            
            territoriesSnapshot.forEach(doc => {
              const territoryData = doc.data();
              const userId = territoryData.userId;
              
              if (!userId) return;
              
              if (!userTerritories[userId]) {
                userTerritories[userId] = [];
              }
              
              userTerritories[userId].push({
                id: doc.id,
                locationId: territoryData.locationId,
                claimedAt: territoryData.claimedAt,
                points: territoryData.points || 0
              });
            });
            
            // Calculate score for each user
            users.forEach(user => {
              const locations = userLocations[user.id] || [];
              const territories = userTerritories[user.id] || [];
              
              // Base score: 10 points per location
              let score = locations.length * 10;
              
              // Additional points from ratings
              locations.forEach(location => {
                // 2 points per upvote, -1 point per downvote
                score += (location.upvotes * 2) - location.downvotes;
                
                // 5 points per star rating (average)
                if (location.ratingCount > 0) {
                  score += Math.round(location.rating * 5);
                }
              });
              
              // Territory points: 20 points per claimed territory
              score += territories.length * 20;
              
              // Additional points for territory holding time
              territories.forEach(territory => {
                // Add territory points
                score += territory.points;
              });
              
              user.score = Math.max(0, score); // Ensure score is not negative
              user.locationsCount = locations.length;
              user.territoriesCount = territories.length;
            });
            
            // Get crew information
            return crewsRef.get().then(crewsSnapshot => {
              const crews = {};
              
              crewsSnapshot.forEach(doc => {
                const crewData = doc.data();
                crews[doc.id] = {
                  name: crewData.name,
                  color: crewData.color,
                  icon: crewData.icon
                };
              });
              
              // Add crew info to users
              users.forEach(user => {
                if (user.crewId && crews[user.crewId]) {
                  user.crewName = crews[user.crewId].name;
                  user.crewColor = crews[user.crewId].color;
                  user.crewIcon = crews[user.crewId].icon;
                }
              });
              
              resolve(users);
            });
          });
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
  
  // Create tabs for different leaderboard types
  const tabsHtml = `
    <div class="leaderboard-tabs">
      <button class="leaderboard-tab active" data-type="overall">Overall</button>
      <button class="leaderboard-tab" data-type="locations">Locations</button>
      <button class="leaderboard-tab" data-type="territories">Territories</button>
      <button class="leaderboard-tab" data-type="crews">Crews</button>
    </div>
  `;
  
  // Create leaderboard container
  const leaderboardContainer = document.createElement('div');
  leaderboardContainer.className = 'leaderboard-container';
  leaderboardContainer.innerHTML = tabsHtml;
  
  // Create leaderboard content
  const leaderboardContent = document.createElement('div');
  leaderboardContent.className = 'leaderboard-content';
  
  // Create overall leaderboard (default view)
  const overallList = document.createElement('ul');
  overallList.className = 'leaderboard-list active';
  overallList.id = 'overall-leaderboard';
  
  // Create locations leaderboard
  const locationsList = document.createElement('ul');
  locationsList.className = 'leaderboard-list';
  locationsList.id = 'locations-leaderboard';
  
  // Create territories leaderboard
  const territoriesList = document.createElement('ul');
  territoriesList.className = 'leaderboard-list';
  territoriesList.id = 'territories-leaderboard';
  
  // Create crews leaderboard
  const crewsList = document.createElement('ul');
  crewsList.className = 'leaderboard-list';
  crewsList.id = 'crews-leaderboard';
  
  // Populate overall leaderboard
  users.forEach((user, index) => {
    const rank = index + 1;
    const listItem = createLeaderboardItem(user, rank, 'overall');
    overallList.appendChild(listItem);
  });
  
  // Populate locations leaderboard
  const locationsSorted = [...users].sort((a, b) => b.locationsCount - a.locationsCount);
  locationsSorted.forEach((user, index) => {
    const rank = index + 1;
    const listItem = createLeaderboardItem(user, rank, 'locations');
    locationsList.appendChild(listItem);
  });
  
  // Populate territories leaderboard
  const territoriesSorted = [...users].sort((a, b) => b.territoriesCount - a.territoriesCount);
  territoriesSorted.forEach((user, index) => {
    const rank = index + 1;
    const listItem = createLeaderboardItem(user, rank, 'territories');
    territoriesList.appendChild(listItem);
  });
  
  // Calculate crew scores
  const crewScores = calculateCrewScores(users);
  
  // Populate crews leaderboard
  crewScores.forEach((crew, index) => {
    const rank = index + 1;
    const listItem = createCrewLeaderboardItem(crew, rank);
    crewsList.appendChild(listItem);
  });
  
  // Add lists to content
  leaderboardContent.appendChild(overallList);
  leaderboardContent.appendChild(locationsList);
  leaderboardContent.appendChild(territoriesList);
  leaderboardContent.appendChild(crewsList);
  
  // Add content to container
  leaderboardContainer.appendChild(leaderboardContent);
  
  // Add container to leaderboard
  leaderboardList.appendChild(leaderboardContainer);
  
  // Add tab event listeners
  const tabs = document.querySelectorAll('.leaderboard-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and lists
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.leaderboard-list').forEach(list => list.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Show corresponding list
      const type = tab.dataset.type;
      document.getElementById(`${type}-leaderboard`).classList.add('active');
    });
  });
}

// Calculate crew scores
function calculateCrewScores(users) {
  const crews = {};
  
  // Group users by crew
  users.forEach(user => {
    if (user.crewId) {
      if (!crews[user.crewId]) {
        crews[user.crewId] = {
          id: user.crewId,
          name: user.crewName || 'Unknown Crew',
          color: user.crewColor || '#ffffff',
          icon: user.crewIcon || '',
          members: [],
          totalScore: 0,
          totalLocations: 0,
          totalTerritories: 0
        };
      }
      
      crews[user.crewId].members.push(user);
      crews[user.crewId].totalScore += user.score;
      crews[user.crewId].totalLocations += user.locationsCount;
      crews[user.crewId].totalTerritories += user.territoriesCount;
    }
  });
  
  // Convert to array and sort by total score
  return Object.values(crews).sort((a, b) => b.totalScore - a.totalScore);
}

// Create a leaderboard item
function createLeaderboardItem(user, rank, type) {
  const listItem = document.createElement('li');
  listItem.className = 'list-item leaderboard-item';
  
  // Add special class for top 3
  if (rank <= 3) {
    listItem.classList.add(`rank-${rank}`);
  }
  
  // Create content based on leaderboard type
  let content = `
    <div class="leaderboard-rank">${rank}</div>
    <div class="leaderboard-user">
      <img src="${user.photoURL}" alt="${user.displayName}" class="leaderboard-avatar">
      <div class="leaderboard-user-info">
        <h3>${user.displayName}</h3>
  `;
  
  // Add crew badge if user is in a crew
  if (user.crewId) {
    content += `<span class="crew-badge" style="background-color: ${user.crewColor || '#9d4edd'}">${user.crewName || 'Crew'}</span>`;
  }
  
  // Add type-specific info
  if (type === 'overall') {
    content += `
        <p>${user.locationsCount} location${user.locationsCount !== 1 ? 's' : ''}, ${user.territoriesCount} territor${user.territoriesCount !== 1 ? 'ies' : 'y'}</p>
      </div>
    </div>
    <div class="leaderboard-score">${user.score}</div>
    `;
  } else if (type === 'locations') {
    content += `
        <p>${user.locationsCount} location${user.locationsCount !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <div class="leaderboard-score">${user.locationsCount}</div>
    `;
  } else if (type === 'territories') {
    content += `
        <p>${user.territoriesCount} territor${user.territoriesCount !== 1 ? 'ies' : 'y'}</p>
      </div>
    </div>
    <div class="leaderboard-score">${user.territoriesCount}</div>
    `;
  }
  
  listItem.innerHTML = content;
  return listItem;
}

// Create a crew leaderboard item
function createCrewLeaderboardItem(crew, rank) {
  const listItem = document.createElement('li');
  listItem.className = 'list-item leaderboard-item crew-item';
  
  // Add special class for top 3
  if (rank <= 3) {
    listItem.classList.add(`rank-${rank}`);
  }
  
  // Create content
  listItem.innerHTML = `
    <div class="leaderboard-rank">${rank}</div>
    <div class="leaderboard-crew">
      <div class="crew-icon" style="background-color: ${crew.color || '#9d4edd'}">${crew.icon || ''}</div>
      <div class="leaderboard-crew-info">
        <h3>${crew.name}</h3>
        <p>${crew.members.length} member${crew.members.length !== 1 ? 's' : ''}, ${crew.totalTerritories} territor${crew.totalTerritories !== 1 ? 'ies' : 'y'}</p>
      </div>
    </div>
    <div class="leaderboard-score">${crew.totalScore}</div>
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
        <p>Be the first to add locations and claim territories!</p>
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
