// Urbindex - Achievements Module

// Achievement definitions
const ACHIEVEMENTS = {
  // Exploration achievements
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    description: 'Add your first location',
    icon: '🧭',
    category: 'exploration',
    threshold: 1,
    points: 10
  },
  adventurer: {
    id: 'adventurer',
    name: 'Adventurer',
    description: 'Add 5 locations',
    icon: '🗺️',
    category: 'exploration',
    threshold: 5,
    points: 25
  },
  pathfinder: {
    id: 'pathfinder',
    name: 'Pathfinder',
    description: 'Add 15 locations',
    icon: '🧗',
    category: 'exploration',
    threshold: 15,
    points: 50
  },
  cartographer: {
    id: 'cartographer',
    name: 'Cartographer',
    description: 'Add 30 locations',
    icon: '🌍',
    category: 'exploration',
    threshold: 30,
    points: 100
  },
  legendary_explorer: {
    id: 'legendary_explorer',
    name: 'Legendary Explorer',
    description: 'Add 50 locations',
    icon: '🏆',
    category: 'exploration',
    threshold: 50,
    points: 200
  },
  
  // Community achievements
  socializer: {
    id: 'socializer',
    name: 'Socializer',
    description: 'Leave your first comment',
    icon: '💬',
    category: 'community',
    threshold: 1,
    points: 10
  },
  contributor: {
    id: 'contributor',
    name: 'Contributor',
    description: 'Leave 10 comments',
    icon: '📝',
    category: 'community',
    threshold: 10,
    points: 25
  },
  influencer: {
    id: 'influencer',
    name: 'Influencer',
    description: 'Receive 10 likes on your locations or comments',
    icon: '👍',
    category: 'community',
    threshold: 10,
    points: 50
  },
  trendsetter: {
    id: 'trendsetter',
    name: 'Trendsetter',
    description: 'Receive 25 likes on your locations or comments',
    icon: '⭐',
    category: 'community',
    threshold: 25,
    points: 100
  },
  
  // Territory achievements
  settler: {
    id: 'settler',
    name: 'Settler',
    description: 'Claim your first territory',
    icon: '🏁',
    category: 'territory',
    threshold: 1,
    points: 10
  },
  land_owner: {
    id: 'land_owner',
    name: 'Land Owner',
    description: 'Claim 5 territories',
    icon: '🏠',
    category: 'territory',
    threshold: 5,
    points: 25
  },
  territory_master: {
    id: 'territory_master',
    name: 'Territory Master',
    description: 'Claim 15 territories',
    icon: '🏰',
    category: 'territory',
    threshold: 15,
    points: 50
  },
  
  // Geocaching achievements
  cache_hunter: {
    id: 'cache_hunter',
    name: 'Cache Hunter',
    description: 'Find your first geocache',
    icon: '🔍',
    category: 'geocaching',
    threshold: 1,
    points: 10
  },
  treasure_hunter: {
    id: 'treasure_hunter',
    name: 'Treasure Hunter',
    description: 'Find 5 geocaches',
    icon: '💎',
    category: 'geocaching',
    threshold: 5,
    points: 25
  },
  master_cacher: {
    id: 'master_cacher',
    name: 'Master Cacher',
    description: 'Find 15 geocaches',
    icon: '🏺',
    category: 'geocaching',
    threshold: 15,
    points: 50
  },
  
  // Special achievements
  night_owl: {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Add 5 locations during night hours (10 PM - 4 AM)',
    icon: '🦉',
    category: 'special',
    threshold: 5,
    points: 30
  },
  photographer: {
    id: 'photographer',
    name: 'Photographer',
    description: 'Upload 10 photos to locations',
    icon: '📸',
    category: 'special',
    threshold: 10,
    points: 25
  },
  video_creator: {
    id: 'video_creator',
    name: 'Video Creator',
    description: 'Upload your first video to a location',
    icon: '🎥',
    category: 'special',
    threshold: 1,
    points: 20
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Join Urbindex in its first month',
    icon: '🚀',
    category: 'special',
    threshold: 1,
    points: 50
  },
  
  // Challenge achievements
  challenge_master: {
    id: 'challenge_master',
    name: 'Challenge Master',
    description: 'Complete 5 challenges',
    icon: '🏅',
    category: 'challenge',
    threshold: 5,
    points: 50
  },
  weekly_explorer: {
    id: 'weekly_explorer',
    name: 'Weekly Explorer',
    description: 'Complete a weekly exploration challenge',
    icon: '📅',
    category: 'challenge',
    threshold: 1,
    points: 20
  }
};

// Badge definitions
const BADGES = {
  // Rank badges
  novice: {
    id: 'novice',
    name: 'Novice Explorer',
    description: 'Reach 100 points',
    icon: '🔰',
    category: 'rank',
    threshold: 100
  },
  intermediate: {
    id: 'intermediate',
    name: 'Intermediate Explorer',
    description: 'Reach 250 points',
    icon: '🥉',
    category: 'rank',
    threshold: 250
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced Explorer',
    description: 'Reach 500 points',
    icon: '🥈',
    category: 'rank',
    threshold: 500
  },
  expert: {
    id: 'expert',
    name: 'Expert Explorer',
    description: 'Reach 1000 points',
    icon: '🥇',
    category: 'rank',
    threshold: 1000
  },
  master: {
    id: 'master',
    name: 'Master Explorer',
    description: 'Reach 2000 points',
    icon: '👑',
    category: 'rank',
    threshold: 2000
  },
  
  // Special badges
  verified: {
    id: 'verified',
    name: 'Verified Explorer',
    description: 'Verified by Urbindex team',
    icon: '✅',
    category: 'special'
  },
  moderator: {
    id: 'moderator',
    name: 'Community Moderator',
    description: 'Help moderate the Urbindex community',
    icon: '🛡️',
    category: 'special'
  },
  developer: {
    id: 'developer',
    name: 'Urbindex Developer',
    description: 'Part of the Urbindex development team',
    icon: '💻',
    category: 'special'
  }
};

// Initialize achievements functionality
function initAchievements() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    // Load user achievements
    loadUserAchievements(user.uid);
  });
  
  // Listen for achievement-related events
  document.addEventListener('location-added', checkLocationAchievements);
  document.addEventListener('comment-added', checkCommentAchievements);
  document.addEventListener('territory-claimed', checkTerritoryAchievements);
  document.addEventListener('geocache-found', checkGeocachingAchievements);
  document.addEventListener('challenge-completed', checkChallengeAchievements);
  document.addEventListener('photo-uploaded', checkPhotoAchievements);
  document.addEventListener('video-uploaded', checkVideoAchievements);
}

// Load user achievements from Firestore
async function loadUserAchievements(userId) {
  try {
    const userDoc = await usersRef.doc(userId).get();
    
    if (!userDoc.exists) {
      console.warn('User document not found');
      return;
    }
    
    const userData = userDoc.data();
    
    // Get achievements and badges
    const achievements = userData.achievements || {};
    const badges = userData.badges || {};
    
    // Update UI if on profile page
    updateAchievementsUI(achievements, badges);
    
    return { achievements, badges };
  } catch (error) {
    console.error('Error loading user achievements:', error);
    return { achievements: {}, badges: {} };
  }
}

// Update achievements UI
function updateAchievementsUI(achievements, badges) {
  const achievementsContainer = document.getElementById('achievements-container');
  const badgesContainer = document.getElementById('badges-container');
  
  if (!achievementsContainer || !badgesContainer) return;
  
  // Clear containers
  achievementsContainer.innerHTML = '';
  badgesContainer.innerHTML = '';
  
  // Add achievements
  const achievementIds = Object.keys(achievements);
  
  if (achievementIds.length === 0) {
    achievementsContainer.innerHTML = '<p class="no-items">No achievements yet. Start exploring!</p>';
  } else {
    // Group achievements by category
    const achievementsByCategory = {};
    
    achievementIds.forEach(id => {
      const achievement = ACHIEVEMENTS[id];
      if (!achievement) return;
      
      if (!achievementsByCategory[achievement.category]) {
        achievementsByCategory[achievement.category] = [];
      }
      
      achievementsByCategory[achievement.category].push(achievement);
    });
    
    // Create category sections
    Object.keys(achievementsByCategory).forEach(category => {
      const categoryAchievements = achievementsByCategory[category];
      
      const categorySection = document.createElement('div');
      categorySection.className = 'achievement-category';
      
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      
      categorySection.innerHTML = `<h3>${categoryName} Achievements</h3>`;
      
      const achievementsList = document.createElement('div');
      achievementsList.className = 'achievements-list';
      
      categoryAchievements.forEach(achievement => {
        const achievementElement = document.createElement('div');
        achievementElement.className = 'achievement-item';
        achievementElement.dataset.id = achievement.id;
        
        achievementElement.innerHTML = `
          <div class="achievement-icon">${achievement.icon}</div>
          <div class="achievement-info">
            <h4>${achievement.name}</h4>
            <p>${achievement.description}</p>
            <span class="achievement-points">+${achievement.points} points</span>
          </div>
        `;
        
        achievementsList.appendChild(achievementElement);
      });
      
      categorySection.appendChild(achievementsList);
      achievementsContainer.appendChild(categorySection);
    });
  }
  
  // Add badges
  const badgeIds = Object.keys(badges);
  
  if (badgeIds.length === 0) {
    badgesContainer.innerHTML = '<p class="no-items">No badges yet. Keep exploring to earn badges!</p>';
  } else {
    // Group badges by category
    const badgesByCategory = {};
    
    badgeIds.forEach(id => {
      const badge = BADGES[id];
      if (!badge) return;
      
      if (!badgesByCategory[badge.category]) {
        badgesByCategory[badge.category] = [];
      }
      
      badgesByCategory[badge.category].push(badge);
    });
    
    // Create category sections
    Object.keys(badgesByCategory).forEach(category => {
      const categoryBadges = badgesByCategory[category];
      
      const categorySection = document.createElement('div');
      categorySection.className = 'badge-category';
      
      const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
      
      categorySection.innerHTML = `<h3>${categoryName} Badges</h3>`;
      
      const badgesList = document.createElement('div');
      badgesList.className = 'badges-list';
      
      categoryBadges.forEach(badge => {
        const badgeElement = document.createElement('div');
        badgeElement.className = 'badge-item';
        badgeElement.dataset.id = badge.id;
        
        badgeElement.innerHTML = `
          <div class="badge-icon">${badge.icon}</div>
          <div class="badge-info">
            <h4>${badge.name}</h4>
            <p>${badge.description}</p>
          </div>
        `;
        
        badgesList.appendChild(badgeElement);
      });
      
      categorySection.appendChild(badgesList);
      badgesContainer.appendChild(categorySection);
    });
  }
}

// Check for location-related achievements
function checkLocationAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const locationsCount = userData.locationsCount || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Explorer achievement (1 location)
    if (locationsCount >= 1 && !achievements.explorer) {
      newAchievements.explorer = true;
      pointsEarned += ACHIEVEMENTS.explorer.points;
    }
    
    // Adventurer achievement (5 locations)
    if (locationsCount >= 5 && !achievements.adventurer) {
      newAchievements.adventurer = true;
      pointsEarned += ACHIEVEMENTS.adventurer.points;
    }
    
    // Pathfinder achievement (15 locations)
    if (locationsCount >= 15 && !achievements.pathfinder) {
      newAchievements.pathfinder = true;
      pointsEarned += ACHIEVEMENTS.pathfinder.points;
    }
    
    // Cartographer achievement (30 locations)
    if (locationsCount >= 30 && !achievements.cartographer) {
      newAchievements.cartographer = true;
      pointsEarned += ACHIEVEMENTS.cartographer.points;
    }
    
    // Legendary Explorer achievement (50 locations)
    if (locationsCount >= 50 && !achievements.legendary_explorer) {
      newAchievements.legendary_explorer = true;
      pointsEarned += ACHIEVEMENTS.legendary_explorer.points;
    }
    
    // Night Owl achievement (check if location was added during night hours)
    if (event?.detail && event.detail.timestamp) {
      const timestamp = event.detail.timestamp;
      const hour = timestamp.getHours();
      
      if ((hour >= 22 || hour < 4)) {
        // Increment night locations count
        const nightLocationsCount = userData.nightLocationsCount || 0;
        
        if (nightLocationsCount + 1 >= 5 && !achievements.night_owl) {
          newAchievements.night_owl = true;
          pointsEarned += ACHIEVEMENTS.night_owl.points;
        }
        
        // Update night locations count
        usersRef.doc(user.uid).update({
          nightLocationsCount: firebase.firestore.FieldValue.increment(1)
        });
      }
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for comment-related achievements
function checkCommentAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const commentsCount = userData.commentsCount || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Socializer achievement (1 comment)
    if (commentsCount >= 1 && !achievements.socializer) {
      newAchievements.socializer = true;
      pointsEarned += ACHIEVEMENTS.socializer.points;
    }
    
    // Contributor achievement (10 comments)
    if (commentsCount >= 10 && !achievements.contributor) {
      newAchievements.contributor = true;
      pointsEarned += ACHIEVEMENTS.contributor.points;
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for territory-related achievements
function checkTerritoryAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const territoriesCount = userData.territoriesCount || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Settler achievement (1 territory)
    if (territoriesCount >= 1 && !achievements.settler) {
      newAchievements.settler = true;
      pointsEarned += ACHIEVEMENTS.settler.points;
    }
    
    // Land Owner achievement (5 territories)
    if (territoriesCount >= 5 && !achievements.land_owner) {
      newAchievements.land_owner = true;
      pointsEarned += ACHIEVEMENTS.land_owner.points;
    }
    
    // Territory Master achievement (15 territories)
    if (territoriesCount >= 15 && !achievements.territory_master) {
      newAchievements.territory_master = true;
      pointsEarned += ACHIEVEMENTS.territory_master.points;
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for geocaching-related achievements
function checkGeocachingAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const geocachesFound = userData.geocachesFound || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Cache Hunter achievement (1 geocache)
    if (geocachesFound >= 1 && !achievements.cache_hunter) {
      newAchievements.cache_hunter = true;
      pointsEarned += ACHIEVEMENTS.cache_hunter.points;
    }
    
    // Treasure Hunter achievement (5 geocaches)
    if (geocachesFound >= 5 && !achievements.treasure_hunter) {
      newAchievements.treasure_hunter = true;
      pointsEarned += ACHIEVEMENTS.treasure_hunter.points;
    }
    
    // Master Cacher achievement (15 geocaches)
    if (geocachesFound >= 15 && !achievements.master_cacher) {
      newAchievements.master_cacher = true;
      pointsEarned += ACHIEVEMENTS.master_cacher.points;
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for challenge-related achievements
function checkChallengeAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const challengesCompleted = userData.challengesCompleted || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Weekly Explorer achievement (1 weekly challenge)
    if (event?.detail && event.detail.type === 'weekly' && !achievements.weekly_explorer) {
      newAchievements.weekly_explorer = true;
      pointsEarned += ACHIEVEMENTS.weekly_explorer.points;
    }
    
    // Challenge Master achievement (5 challenges)
    if (challengesCompleted >= 5 && !achievements.challenge_master) {
      newAchievements.challenge_master = true;
      pointsEarned += ACHIEVEMENTS.challenge_master.points;
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for photo-related achievements
function checkPhotoAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const photosUploaded = userData.photosUploaded || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Photographer achievement (10 photos)
    if (photosUploaded >= 10 && !achievements.photographer) {
      newAchievements.photographer = true;
      pointsEarned += ACHIEVEMENTS.photographer.points;
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for video-related achievements
function checkVideoAchievements(event) {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user data
  usersRef.doc(user.uid).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const videosUploaded = userData.videosUploaded || 0;
    const achievements = userData.achievements || {};
    
    // Check for achievements
    const newAchievements = {};
    let pointsEarned = 0;
    
    // Video Creator achievement (1 video)
    if (videosUploaded >= 1 && !achievements.video_creator) {
      newAchievements.video_creator = true;
      pointsEarned += ACHIEVEMENTS.video_creator.points;
    }
    
    // If new achievements were earned
    if (Object.keys(newAchievements).length > 0) {
      // Update user document
      const updates = {
        achievements: { ...achievements, ...newAchievements },
        score: firebase.firestore.FieldValue.increment(pointsEarned)
      };
      
      usersRef.doc(user.uid).update(updates).then(() => {
        // Show achievement notifications
        Object.keys(newAchievements).forEach(achievementId => {
          const achievement = ACHIEVEMENTS[achievementId];
          if (achievement) {
            showAchievementNotification(achievement);
          }
        });
        
        // Check for badges
        checkBadges(user.uid, userData.score + pointsEarned);
      });
    }
  });
}

// Check for badges based on score
function checkBadges(userId, score) {
  // Get user data
  usersRef.doc(userId).get().then(doc => {
    if (!doc.exists) return;
    
    const userData = doc.data();
    const badges = userData.badges || {};
    
    // Check for rank badges
    const newBadges = {};
    
    // Novice badge (100 points)
    if (score >= 100 && !badges.novice) {
      newBadges.novice = true;
    }
    
    // Intermediate badge (250 points)
    if (score >= 250 && !badges.intermediate) {
      newBadges.intermediate = true;
    }
    
    // Advanced badge (500 points)
    if (score >= 500 && !badges.advanced) {
      newBadges.advanced = true;
    }
    
    // Expert badge (1000 points)
    if (score >= 1000 && !badges.expert) {
      newBadges.expert = true;
    }
    
    // Master badge (2000 points)
    if (score >= 2000 && !badges.master) {
      newBadges.master = true;
    }
    
    // If new badges were earned
    if (Object.keys(newBadges).length > 0) {
      // Update user document
      usersRef.doc(userId).update({
        badges: { ...badges, ...newBadges }
      }).then(() => {
        // Show badge notifications
        Object.keys(newBadges).forEach(badgeId => {
          const badge = BADGES[badgeId];
          if (badge) {
            showBadgeNotification(badge);
          }
        });
      });
    }
  });
}

// Show achievement notification
function showAchievementNotification(achievement) {
  if (!achievement) return;
  
  // Check if offlineModule is available
  if (window.offlineModule?.showToast) {
    window.offlineModule.showToast(
      `Achievement Unlocked: ${achievement.name}`,
      'achievement',
      5000,
      `${achievement.icon} +${achievement.points} points`
    );
  } else {
    // Fallback notification
    console.log(`Achievement Unlocked: ${achievement.name} (${achievement.icon} +${achievement.points} points)`);
    
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
      <div class="achievement-notification-icon">${achievement.icon}</div>
      <div class="achievement-notification-content">
        <h4>Achievement Unlocked!</h4>
        <p>${achievement.name}</p>
        <span class="achievement-points">+${achievement.points} points</span>
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

// Show badge notification
function showBadgeNotification(badge) {
  if (!badge) return;
  
  // Check if offlineModule is available
  if (window.offlineModule?.showToast) {
    window.offlineModule.showToast(
      `Badge Earned: ${badge.name}`,
      'badge',
      5000,
      badge.icon
    );
  } else {
    // Fallback notification
    console.log(`Badge Earned: ${badge.name} (${badge.icon})`);
    
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'badge-notification';
    notification.innerHTML = `
      <div class="badge-notification-icon">${badge.icon}</div>
      <div class="badge-notification-content">
        <h4>Badge Earned!</h4>
        <p>${badge.name}</p>
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

// Get user's current rank badge
function getUserRankBadge(badges) {
  if (!badges) return null;
  
  // Check badges in order from highest to lowest
  if (badges.master) return BADGES.master;
  if (badges.expert) return BADGES.expert;
  if (badges.advanced) return BADGES.advanced;
  if (badges.intermediate) return BADGES.intermediate;
  if (badges.novice) return BADGES.novice;
  
  return null;
}

// Get user's progress to next rank badge
function getNextRankProgress(score) {
  if (score >= 2000) {
    // Already at max rank
    return { current: BADGES.master, next: null, progress: 100 };
  } else if (score >= 1000) {
    // Expert -> Master
    return {
      current: BADGES.expert,
      next: BADGES.master,
      progress: Math.min(100, Math.floor((score - 1000) / 10))
    };
  } else if (score >= 500) {
    // Advanced -> Expert
    return {
      current: BADGES.advanced,
      next: BADGES.expert,
      progress: Math.min(100, Math.floor((score - 500) / 5))
    };
  } else if (score >= 250) {
    // Intermediate -> Advanced
    return {
      current: BADGES.intermediate,
      next: BADGES.advanced,
      progress: Math.min(100, Math.floor((score - 250) / 2.5))
    };
  } else if (score >= 100) {
    // Novice -> Intermediate
    return {
      current: BADGES.novice,
      next: BADGES.intermediate,
      progress: Math.min(100, Math.floor((score - 100) / 1.5))
    };
  } else {
    // None -> Novice
    return {
      current: null,
      next: BADGES.novice,
      progress: Math.min(100, score)
    };
  }
}

// Export functions for use in other modules
window.achievementsModule = {
  initAchievements,
  loadUserAchievements,
  checkLocationAchievements,
  checkCommentAchievements,
  checkTerritoryAchievements,
  checkGeocachingAchievements,
  checkChallengeAchievements,
  checkPhotoAchievements,
  checkVideoAchievements,
  getUserRankBadge,
  getNextRankProgress,
  ACHIEVEMENTS,
  BADGES
};
