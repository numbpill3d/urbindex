// Urbindex - Map Module

// Map instance
let map;
let userMarker;
let locationMarkers = {};
let currentPosition = null;

// Map configuration
const mapConfig = {
  initialView: [40.7128, -74.0060], // Default to New York City
  initialZoom: 13,
  maxZoom: 19,
  minZoom: 3,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Urbindex',
  cyberpunkStyle: true // Enable custom cyberpunk styling
};

// Custom marker icons
const markerIcons = {
  // User marker
  user: createCustomIcon('user'),
  
  // Category markers
  abandoned: createCustomIcon('abandoned'),
  historical: createCustomIcon('historical'),
  'street-art': createCustomIcon('street-art'),
  viewpoint: createCustomIcon('viewpoint'),
  'hidden-gem': createCustomIcon('hidden-gem'),
  other: createCustomIcon('other'),
  
  // Location type markers
  water: createCustomIcon('water'),
  building: createCustomIcon('building'),
  power: createCustomIcon('power'),
  camp: createCustomIcon('camp'),
  geocache: createCustomIcon('geocache'),
  
  // Risk level markers (used for border color)
  safe: '#39ff14', // Neon green
  questionable: '#fee440', // Yellow
  unknown: '#b3b3cc', // Gray
  hot: '#ff9f1c', // Orange
  'high-risk': '#ff2a6d' // Neon pink
};

// Online users for marquee
let onlineUsers = [];

// Initialize map
function initMap() {
  // Create map instance
  map = L.map('map', {
    zoomControl: false, // We'll add it manually in a better position for mobile
    attributionControl: true,
    maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    maxBoundsViscosity: 1.0
  }).setView(mapConfig.initialView, mapConfig.initialZoom);

  // Add custom zoom control to bottom right
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // Add tile layer with cyberpunk styling if enabled
  if (mapConfig.cyberpunkStyle) {
    // Apply custom styling to the map tiles
    L.tileLayer(mapConfig.tileLayer, {
      attribution: mapConfig.attribution,
      maxZoom: mapConfig.maxZoom,
      minZoom: mapConfig.minZoom,
      className: 'cyberpunk-map-tiles'
    }).addTo(map);

    // Apply custom CSS filter to the map
    document.querySelector('#map').classList.add('cyberpunk-filter');
  } else {
    // Standard map tiles
    L.tileLayer(mapConfig.tileLayer, {
      attribution: mapConfig.attribution,
      maxZoom: mapConfig.maxZoom,
      minZoom: mapConfig.minZoom
    }).addTo(map);
  }

  // Set up event listeners
  map.on('click', onMapClick);
  
  // Get user's location
  getUserLocation();
  
  // Set up event listeners for location-related events
  document.addEventListener('user-signed-in', (event) => {
    // Load user's locations when signed in
    loadLocations();
    
    // Add user to online users
    const user = event.detail;
    addOnlineUser(user);
  });
  
  document.addEventListener('user-signed-out', () => {
    // Clear user-specific markers when signed out
    clearUserSpecificMarkers();
    
    // Remove user from online users
    removeOnlineUser(authModule.getCurrentUser());
  });
  
  // Add location button event listener
  document.getElementById('add-location-btn').addEventListener('click', () => {
    if (!authModule.isAuthenticated()) {
      alert('Please sign in to add locations');
      return;
    }
    
    if (currentPosition) {
      openAddLocationModal(currentPosition);
    } else {
      getUserLocation().then(position => {
        if (position) {
          openAddLocationModal(position);
        } else {
          alert('Unable to get your current location. Please try again or click on the map to select a location.');
        }
      });
    }
  });
  
  // Set up chat functionality
  initChat();
  
  // Initialize activity feed
  initActivityFeed();
  
  // Start particle effects
  initParticleEffects();
}

// Initialize particle effects
function initParticleEffects() {
  const titleContainer = document.querySelector('.ascii-title-container');
  if (!titleContainer) return;
  
  // Create particles at random intervals
  setInterval(() => {
    createParticle(titleContainer);
  }, 300);
}

// Create a single particle
function createParticle(container) {
  const particle = document.createElement('div');
  particle.className = 'particle';
  
  // Random position within the container
  const x = Math.random() * container.offsetWidth;
  const y = Math.random() * container.offsetHeight;
  
  // Random size
  const size = Math.random() * 5 + 2;
  
  // Random color
  const colors = ['#05d9e8', '#ff2a6d', '#39ff14', '#9d4edd'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  // Set styles
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;
  particle.style.backgroundColor = color;
  
  // Add to container
  container.appendChild(particle);
  
  // Remove after animation completes
  setTimeout(() => {
    container.removeChild(particle);
  }, 1500);
}

// Initialize chat functionality
function initChat() {
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  
  if (!chatInput || !chatSendBtn) return;
  
  // Send message on button click
  chatSendBtn.addEventListener('click', () => {
    sendChatMessage();
  });
  
  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
  
  // Listen for new messages
  listenForChatMessages();
}

// Send chat message
function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  const message = chatInput.value.trim();
  
  if (!message) return;
  
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to chat');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  // Add message to Firestore
  db.collection('chat').add({
    text: message,
    userId: user.uid,
    userName: user.displayName || 'Anonymous',
    userPhotoURL: user.photoURL || null,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    // Clear input
    chatInput.value = '';
  })
  .catch(error => {
    console.error('Error sending message:', error);
  });
}

// Listen for new chat messages
function listenForChatMessages() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  // Listen for new messages
  db.collection('chat')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      // Clear messages container
      chatMessages.innerHTML = '';
      
      // Add messages in reverse order (newest at bottom)
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      
      // Reverse to show oldest first
      messages.reverse().forEach(message => {
        addChatMessage(message);
      });
      
      // Scroll to bottom
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Add a chat message to the UI
function addChatMessage(message) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  const messageEl = document.createElement('div');
  messageEl.className = 'chat-message';
  
  // Format timestamp
  let timeString = 'Just now';
  if (message.timestamp) {
    if (message.timestamp.toDate) {
      const date = message.timestamp.toDate();
      timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  
  // Create message HTML
  messageEl.innerHTML = `
    <span class="chat-user">${message.userName}:</span>
    <span class="chat-text">${message.text}</span>
    <span class="chat-time">${timeString}</span>
  `;
  
  // Add to container
  chatMessages.appendChild(messageEl);
}

// Initialize activity feed
function initActivityFeed() {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  // Listen for new locations
  db.collection('locations')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .onSnapshot(snapshot => {
      // Clear feed container
      feedList.innerHTML = '';
      
      if (snapshot.empty) {
        feedList.innerHTML = '<li class="feed-item">No recent activity</li>';
        return;
      }
      
      // Add locations to feed
      snapshot.forEach(doc => {
        const locationData = doc.data();
        addActivityFeedItem(doc.id, locationData);
      });
    });
}

// Add an item to the activity feed
function addActivityFeedItem(id, locationData) {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  const feedItem = document.createElement('li');
  feedItem.className = 'feed-item';
  
  // Format date
  let dateDisplay = 'Just now';
  if (locationData.createdAt && locationData.createdAt.toDate) {
    const date = locationData.createdAt.toDate();
    dateDisplay = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Get risk level indicator
  const riskLevel = locationData.riskLevel || 'unknown';
  const riskIndicator = `<span class="risk-indicator risk-${riskLevel}">${getRiskLabel(riskLevel)}</span>`;
  
  // Create feed item HTML
  feedItem.innerHTML = `
    <div class="feed-item-header">
      <h4>${locationData.name}</h4>
      ${riskIndicator}
    </div>
    <p class="feed-item-description">${locationData.description || 'No description'}</p>
    <div class="feed-item-meta">
      <span class="feed-item-date">${dateDisplay}</span>
      <button class="view-on-map-btn" data-id="${id}">View</button>
    </div>
  `;
  
  // Add click event to view on map button
  const viewBtn = feedItem.querySelector('.view-on-map-btn');
  viewBtn.addEventListener('click', () => {
    // Center map on this location
    if (map && locationData.coordinates) {
      const lat = locationData.coordinates.latitude;
      const lng = locationData.coordinates.longitude;
      
      map.setView([lat, lng], 16);
      
      // Open the popup if marker exists
      if (locationMarkers && locationMarkers[id]) {
        locationMarkers[id].openPopup();
      }
    }
  });
  
  // Add to feed
  feedList.appendChild(feedItem);
}

// Add user to online users
function addOnlineUser(user) {
  if (!user) return;
  
  // Check if user is already in the list
  const existingUser = onlineUsers.find(u => u.uid === user.uid);
  if (existingUser) return;
  
  // Add user to list
  onlineUsers.push({
    uid: user.uid,
    displayName: user.displayName || 'Anonymous',
    photoURL: user.photoURL || null
  });
  
  // Update marquee
  updateOnlineUsersMarquee();
}

// Remove user from online users
function removeOnlineUser(user) {
  if (!user) return;
  
  // Remove user from list
  onlineUsers = onlineUsers.filter(u => u.uid !== user.uid);
  
  // Update marquee
  updateOnlineUsersMarquee();
}

// Update online users marquee
function updateOnlineUsersMarquee() {
  const onlineUsersList = document.getElementById('online-users-list');
  if (!onlineUsersList) return;
  
  if (onlineUsers.length === 0) {
    onlineUsersList.textContent = 'No users online';
    return;
  }
  
  // Create user list text
  const userNames = onlineUsers.map(user => user.displayName).join(', ');
  onlineUsersList.textContent = userNames;
}

// Get user's current location
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          currentPosition = { lat: latitude, lng: longitude };
          
          // Center map on user's location
          map.setView([latitude, longitude], mapConfig.initialZoom);
          
          // Add or update user marker
          if (userMarker) {
            userMarker.setLatLng([latitude, longitude]);
          } else {
            userMarker = L.marker([latitude, longitude], {
              icon: markerIcons.user,
              zIndexOffset: 1000
            }).addTo(map);
            
            userMarker.bindPopup('<strong>Your Location</strong>').openPopup();
          }
          
          resolve(currentPosition);
        },
        error => {
          console.error('Error getting location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      console.warn('Geolocation is not supported by this browser');
      resolve(null);
    }
  });
}

// Handle map click event
function onMapClick(e) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to add locations');
    return;
  }
  
  const { lat, lng } = e.latlng;
  openAddLocationModal({ lat, lng });
}

// Open add location modal
function openAddLocationModal(position) {
  // Set coordinates in the form
  document.getElementById('location-lat').textContent = position.lat.toFixed(6);
  document.getElementById('location-lng').textContent = position.lng.toFixed(6);
  
  // Set modal title
  document.getElementById('modal-title').textContent = 'Add New Location';
  
  // Reset form
  document.getElementById('location-form').reset();
  
  // Clear image preview container
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) {
    previewContainer.innerHTML = '';
  }
  
  // Store coordinates in form data attribute
  document.getElementById('location-form').dataset.lat = position.lat;
  document.getElementById('location-form').dataset.lng = position.lng;
  
  // Show modal
  document.getElementById('location-modal').classList.add('active');
  
  // Set up form submission
  document.getElementById('location-form').onsubmit = locationsModule.saveLocation;
}

// Load locations from Firestore
function loadLocations() {
  // Clear existing markers
  clearLocationMarkers();
  
  // Query Firestore for locations
  locationsRef.get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const locationData = doc.data();
        
        // Add marker to map
        addLocationMarker({
          id: doc.id,
          ...locationData,
          coordinates: { 
    abandoned: '#ff2a6d', // Neon pink
    historical: '#05d9e8', // Neon blue
    'street-art': '#9d4edd', // Neon purple
    viewpoint: '#fee440', // Yellow
    'hidden-gem': '#f15bb5', // Pink
    other: '#ffffff' // White
  };
  
  // Get color for this type
  const color = colors[type] || colors.other;
  
  // Create icon with CSS-based glow effect
  return L.divIcon({
    className: `custom-marker marker-${type}`,
    html: `<div style="background-color: ${color}; box-shadow: 0 0 10px ${color}, 0 0 5px ${color}; display: flex; justify-content: center; align-items: center; border-radius: 50%; width: 100%; height: 100%; border: 2px solid white;">${type === 'user' ? '📍' : ''}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

// Get human-readable category label
function getCategoryLabel(category) {
  const labels = {
    abandoned: 'Abandoned',
    historical: 'Historical',
    'street-art': 'Street Art',
    viewpoint: 'Viewpoint',
    'hidden-gem': 'Hidden Gem',
    other: 'Other'
  };
  
  return labels[category] || 'Other';
}

// Show offline indicator
function showOfflineIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'offline-indicator active';
  indicator.textContent = 'Location saved offline. Will sync when online.';
  document.body.appendChild(indicator);
  
  // Hide after 5 seconds
  setTimeout(() => {
    indicator.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(indicator);
    }, 500);
  }, 5000);
}

// Export functions for use in other modules
window.mapModule = {
  initMap,
  getUserLocation,
  loadLocations,
  clearLocationMarkers
};
