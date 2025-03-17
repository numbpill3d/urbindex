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
let userPosition = null;

// Street pass history
let streetPassHistory = [];

// Initialize radar widget
function initRadar() {
  try {
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
    
    // Add radar styles
    addRadarStyles();
    
    // Start radar if enabled
    if (radarConfig.enabled) {
      startRadar();
    }
    
    console.log('Radar module initialized');
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing radar module:', error);
    return Promise.reject(error);
  }
}

// Add radar styles
function addRadarStyles() {
  // Check if styles already exist
  if (document.getElementById('radar-styles')) return;
  
  // Create style element
  const style = document.createElement('style');
  style.id = 'radar-styles';
  
  // Add radar styles
  style.textContent = `
    .radar-widget {
      position: absolute;
      bottom: 70px;
      left: 20px;
      width: 150px;
      height: 150px;
      z-index: 1000;
      transition: all 0.3s ease;
    }
    
    .radar-widget.minimized {
      width: 40px;
      height: 40px;
    }
    
    .radar-screen {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: rgba(10, 10, 32, 0.7);
      border: 2px solid var(--neon-blue);
      box-shadow: 0 0 10px rgba(5, 217, 232, 0.5);
      position: relative;
      overflow: hidden;
    }
    
    .radar-sweep {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%);
      background: linear-gradient(90deg, rgba(5, 217, 232, 0.1) 0%, rgba(5, 217, 232, 0.3) 100%);
      transform-origin: center;
      animation: radar-sweep 4s infinite linear;
    }
    
    @keyframes radar-sweep {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
    
    .radar-center {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 6px;
      height: 6px;
      background-color: var(--neon-blue);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 5px var(--neon-blue);
    }
    
    .radar-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      border-radius: 50%;
      border: 1px solid rgba(5, 217, 232, 0.3);
      transform: translate(-50%, -50%);
    }
    
    .radar-ring-1 {
      width: 33%;
      height: 33%;
    }
    
    .radar-ring-2 {
      width: 66%;
      height: 66%;
    }
    
    .radar-ring-3 {
      width: 100%;
      height: 100%;
    }
    
    .radar-blip {
      position: absolute;
      width: 6px;
      height: 6px;
      background-color: var(--neon-pink);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 5px var(--neon-pink);
    }
    
    @keyframes radar-blip-pulse {
      0% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.5);
        opacity: 0.5;
      }
      100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }
    }
    
    .radar-toggle {
      position: absolute;
      bottom: -10px;
      right: -10px;
      width: 30px;
      height: 30px;
      background-color: var(--neon-blue);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 0 5px var(--neon-blue);
      z-index: 1001;
    }
    
    .radar-toggle-icon {
      font-size: 16px;
    }
    
    .radar-widget.minimized .radar-screen {
      opacity: 0.5;
    }
    
    .street-pass-notification {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: rgba(10, 10, 32, 0.9);
      border: 1px solid var(--neon-pink);
      border-radius: 5px;
      padding: 10px 20px;
      box-shadow: 0 0 10px rgba(255, 42, 109, 0.5);
      color: var(--text-color);
      z-index: 2000;
      animation: notification-fade 4s forwards;
    }
    
    @keyframes notification-fade {
      0% {
        opacity: 0;
        transform: translate(-50%, 20px);
      }
      10% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      90% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -20px);
      }
    }
  `;
  
  // Add to document head
  document.head.appendChild(style);
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
        userPosition = { latitude, longitude };
        
        // Update user position in Firestore if authenticated
        updateUserPosition(userPosition);
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
  if (!radarScreen || !userPosition) return;
  
  // Clear existing blips
  clearBlips();
  
  // Calculate distances and add blips for nearby users
  const nearbyUsers = [];
  
  userPositions.forEach(user => {
    if (!user.position || !user.position.latitude || !user.position.longitude) return;
    
    // Calculate distance
    const distance = calculateDistance(
      userPosition.latitude,
      userPosition.longitude,
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
  if (!radarScreen || !userPosition) return;
  
  // Calculate position on radar
  const angle = calculateBearing(
    userPosition.latitude,
    userPosition.longitude,
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
  
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) -
            Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  
  let θ = Math.atan2(y, x);
  θ = θ * 180 / Math.PI; // Convert to degrees
  return (θ + 360) % 360; // Normalize to 0-360
}

// Check for street pass with another user
function checkStreetPass(user) {
  if (!userPosition || !user.position) return;
  
  // Calculate distance
  const distance = calculateDistance(
    userPosition.latitude,
    userPosition.longitude,
    user.position.latitude,
    user.position.longitude
  );
  
  // Check if close enough for street pass (within 10 meters)
  if (distance <= 10) {
    // Check if we've already passed this user recently
    const recentPass = streetPassHistory.find(pass => 
      pass.uid === user.uid && 
      (Date.now() - pass.timestamp) < 3600000 // Within the last hour
    );
    
    if (!recentPass) {
      // Record street pass
      const streetPass = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        timestamp: Date.now(),
        location: {
          latitude: userPosition.latitude,
          longitude: userPosition.longitude
        }
      };
      
      // Add to history
      streetPassHistory.unshift(streetPass);
      
      // Limit history to 50 entries
      if (streetPassHistory.length > 50) {
        streetPassHistory.pop();
      }
      
      // Save to database
      saveStreetPass(streetPass);
      
      // Show notification
      showStreetPassNotification(streetPass);
    }
  }
}

// Save street pass to database
function saveStreetPass(streetPass) {
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Add to Firestore
  db.collection('street_passes').add({
    userId: user.uid,
    passedUserId: streetPass.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    location: new firebase.firestore.GeoPoint(
      streetPass.location.latitude,
      streetPass.location.longitude
    )
  }).catch(error => {
    console.error('Error saving street pass:', error);
  });
}

// Show street pass notification
function showStreetPassNotification(streetPass) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'street-pass-notification';
  
  // Create notification content
  notification.innerHTML = `
    <div class="notification-content">
      <img src="${streetPass.photoURL || 'images/default-avatar.png'}" alt="${streetPass.displayName}" style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">
      <span>Street Pass with ${streetPass.displayName}</span>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Remove after animation
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 4000);
}

// Export functions for use in other modules
window.radarModule = {
  initRadar
};
