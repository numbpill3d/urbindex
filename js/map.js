// Urbindex - Map Module

// Map instance
let map;
let userMarker;
let locationMarkers = {};
let currentPosition = null;
let onlineUsers = [];

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

// Initialize map
function initMap() {
  // Create map instance
  map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    maxBoundsViscosity: 1.0
  }).setView(mapConfig.initialView, mapConfig.initialZoom);

  // Add custom zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Add tile layer with cyberpunk styling if enabled
  if (mapConfig.cyberpunkStyle) {
    L.tileLayer(mapConfig.tileLayer, {
      attribution: mapConfig.attribution,
      maxZoom: mapConfig.maxZoom,
      minZoom: mapConfig.minZoom,
      className: 'cyberpunk-map-tiles'
    }).addTo(map);
    document.querySelector('#map').classList.add('cyberpunk-filter');
  } else {
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
    loadLocations();
    addOnlineUser(event.detail);
    // These functions are now in app.js and will be called from there
  });
  
  document.addEventListener('user-signed-out', () => {
    clearUserSpecificMarkers();
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
}

// Add an item to the activity feed
function addActivityFeedItem(id, locationData) {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  const feedItem = document.createElement('li');
  feedItem.className = 'feed-item';
  
  let dateDisplay = 'Just now';
  if (locationData.createdAt) {
    dateDisplay = utilsModule.formatDate(locationData.createdAt, true);
  }
  
  const riskLevel = locationData.riskLevel || 'unknown';
  const riskIndicator = `<span class="risk-indicator risk-${riskLevel}">${utilsModule.getRiskLabel(riskLevel)}</span>`;
  
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
  
  const viewBtn = feedItem.querySelector('.view-on-map-btn');
  viewBtn.addEventListener('click', () => {
    if (map && locationData.coordinates) {
      const lat = locationData.coordinates.latitude;
      const lng = locationData.coordinates.longitude;
      
      map.setView([lat, lng], 16);
      
      if (locationMarkers && locationMarkers[id]) {
        locationMarkers[id].openPopup();
      }
    }
  });
  
  feedList.appendChild(feedItem);
}

// Add user to online users
function addOnlineUser(user) {
  if (!user) return;
  
  const existingUser = onlineUsers.find(u => u.uid === user.uid);
  if (existingUser) return;
  
  onlineUsers.push({
    uid: user.uid,
    displayName: user.displayName || 'Anonymous',
    photoURL: user.photoURL || null
  });
  
  updateOnlineUsersMarquee();
}

// Remove user from online users
function removeOnlineUser(user) {
  if (!user) return;
  
  onlineUsers = onlineUsers.filter(u => u.uid !== user.uid);
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
          
          map.setView([latitude, longitude], mapConfig.initialZoom);
          
          if (userMarker) {
            userMarker.setLatLng([latitude, longitude]);
          } else {
            userMarker = L.marker([latitude, longitude], {
              icon: createCustomIcon('user'),
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
  document.getElementById('location-lat').textContent = position.lat.toFixed(6);
  document.getElementById('location-lng').textContent = position.lng.toFixed(6);
  document.getElementById('modal-title').textContent = 'Add New Location';
  document.getElementById('location-form').reset();
  
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) {
    previewContainer.innerHTML = '';
  }
  
  document.getElementById('location-form').dataset.lat = position.lat;
  document.getElementById('location-form').dataset.lng = position.lng;
  document.getElementById('location-modal').classList.add('active');
  document.getElementById('location-form').onsubmit = locationsModule.saveLocation;
}

// Load locations from Firestore
function loadLocations() {
  clearLocationMarkers();
  
  locationsRef.get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const locationData = doc.data();
        
        addLocationMarker({
          id: doc.id,
          ...locationData,
          coordinates: { 
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          }
        });
      });
    })
    .catch(error => {
      console.error('Error loading locations:', error);
    });
    
  loadOfflineLocations().then(offlineLocations => {
    offlineLocations.forEach(location => {
      addLocationMarker({
        ...location,
        coordinates: { 
          lat: location.coordinates.latitude, 
          lng: location.coordinates.longitude 
        },
        isOffline: true
      });
    });
  });
}

// Add location marker to map
function addLocationMarker(location) {
  let iconType = location.category || 'other';
  
  if (location.locationType && location.locationType !== 'default') {
    iconType = location.locationType;
  }
  
  const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
    icon: createCustomIcon(iconType)
  });
  
  const riskLevel = location.riskLevel || 'unknown';
  
  let popupContent = `
    <div class="location-popup">
      <div class="location-popup-header">
        <h3>${location.name}</h3>
        <div class="location-badges">
          <span class="location-category">${utilsModule.getCategoryLabel(location.category)}</span>
          <span class="risk-indicator risk-${riskLevel}">${utilsModule.getRiskLabel(riskLevel)}</span>
        </div>
      </div>
  `;
  
  if (location.description) {
    popupContent += `<p class="location-description">${location.description}</p>`;
  }
  
  if (location.notes) {
    popupContent += `<p class="location-notes"><strong>Notes:</strong> ${location.notes}</p>`;
  }
  
  if (location.imageUrls && location.imageUrls.length > 0) {
    popupContent += `<div class="location-images">`;
    location.imageUrls.forEach(url => {
      popupContent += `<img src="${url}" alt="${location.name}" class="location-image">`;
    });
    popupContent += `</div>`;
  } else if (location.imageUrl) {
    popupContent += `<img src="${location.imageUrl}" alt="${location.name}" class="location-image">`;
  }
  
  popupContent += `
    <div class="star-rating" data-id="${location.id}">
      <span class="star" data-rating="1">★</span>
      <span class="star" data-rating="2">★</span>
      <span class="star" data-rating="3">★</span>
      <span class="star" data-rating="4">★</span>
      <span class="star" data-rating="5">★</span>
      <span class="rating-value">${location.rating ? location.rating.toFixed(1) : '0.0'}</span>
      <span class="rating-count">(${location.ratingCount || 0})</span>
    </div>
    
    <div class="rating-container">
      <button class="rating-btn upvote" data-id="${location.id}" data-action="upvote">👍</button>
      <span class="rating-count">${location.upvotes || 0}</span>
      <button class="rating-btn downvote" data-id="${location.id}" data-action="downvote">👎</button>
      <span class="rating-count">${location.downvotes || 0}</span>
    </div>
  `;
  
  if (location.claimedBy) {
    popupContent += `
      <div class="territory-owner">
        <span>Claimed by: </span>
        <span class="territory-owner-name">${location.claimedBy}</span>
      </div>
    `;
  } else {
    popupContent += `
      <button class="claim-territory-btn neon-button" data-id="${location.id}">Claim Territory</button>
    `;
  }
  
  popupContent += `
    <div class="comments-section">
      <h4>Comments</h4>
      <div class="comments-container" data-id="${location.id}">
        <p class="loading-comments">Loading comments...</p>
      </div>
      <div class="comment-form">
        <textarea class="comment-input" placeholder="Add a comment..."></textarea>
        <button class="comment-submit-btn neon-button" data-id="${location.id}">Post</button>
      </div>
    </div>
  `;
  
  if (location.isOffline) {
    popupContent += `<p class="offline-badge">Saved Offline</p>`;
  }
  
  popupContent += `</div>`;
  
  marker.bindPopup(popupContent, {
    maxWidth: 300,
    minWidth: 200
  });
  
  marker.addTo(map);
  locationMarkers[location.id] = marker;
  
  marker.on('popupopen', () => {
    setTimeout(() => {
      setupPopupEventListeners(location.id);
      loadComments(location.id);
    }, 100);
  });
  
  return marker;
}

// Set up event listeners for popup elements
function setupPopupEventListeners(locationId) {
  // Rating buttons
  const upvoteBtn = document.querySelector(`.rating-btn.upvote[data-id="${locationId}"]`);
  const downvoteBtn = document.querySelector(`.rating-btn.downvote[data-id="${locationId}"]`);
  
  if (upvoteBtn) {
    upvoteBtn.addEventListener('click', () => rateLocation(locationId, 'upvote'));
  }
  
  if (downvoteBtn) {
    downvoteBtn.addEventListener('click', () => rateLocation(locationId, 'downvote'));
  }
  
  // Star rating
  const stars = document.querySelectorAll(`.star-rating[data-id="${locationId}"] .star`);
  stars.forEach(star => {
    star.addEventListener('click', (e) => {
      const rating = parseInt(e.target.dataset.rating);
      rateLocationWithStars(locationId, rating);
    });
  });
  
  // Claim territory button
  const claimBtn = document.querySelector(`.claim-territory-btn[data-id="${locationId}"]`);
  if (claimBtn) {
    claimBtn.addEventListener('click', () => claimTerritory(locationId));
  }
  
  // Comment submit button
  const commentBtn = document.querySelector(`.comment-submit-btn[data-id="${locationId}"]`);
  const commentInput = commentBtn?.parentElement.querySelector('.comment-input');
  
  if (commentBtn && commentInput) {
    commentBtn.addEventListener('click', () => {
      const text = commentInput.value.trim();
      if (text) {
        addComment(locationId, text).then(success => {
          if (success) {
            commentInput.value = '';
            loadComments(locationId);
          }
        });
      }
    });
  }
}

// Load comments for a location
function loadComments(locationId) {
  const commentsContainer = document.querySelector(`.comments-container[data-id="${locationId}"]`);
  if (!commentsContainer) return;
  
  commentsContainer.innerHTML = '<p class="loading-comments">Loading comments...</p>';
  
  locationsModule.loadComments(locationId).then(comments => {
    commentsContainer.innerHTML = '';
    
    if (comments.length === 0) {
      commentsContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
      return;
    }
    
    comments.forEach(comment => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      
      let dateDisplay = 'Just now';
      if (comment.createdAt) {
        dateDisplay = utilsModule.formatDate(comment.createdAt, true);
      }
      
      commentEl.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.userDisplayName}</span>
          <span class="comment-date">${dateDisplay}</span>
        </div>
        <div class="comment-content">${comment.text}</div>
      `;
      
      commentsContainer.appendChild(commentEl);
    });
  });
}

// Add a comment to a location
function addComment(locationId, text) {
  return locationsModule.addComment(locationId, text);
}

// Claim territory
function claimTerritory(locationId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to claim territories');
    return;
  }
  
  if (locationId.startsWith('temp-')) {
    alert('You cannot claim offline locations');
    return;
  }
  
  locationsModule.claimLocation(locationId).then(success => {
    if (success) {
      refreshLocationMarker(locationId);
    }
  });
}

// Rate a location with stars
function rateLocationWithStars(locationId, rating) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to rate locations');
    return;
  }
  
  if (locationId.startsWith('temp-')) {
    alert('You cannot rate offline locations');
    return;
  }
  
  locationsModule.rateLocationWithStars(locationId, rating).then(success => {
    if (success) {
      updateStarRatingUI(locationId, rating);
    }
  });
}

// Update star rating UI
function updateStarRatingUI(locationId, rating) {
  const stars = document.querySelectorAll(`.star-rating[data-id="${locationId}"] .star`);
  stars.forEach(star => {
    const starRating = parseInt(star.dataset.rating);
    if (starRating <= rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
  
  locationsRef.doc(locationId).get().then(doc => {
    if (doc.exists) {
      const locationData = doc.data();
      
      const ratingValue = document.querySelector(`.star-rating[data-id="${locationId}"] .rating-value`);
      const ratingCount = document.querySelector(`.star-rating[data-id="${locationId}"] .rating-count`);
      
      if (ratingValue) {
        ratingValue.textContent = locationData.rating.toFixed(1);
      }
      
      if (ratingCount) {
        ratingCount.textContent = `(${locationData.ratingCount})`;
      }
    }
  });
}

// Rate a location with thumbs up/down
function rateLocation(locationId, action) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to rate locations');
    return;
  }
  
  if (locationId.startsWith('temp-')) {
    alert('You cannot rate locations that are saved offline');
    return;
  }
  
  const user = authModule.getCurrentUser();
  const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}`);
  
  ratingRef.get()
    .then(doc => {
      const batch = db.batch();
      
      if (doc.exists) {
        const currentRating = doc.data().type;
        
        if (currentRating === action) {
          // User is removing their rating
          batch.delete(ratingRef);
          
          // Update location rating count
          const locationRef = locationsRef.doc(locationId);
          batch.update(locationRef, {
            [`${action}s`]: firebase.firestore.FieldValue.increment(-1)
          });
        } else {
          // User is changing their rating
          batch.update(ratingRef, {
            type: action,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Update location rating counts
          const locationRef = locationsRef.doc(locationId);
          batch.update(locationRef, {
            [`${action}s`]: firebase.firestore.FieldValue.increment(1),
            [`${currentRating}s`]: firebase.firestore.FieldValue.increment(-1)
          });
        }
      } else {
        // New rating
        batch.set(ratingRef, {
          type: action,
          userId: user.uid,
          locationId: locationId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update location rating count
        const locationRef = locationsRef.doc(locationId);
        batch.update(locationRef, {
          [`${action}s`]: firebase.firestore.FieldValue.increment(1)
        });
      }
      
      // Commit the batch
      return batch.commit();
    })
    .then(() => {
      refreshLocationMarker(locationId);
    })
    .catch(error => {
      console.error('Error rating location:', error);
    });
}

// Refresh location marker after updates
function refreshLocationMarker(locationId) {
  locationsRef.doc(locationId).get().then(doc => {
    if (doc.exists) {
      const locationData = doc.data();
      
      // Update marker popup
      const marker = locationMarkers[locationId];
      if (marker) {
        marker.closePopup();
        
        // Remove marker from map
        map.removeLayer(marker);
        
        // Re-add marker with updated data
        addLocationMarker({
          id: locationId,
          ...locationData,
          coordinates: { 
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          }
        });
        
        // Open popup
        locationMarkers[locationId].openPopup();
      }
    }
  });
}

// Clear location markers
function clearLocationMarkers() {
  Object.values(locationMarkers).forEach(marker => {
    map.removeLayer(marker);
  });
  
  locationMarkers = {};
}

// Clear user-specific markers
function clearUserSpecificMarkers() {
  // Implementation depends on your requirements
}

// Create custom icon for markers
function createCustomIcon(type, color) {
  // Define colors for different categories
  const colors = {
    user: '#39ff14', // Neon green
    abandoned: '#ff2a6d', // Neon pink
    historical: '#05d9e8', // Neon blue
    'street-art': '#9d4edd', // Neon purple
    viewpoint: '#fee440', // Yellow
    'hidden-gem': '#f15bb5', // Pink
    water: '#05d9e8', // Neon blue
    building: '#ff2a6d', // Neon pink
    power: '#39ff14', // Neon green
    camp: '#9d4edd', // Neon purple
    geocache: '#fee440', // Yellow
    other: '#ffffff' // White
  };
  
  // Get color for this type
  const iconColor = color || colors[type] || colors.other;
  
  // Create icon with CSS-based glow effect
  return L.divIcon({
    className: `custom-marker marker-${type}`,
    html: `<div style="background-color: ${iconColor}; box-shadow: 0 0 10px ${iconColor}, 0 0 5px ${iconColor}; display: flex; justify-content: center; align-items: center; border-radius: 50%; width: 100%; height: 100%; border: 2px solid white;">${type === 'user' ? '📍' : ''}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
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
  clearLocationMarkers,
  addLocationMarker
};
