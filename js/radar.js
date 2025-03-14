// Urbindex - Radar Widget Module

// DOM Elements
let radarWidget;
let radarToggle;
let radarScreen;
let radarSweep;
let radarCenter;
let radarBlips = [];

// Configuration
const radarConfig = {
  enabled: true,
  range: 500, // meters
  updateInterval: 5000, // milliseconds
  minimized: false,
  maxBlips: 20, // Maximum number of blips to show
  blipTimeout: 60000 // How long a blip stays on radar (1 minute)
};

// User positions cache
const userPositions = new Map();

// Current user position
let currentPosition = null;

// Initialize radar widget
function initRadar() {
  // Create radar widget if it doesn't exist
  if (!document.querySelector('.radar-widget')) {
    createRadarWidget();
  }
  
  // Get DOM elements
  radarWidget = document.querySelector('.radar-widget');
  radarToggle = document.querySelector('.radar-toggle');
  radarScreen = document.querySelector('.radar-screen');
  radarSweep = document.querySelector('.radar-sweep');
  radarCenter = document.querySelector('.radar-center');
  
  // Set up event listeners
  if (radarToggle) {
    radarToggle.addEventListener('click', toggleRadar);
  }
  
  // Start radar if enabled
  if (radarConfig.enabled) {
    startRadar();
  }
  
  console.log('Radar module initialized');
}

// Create radar widget DOM elements
function createRadarWidget() {
  const widget = document.createElement('div');
  widget.className = 'radar-widget';
  if (radarConfig.minimized) {
    widget.classList.add('minimized');
  }
  
  widget.innerHTML = `
    <div class="radar-screen">
      <div class="radar-sweep"></div>
      <div class="radar-center"></div>
      <div class="radar-ring radar-ring-1"></div>
      <div class="radar-ring radar-ring-2"></div>
      <div class="radar-ring radar-ring-3"></div>
    </div>
    <div class="radar-toggle">
      <span class="radar-toggle-icon">📡</span>
    </div>
  `;
  
  document.body.appendChild(widget);
}

// Toggle radar widget (minimize/maximize)
function toggleRadar() {
  if (!radarWidget) return;
  
  radarWidget.classList.toggle('minimized');
  radarConfig.minimized = radarWidget.classList.contains('minimized');
  
  // Save preference to local storage
  localStorage.setItem('radar_minimized', radarConfig.minimized);
}

// Start radar functionality
function startRadar() {
  // Load preferences from local storage
  const savedMinimized = localStorage.getItem('radar_minimized');
  if (savedMinimized !== null) {
    radarConfig.minimized = savedMinimized === 'true';
    if (radarWidget) {
      radarWidget.classList.toggle('minimized', radarConfig.minimized);
    }
  }
  
  // Get current position
  getCurrentPosition();
  
  // Start listening for nearby users
  startNearbyUsersListener();
  
  // Set up periodic position updates
  setInterval(() => {
    getCurrentPosition();
  }, radarConfig.updateInterval);
}

// Get current user position
function getCurrentPosition() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        currentPosition = { latitude, longitude };
        
        // Update user position in Firestore if authenticated
        updateUserPosition(currentPosition);
      },
      error => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache location for 1 minute
      }
    );
  }
}

// Update user position in Firestore
function updateUserPosition(position) {
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Update user document with current position
  db.collection('users').doc(user.uid).update({
    position: {
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }
  }).catch(error => {
    console.error('Error updating user position:', error);
  });
}

// Start listening for nearby users
function startNearbyUsersListener() {
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Listen for users with position data
  const unsubscribe = db.collection('users')
    .where('online', '==', true)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        const userData = change.doc.data();
        
        // Skip current user
        if (change.doc.id === user.uid) return;
        
        // Process user data
        if (change.type === 'added' || change.type === 'modified') {
          if (userData.position) {
            // Add or update user position
            userPositions.set(change.doc.id, {
              uid: change.doc.id,
              displayName: userData.displayName || 'Anonymous',
              photoURL: userData.photoURL,
              position: userData.position,
              lastSeen: Date.now()
            });
          }
        } else if (change.type === 'removed') {
          // Remove user position
          userPositions.delete(change.doc.id);
        }
      });
      
      // Update radar display
      updateRadarDisplay();
    }, error => {
      console.error('Error listening for nearby users:', error);
    });
  
  // Store unsubscribe function for cleanup
  window.radarUnsubscribe = unsubscribe;
  
  // Clean up old blips periodically
  setInterval(cleanupOldBlips, 10000); // Every 10 seconds
}

// Update radar display with nearby users
function updateRadarDisplay() {
  if (!radarScreen || !currentPosition) return;
  
  // Clear existing blips
  clearBlips();
  
  // Calculate distances and add blips for nearby users
  const nearbyUsers = [];
  
  userPositions.forEach(user => {
    if (!user.position || !user.position.latitude || !user.position.longitude) return;
    
    // Calculate distance
    const distance = calculateDistance(
      currentPosition.latitude,
      currentPosition.longitude,
      user.position.latitude,
      user.position.longitude
    );
    
    // Check if within range
    if (distance <= radarConfig.range) {
      nearbyUsers.push({
        ...user,
        distance: distance
      });
      
      // Check if this is a new nearby user for street pass
      checkStreetPass(user);
    }
  });
  
  // Sort by distance
  nearbyUsers.sort((a, b) => a.distance - b.distance);
  
  // Limit to max blips
  const blipsToShow = nearbyUsers.slice(0, radarConfig.maxBlips);
  
  // Add blips to radar
  blipsToShow.forEach(user => {
    addBlipToRadar(user);
  });
}

// Add a blip to the radar
function addBlipToRadar(user) {
  if (!radarScreen || !currentPosition) return;
  
  // Calculate position on radar
  const angle = calculateBearing(
    currentPosition.latitude,
    currentPosition.longitude,
    user.position.latitude,
    user.position.longitude
  );
  
  // Scale distance to fit on radar (0-100%)
  const scaledDistance = (user.distance / radarConfig.range) * 100;
  if (scaledDistance > 100) return; // Outside radar range
  
  // Convert polar to cartesian coordinates
  const x = 50 + Math.sin(angle * Math.PI / 180) * (scaledDistance / 2);
  const y = 50 - Math.cos(angle * Math.PI / 180) * (scaledDistance / 2);
  
  // Create blip element
  const blip = document.createElement('div');
  blip.className = 'radar-blip';
  blip.dataset.uid = user.uid;
  blip.style.left = `${x}%`;
  blip.style.top = `${y}%`;
  
  // Add tooltip with user info
  blip.title = `${user.displayName} (${Math.round(user.distance)}m)`;
  
  // Add to radar
  radarScreen.appendChild(blip);
  radarBlips.push(blip);
  
  // Add pulse animation
  blip.style.animation = 'radar-blip-pulse 2s infinite';
}

// Clear all blips from radar
function clearBlips() {
  radarBlips.forEach(blip => {
    if (blip.parentNode) {
      blip.parentNode.removeChild(blip);
    }
  });
  
  radarBlips = [];
}

// Clean up old user positions
function cleanupOldBlips() {
  const now = Date.now();
  
  userPositions.forEach((user, uid) => {
    // Remove users that haven't been seen for a while
    if (now - user.lastSeen > radarConfig.blipTimeout) {
      userPositions.delete(uid);
    }
  });
  
  // Update radar display
  updateRadarDisplay();
}

// Calculate distance between two coordinates in meters (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
}

// Calculate bearing between two coordinates in degrees
function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
