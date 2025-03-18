// Urbindex - Challenges Module

// Challenge definitions
const CHALLENGES = {
  // Weekly challenges
  weekly_explorer: {
    id: 'weekly_explorer',
    title: 'Weekly Explorer',
    description: 'Add 3 new locations this week',
    category: 'weekly',
    type: 'location',
    target: 3,
    reward: {
      points: 50,
      badge: null
    },
    duration: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    icon: '🗺️'
  },
  weekly_social: {
    id: 'weekly_social',
    title: 'Weekly Social',
    description: 'Leave 5 comments this week',
    category: 'weekly',
    type: 'comment',
    target: 5,
    reward: {
      points: 30,
      badge: null
    },
    duration: 7 * 24 * 60 * 60 * 1000,
    icon: '💬'
  },
  weekly_photographer: {
    id: 'weekly_photographer',
    title: 'Weekly Photographer',
    description: 'Upload 5 photos to locations this week',
    category: 'weekly',
    type: 'photo',
    target: 5,
    reward: {
      points: 40,
      badge: null
    },
    duration: 7 * 24 * 60 * 60 * 1000,
    icon: '📸'
  },
  
  // Monthly challenges
  monthly_cartographer: {
    id: 'monthly_cartographer',
    title: 'Monthly Cartographer',
    description: 'Add 10 new locations this month',
    category: 'monthly',
    type: 'location',
    target: 10,
    reward: {
      points: 100,
      badge: null
    },
    duration: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    icon: '🌍'
  },
  monthly_territory: {
    id: 'monthly_territory',
    title: 'Territory Master',
    description: 'Claim 5 new territories this month',
    category: 'monthly',
    type: 'territory',
    target: 5,
    reward: {
      points: 120,
      badge: null
    },
    duration: 30 * 24 * 60 * 60 * 1000,
    icon: '🏁'
  },
  
  // Special challenges
  night_owl: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Add 3 locations between 10 PM and 4 AM',
    category: 'special',
    type: 'night_location',
    target: 3,
    reward: {
      points: 75,
      badge: null
    },
    duration: null, // No expiration
    icon: '🦉'
  },
  urban_videographer: {
    id: 'urban_videographer',
    title: 'Urban Videographer',
    description: 'Upload 3 videos to different locations',
    category: 'special',
    type: 'video',
    target: 3,
    reward: {
      points: 80,
      badge: null
    },
    duration: null, // No expiration
    icon: '🎥'
  },
  geocache_hunter: {
    id: 'geocache_hunter',
    title: 'Geocache Hunter',
    description: 'Find 5 geocaches',
    category: 'special',
    type: 'geocache',
    target: 5,
    reward: {
      points: 100,
      badge: null
    },
    duration: null, // No expiration
    icon: '🔍'
  },
  
  // Location-based challenges
  neighborhood_explorer: {
    id: 'neighborhood_explorer',
    title: 'Neighborhood Explorer',
    description: 'Add locations in 5 different neighborhoods',
    category: 'location',
    type: 'neighborhood',
    target: 5,
    reward: {
      points: 90,
      badge: null
    },
    duration: null, // No expiration
    icon: '🏙️'
  },
  water_explorer: {
    id: 'water_explorer',
    title: 'Water Explorer',
    description: 'Add 3 locations near water sources',
    category: 'location',
    type: 'water',
    target: 3,
    reward: {
      points: 60,
      badge: null
    },
    duration: null, // No expiration
    icon: '💧'
  },
  
  // Community challenges
  community_helper: {
    id: 'community_helper',
    title: 'Community Helper',
    description: 'Help 5 other explorers by providing information',
    category: 'community',
    type: 'help',
    target: 5,
    reward: {
      points: 70,
      badge: null
    },
    duration: null, // No expiration
    icon: '🤝'
  },
  popular_spot: {
    id: 'popular_spot',
    title: 'Popular Spot',
    description: 'Have one of your locations receive 10 likes',
    category: 'community',
    type: 'likes',
    target: 10,
    reward: {
      points: 80,
      badge: null
    },
    duration: null, // No expiration
    icon: '⭐'
  }
};

// Initialize challenges functionality
function initChallenges() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    // Load user challenges
    loadUserChallenges(user.uid);
    // Check for new challenges
    checkForNewChallenges(user.uid);
  });
  
  // Listen for challenge-related events
  document.addEventListener('location-added', updateChallengeProgress);
  document.addEventListener('comment-added', updateChallengeProgress);
  document.addEventListener('territory-claimed', updateChallengeProgress);
  document.addEventListener('geocache-found', updateChallengeProgress);
  document.addEventListener('photo-uploaded', updateChallengeProgress);
  document.addEventListener('video-uploaded', updateChallengeProgress);
  document.addEventListener('location-liked', updateChallengeProgress);
  document.addEventListener('help-provided', updateChallengeProgress);
}

// Load user challenges from Firestore
async function loadUserChallenges(userId) {
  try {
    const userChallengesRef = db.collection('userChallenges').where('userId', '==', userId);
    const snapshot = await userChallengesRef.get();
    
    const challenges = [];
    snapshot.forEach(doc => {
      challenges.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Update UI if on profile page
    updateChallengesUI(challenges);
    
    return challenges;
  } catch (error) {
    console.error('Error loading user challenges:', error);
    return [];
  }
}

// Check for new challenges
async function checkForNewChallenges(userId) {
  try {
    // Get user's current challenges
    const userChallengesRef = db.collection('userChallenges').where('userId', '==', userId);
    const snapshot = await userChallengesRef.get();
    
    const currentChallenges = {};
    snapshot.forEach(doc => {
      const challenge = doc.data();
      currentChallenges[challenge.challengeId] = challenge;
    });
    
    // Check for weekly challenges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    
    // Check if we need to assign weekly challenges
    const weeklyIds = ['weekly_explorer', 'weekly_social', 'weekly_photographer'];
    let needsWeeklyChallenge = true;
    
    for (const id of weeklyIds) {
      if (currentChallenges[id] && new Date(currentChallenges[id].startDate.toDate()) >= startOfWeek) {
        needsWeeklyChallenge = false;
        break;
      }
    }
    
    if (needsWeeklyChallenge) {
      // Assign a random weekly challenge
      const randomIndex = Math.floor(Math.random() * weeklyIds.length);
      const challengeId = weeklyIds[randomIndex];
      
      await assignChallenge(userId, challengeId);
    }
    
    // Check for monthly challenges
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Check if we need to assign monthly challenges
    const monthlyIds = ['monthly_cartographer', 'monthly_territory'];
    let needsMonthlyChallenge = true;
    
    for (const id of monthlyIds) {
      if (currentChallenges[id] && new Date(currentChallenges[id].startDate.toDate()) >= startOfMonth) {
        needsMonthlyChallenge = false;
        break;
      }
    }
    
    if (needsMonthlyChallenge) {
      // Assign a random monthly challenge
      const randomIndex = Math.floor(Math.random() * monthlyIds.length);
      const challengeId = monthlyIds[randomIndex];
      
      await assignChallenge(userId, challengeId);
    }
    
    // Check for special challenges
    const specialIds = ['night_owl', 'urban_videographer', 'geocache_hunter'];
    
    for (const id of specialIds) {
      if (!currentChallenges[id]) {
        await assignChallenge(userId, id);
      }
    }
    
    // Check for location-based challenges
    const locationIds = ['neighborhood_explorer', 'water_explorer'];
    
    for (const id of locationIds) {
      if (!currentChallenges[id]) {
        await assignChallenge(userId, id);
      }
    }
    
    // Check for community challenges
    const communityIds = ['community_helper', 'popular_spot'];
    
    for (const id of communityIds) {
      if (!currentChallenges[id]) {
        await assignChallenge(userId, id);
      }
    }
    
    // Reload challenges to update UI
    loadUserChallenges(userId);
  } catch (error) {
    console.error('Error checking for new challenges:', error);
  }
}

// Assign a challenge to a user
async function assignChallenge(userId, challengeId) {
  try {
    const challenge = CHALLENGES[challengeId];
    if (!challenge) return;
    
    const now = new Date();
    const endDate = challenge.duration ? new Date(now.getTime() + challenge.duration) : null;
    
    const userChallenge = {
      userId,
      challengeId,
      title: challenge.title,
      description: challenge.description,
      category: challenge.category,
      type: challenge.type,
      target: challenge.target,
      progress: 0,
      completed: false,
      startDate: firebase.firestore.Timestamp.fromDate(now),
      endDate: endDate ? firebase.firestore.Timestamp.fromDate(endDate) : null,
      reward: challenge.reward,
      icon: challenge.icon
    };
    
    await db.collection('userChallenges').add(userChallenge);
    console.log(`Challenge ${challengeId} assigned to user ${userId}`);
    
    // Show notification
    showChallengeNotification(challenge, 'new');
  } catch (error) {
    console.error('Error assigning challenge:', error);
  }
}

// Update challenge progress
async function updateChallengeProgress(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  const eventType = event.type;
  const eventDetail = event.detail || {};
  
  try {
    // Get user's current challenges
    const userChallengesRef = db.collection('userChallenges')
      .where('userId', '==', user.uid)
      .where('completed', '==', false);
    
    const snapshot = await userChallengesRef.get();
    
    // Process each active challenge
    snapshot.forEach(async (doc) => {
      const challenge = doc.data();
      let shouldUpdate = false;
      let progressIncrement = 0;
      
      // Check if this event applies to this challenge
      switch (eventType) {
        case 'location-added':
          if (challenge.type === 'location') {
            progressIncrement = 1;
            shouldUpdate = true;
          } else if (challenge.type === 'night_location') {
            // Check if location was added during night hours
            const timestamp = eventDetail.timestamp;
            const hour = timestamp.getHours();
            
            if (hour >= 22 || hour < 4) {
              progressIncrement = 1;
              shouldUpdate = true;
            }
          } else if (challenge.type === 'neighborhood') {
            // Check if this is a new neighborhood
            const neighborhood = eventDetail.neighborhood;
            
            if (neighborhood && !challenge.neighborhoods) {
              challenge.neighborhoods = [neighborhood];
              progressIncrement = 1;
              shouldUpdate = true;
            } else if (neighborhood && !challenge.neighborhoods.includes(neighborhood)) {
              challenge.neighborhoods.push(neighborhood);
              progressIncrement = 1;
              shouldUpdate = true;
            }
          } else if (challenge.type === 'water' && eventDetail.isNearWater) {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
          
        case 'comment-added':
          if (challenge.type === 'comment') {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
          
        case 'territory-claimed':
          if (challenge.type === 'territory') {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
          
        case 'geocache-found':
          if (challenge.type === 'geocache') {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
          
        case 'photo-uploaded':
          if (challenge.type === 'photo') {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
          
        case 'video-uploaded':
          if (challenge.type === 'video') {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
          
        case 'location-liked':
          if (challenge.type === 'likes' && eventDetail.locationUserId === user.uid) {
            // Check if this is for the same location
            const locationId = eventDetail.locationId;
            
            if (!challenge.locationLikes) {
              challenge.locationLikes = {};
              challenge.locationLikes[locationId] = 1;
              progressIncrement = 1;
              shouldUpdate = true;
            } else if (challenge.locationLikes[locationId]) {
              challenge.locationLikes[locationId]++;
              
              // Check if any location has reached the target
              const hasReachedTarget = Object.values(challenge.locationLikes).some(count => count >= challenge.target);
              
              if (hasReachedTarget) {
                challenge.progress = challenge.target;
                shouldUpdate = true;
              }
            } else {
              challenge.locationLikes[locationId] = 1;
              progressIncrement = 1;
              shouldUpdate = true;
            }
          }
          break;
          
        case 'help-provided':
          if (challenge.type === 'help') {
            progressIncrement = 1;
            shouldUpdate = true;
          }
          break;
      }
      
      // Update challenge if needed
      if (shouldUpdate) {
        const newProgress = Math.min(challenge.progress + progressIncrement, challenge.target);
        const completed = newProgress >= challenge.target;
        
        // Update challenge in Firestore
        await doc.ref.update({
          progress: newProgress,
          completed,
          ...(challenge.neighborhoods ? { neighborhoods: challenge.neighborhoods } : {}),
          ...(challenge.locationLikes ? { locationLikes: challenge.locationLikes } : {})
        });
        
        // If challenge is completed, award points and check for achievement
        if (completed && !challenge.completed) {
          // Award points
          await usersRef.doc(user.uid).update({
            score: firebase.firestore.FieldValue.increment(challenge.reward.points),
            challengesCompleted: firebase.firestore.FieldValue.increment(1)
          });
          
          // Show completion notification
          showChallengeNotification(challenge, 'completed');
          
          // Dispatch challenge completed event
          document.dispatchEvent(new CustomEvent('challenge-completed', {
            detail: {
              challengeId: challenge.challengeId,
              type: challenge.category,
              points: challenge.reward.points
            }
          }));
        }
      }
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
  }
}

// Update challenges UI
function updateChallengesUI(challenges) {
  const challengesContainer = document.getElementById('challenges-container');
  if (!challengesContainer) return;
  
  // Clear container
  challengesContainer.innerHTML = '';
  
  // Group challenges by category
  const challengesByCategory = {
    weekly: [],
    monthly: [],
    special: [],
    location: [],
    community: []
  };
  
  challenges.forEach(challenge => {
    if (challengesByCategory[challenge.category]) {
      challengesByCategory[challenge.category].push(challenge);
    } else {
      challengesByCategory.special.push(challenge);
    }
  });
  
  // Create category sections
  Object.keys(challengesByCategory).forEach(category => {
    const categoryChallenges = challengesByCategory[category];
    
    if (categoryChallenges.length === 0) return;
    
    const categorySection = document.createElement('div');
    categorySection.className = 'challenge-category';
    
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    categorySection.innerHTML = `<h3>${categoryName} Challenges</h3>`;
    
    const challengesList = document.createElement('div');
    challengesList.className = 'challenges-list';
    
    categoryChallenges.forEach(challenge => {
      const now = new Date();
      const endDate = challenge.endDate ? challenge.endDate.toDate() : null;
      const isExpired = endDate && endDate < now;
      
      const challengeElement = document.createElement('div');
      challengeElement.className = `challenge-item ${challenge.completed ? 'completed' : isExpired ? 'expired' : 'active'}`;
      challengeElement.dataset.id = challenge.id;
      
      const progress = Math.min(Math.round((challenge.progress / challenge.target) * 100), 100);
      
      let statusText = 'Active';
      let statusClass = 'active';
      
      if (challenge.completed) {
        statusText = 'Completed';
        statusClass = 'completed';
      } else if (isExpired) {
        statusText = 'Expired';
        statusClass = 'expired';
      }
      
      let timeRemaining = '';
      if (endDate && !challenge.completed && !isExpired) {
        const diffMs = endDate - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
          timeRemaining = `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
        } else {
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          timeRemaining = `${diffHours} hour${diffHours !== 1 ? 's' : ''} left`;
        }
      }
      
      challengeElement.innerHTML = `
        <div class="challenge-header">
          <h4 class="challenge-title">${challenge.icon} ${challenge.title}</h4>
          <span class="challenge-status ${statusClass}">${statusText}</span>
        </div>
        <p class="challenge-description">${challenge.description}</p>
        <div class="challenge-progress">
          <div class="challenge-progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="challenge-meta">
          <span class="challenge-progress-text">${challenge.progress}/${challenge.target} completed</span>
          <span class="challenge-time">${timeRemaining}</span>
          <span class="challenge-reward">+${challenge.reward.points} points</span>
        </div>
      `;
      
      challengesList.appendChild(challengeElement);
    });
    
    categorySection.appendChild(challengesList);
    challengesContainer.appendChild(categorySection);
  });
  
  // If no challenges
  if (Object.values(challengesByCategory).every(arr => arr.length === 0)) {
    challengesContainer.innerHTML = '<p class="no-items">No active challenges. Check back soon!</p>';
  }
}

// Show challenge notification
function showChallengeNotification(challenge, type) {
  if (!challenge) return;
  
  let title = '';
  let message = '';
  
  if (type === 'new') {
    title = 'New Challenge';
    message = `${challenge.title}: ${challenge.description}`;
  } else if (type === 'completed') {
    title = 'Challenge Completed';
    message = `You've completed "${challenge.title}" and earned ${challenge.reward.points} points!`;
  }
  
  // Check if offlineModule is available
  if (window.offlineModule?.showToast) {
    window.offlineModule.showToast(
      message,
      'challenge',
      5000,
      challenge.icon
    );
  } else {
    // Fallback notification
    console.log(`${title}: ${message}`);
    
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'challenge-notification';
    notification.innerHTML = `
      <div class="challenge-notification-icon">${challenge.icon}</div>
      <div class="challenge-notification-content">
        <h4>${title}</h4>
        <p>${message}</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show with animation
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Remove after a delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 500);
    }, 5000);
  }
}

// Export functions for use in other modules
window.challengesModule = {
  initChallenges,
  loadUserChallenges,
  checkForNewChallenges,
  updateChallengeProgress,
  CHALLENGES
};
