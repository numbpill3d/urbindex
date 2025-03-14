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
  initialZoom: 18, // Increased zoom level for much closer view
  maxZoom: 19,
  minZoom: 3,
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Urbindex',
  cyberpunkStyle: true, // Enable custom cyberpunk styling
  loadFullMap: true // Load all map tiles
};

// Initialize map with error handling and performance improvements
function initMap() {
  try {
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }
    
    // Create map instance with error handling
    map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
      maxBoundsViscosity: 1.0
    }).setView(mapConfig.initialView, mapConfig.initialZoom);

    // Add custom zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add tile layer with cyberpunk styling if enabled
    const tileLayerOptions = {
      attribution: mapConfig.attribution,
      maxZoom: mapConfig.maxZoom,
      minZoom: mapConfig.minZoom,
      updateWhenIdle: false,
      updateWhenZooming: true,
      keepBuffer: 5, // Increased buffer for better loading
      noWrap: false, // Allow map to wrap around the world
      bounds: mapConfig.loadFullMap ? null : undefined, // Load full map if enabled
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' // Transparent pixel for error tiles
    };
    
    if (mapConfig.cyberpunkStyle) {
      tileLayerOptions.className = 'cyberpunk-map-tiles';
      L.tileLayer(mapConfig.tileLayer, tileLayerOptions).addTo(map);
      mapContainer.classList.add('cyberpunk-filter');
    } else {
      L.tileLayer(mapConfig.tileLayer, tileLayerOptions).addTo(map);
    }
    
    // Initialize map tooltip
    initMapTooltip();

    // Set up event listeners
    map.on('click', onMapClick);
    
    // Set up event listeners for location-related events with proper error handling
    document.addEventListener('user-signed-in', (event) => {
      try {
        loadLocations();
        if (event.detail) {
          addOnlineUser(event.detail);
        }
      } catch (error) {
        console.error('Error handling user sign-in event:', error);
      }
    });
    
    document.addEventListener('user-signed-out', () => {
      try {
        clearUserSpecificMarkers();
        const currentUser = window.authModule?.getCurrentUser();
        if (currentUser) {
          removeOnlineUser(currentUser);
        }
      } catch (error) {
        console.error('Error handling user sign-out event:', error);
      }
    });
    
    // Add location button event listener
    const addLocationBtn = document.getElementById('add-location-btn');
    if (addLocationBtn) {
      addLocationBtn.addEventListener('click', () => {
        if (!window.authModule?.isAuthenticated()) {
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
          }).catch(error => {
            console.error('Error getting user location:', error);
            alert('Error getting your location. Please try clicking on the map to select a location.');
          });
        }
      });
    }
    
    // Get user's location
    getUserLocation().catch(error => {
      console.error('Error getting initial user location:', error);
    });
    
    // Update coordinates display on mouse move
    map.on('mousemove', (e) => {
      const coordsDisplay = document.getElementById('current-coordinates');
      if (coordsDisplay) {
        coordsDisplay.textContent = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
      }
    });
    
    // Update zoom level display on zoom
    map.on('zoomend', () => {
      const zoomDisplay = document.getElementById('current-zoom');
      if (zoomDisplay) {
        zoomDisplay.textContent = map.getZoom();
      }
    });
    
    console.log('Map initialized successfully');
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

// Add an item to the activity feed
function addActivityFeedItem(id, locationData) {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  const feedItem = document.createElement('li');
  feedItem.className = 'feed-item';
  
  let dateDisplay = 'Just now';
  if (locationData.createdAt) {
    dateDisplay = window.utilsModule?.formatDate?.(locationData.createdAt, true) || 'Recent';
  }
  
  const riskLevel = locationData.riskLevel || 'unknown';
  const riskLabel = window.utilsModule?.getRiskLabel?.(riskLevel) || riskLevel;
  const riskIndicator = `<span class="risk-indicator risk-${riskLevel}">${riskLabel}</span>`;
  
  // Sanitize user input to prevent XSS
  const name = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(locationData.name || 'Unnamed Location')
    : (locationData.name || 'Unnamed Location');
    
  const description = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(locationData.description || 'No description')
    : (locationData.description || 'No description');
  
  feedItem.innerHTML = `
    <div class="feed-item-header">
      <h4>${name}</h4>
      ${riskIndicator}
    </div>
    <p class="feed-item-description">${description}</p>
    <div class="feed-item-meta">
      <span class="feed-item-date">${dateDisplay}</span>
      <button class="view-on-map-btn" data-id="${id}">View</button>
    </div>
  `;
  
  const viewBtn = feedItem.querySelector('.view-on-map-btn');
  if (viewBtn) {
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
  }
  
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
  
  const userNames = onlineUsers.map(user => {
    // Sanitize user names to prevent XSS
    return typeof window.utilsModule?.sanitizeHtml === 'function'
      ? window.utilsModule.sanitizeHtml(user.displayName)
      : user.displayName;
  }).join(', ');
  
  onlineUsersList.textContent = userNames;
}

// Get user's current location with improved error handling
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error('Map not initialized'));
      return;
    }
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          try {
            const { latitude, longitude } = position.coords;
            currentPosition = { lat: latitude, lng: longitude };
            
            // Set view with higher zoom level for closer view
            map.setView([latitude, longitude], mapConfig.initialZoom);
            
            if (userMarker) {
              userMarker.setLatLng([latitude, longitude]);
            } else {
              userMarker = L.marker([latitude, longitude], {
                icon: createCustomIcon('user'),
                zIndexOffset: 1000
              }).addTo(map);
              
              userMarker.bindPopup('<strong>Your Location</strong>');
            }
            
            // Update coordinates display
            const coordsDisplay = document.getElementById('current-coordinates');
            if (coordsDisplay) {
              coordsDisplay.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            }
            
            resolve(currentPosition);
          } catch (error) {
            console.error('Error processing geolocation result:', error);
            reject(error);
          }
        },
        error => {
          console.error('Geolocation error:', error);
          let errorMessage = 'Unable to get your location';
          
          // Provide more specific error messages
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location services in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please try again later.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
          }
          
          // Show error message to user if offline module is available
          if (window.offlineModule?.showToast) {
            window.offlineModule.showToast(errorMessage, 'error');
          }
          
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000, // Increased timeout for better reliability
          maximumAge: 60000 // Cache location for 1 minute
        }
      );
    } else {
      const errorMessage = 'Geolocation is not supported by this browser';
      console.warn(errorMessage);
      
      // Show error message to user if offline module is available
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast(errorMessage, 'warning');
      }
      
      reject(new Error(errorMessage));
    }
  });
}

// Handle map click event
function onMapClick(e) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to add locations');
    return;
  }
  
  const { lat, lng } = e.latlng;
  openAddLocationModal({ lat, lng });
}

// Open add location modal
function openAddLocationModal(position) {
  const latElement = document.getElementById('location-lat');
  const lngElement = document.getElementById('location-lng');
  const modalTitle = document.getElementById('modal-title');
  const locationForm = document.getElementById('location-form');
  const locationModal = document.getElementById('location-modal');
  
  if (!latElement || !lngElement || !modalTitle || !locationForm || !locationModal) {
    console.error('Required modal elements not found');
    return;
  }
  
  latElement.textContent = position.lat.toFixed(6);
  lngElement.textContent = position.lng.toFixed(6);
  modalTitle.textContent = 'Add New Location';
  locationForm.reset();
  
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) {
    previewContainer.innerHTML = '';
  }
  
  locationForm.dataset.lat = position.lat;
  locationForm.dataset.lng = position.lng;
  locationModal.classList.add('active');
  
  if (window.locationsModule?.saveLocation) {
    locationForm.onsubmit = window.locationsModule.saveLocation;
  } else {
    console.warn('locationsModule.saveLocation not available');
  }
}

// Load locations from Firestore
function loadLocations() {
  clearLocationMarkers();
  
  // Create a custom event to notify that locations are being reloaded
  const reloadEvent = new CustomEvent('locations-reloaded');
  document.dispatchEvent(reloadEvent);
  
  // Load locations from Firestore
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
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error loading locations. Please try again.', 'error');
      }
    });
  
  // Load offline locations
  if (window.loadOfflineLocations) {
    window.loadOfflineLocations().then(offlineLocations => {
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
    }).catch(error => {
      console.error('Error loading offline locations:', error);
    });
  }
}

// Initialize map tooltip for hover information with performance improvements
function initMapTooltip() {
  try {
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'map-tooltip';
    document.body.appendChild(tooltip);
    
    // Cache for marker data to avoid repeated Firestore queries
    const markerDataCache = new Map();
    
    // Use a debounced function for mousemove to improve performance
    const debouncedMouseMove = debounce((e) => {
      // Check if mouse is over a marker
      const target = e.originalEvent.target;
      const isMarker = target.classList && (
        target.classList.contains('leaflet-marker-icon') || 
        target.closest('.leaflet-marker-icon')
      );
      
      if (isMarker) {
        // Get marker position
        const markerElement = target.classList.contains('leaflet-marker-icon') ? 
          target : target.closest('.leaflet-marker-icon');
        
        // Find marker data
        for (const [id, marker] of Object.entries(locationMarkers)) {
          if (marker._icon === markerElement) {
            // Check cache first
            if (markerDataCache.has(id)) {
              const data = markerDataCache.get(id);
              updateTooltip(data, e);
            } else {
              // Get location data from marker
              db.collection('locations').doc(id).get().then(doc => {
                if (doc.exists) {
                  const data = doc.data();
                  
                  // Cache the data for future use
                  markerDataCache.set(id, data);
                  
                  updateTooltip(data, e);
                }
              }).catch(error => {
                console.error('Error fetching location data for tooltip:', error);
              });
            }
            break;
          }
        }
      } else {
        // Hide tooltip if not over a marker
        tooltip.classList.remove('visible');
      }
    }, 50); // 50ms debounce
    
    // Helper function to update tooltip content and position
    function updateTooltip(data, e) {
      if (!data) return;
      
      // Sanitize data to prevent XSS
      const name = typeof window.utilsModule?.sanitizeHtml === 'function'
        ? window.utilsModule.sanitizeHtml(data.name || 'Unnamed Location')
        : (data.name || 'Unnamed Location');
        
      const category = data.category || 'other';
      const categoryLabel = window.utilsModule?.getCategoryLabel?.(category) || category;
      
      const description = data.description || '';
      const truncatedDescription = description.length > 50 
        ? description.substring(0, 50) + '...' 
        : description;
      
      const sanitizedDescription = typeof window.utilsModule?.sanitizeHtml === 'function'
        ? window.utilsModule.sanitizeHtml(truncatedDescription)
        : truncatedDescription;
      
      // Show tooltip
      tooltip.innerHTML = `
        <div class="map-tooltip-content">
          <strong>${name}</strong>
          <div>${categoryLabel}</div>
          ${sanitizedDescription ? `<div>${sanitizedDescription}</div>` : ''}
        </div>
      `;
      
      // Position tooltip with bounds checking to keep it on screen
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const tooltipWidth = tooltip.offsetWidth;
      const tooltipHeight = tooltip.offsetHeight;
      
      let left = e.originalEvent.clientX + 10;
      let top = e.originalEvent.clientY + 10;
      
      // Adjust if tooltip would go off right edge
      if (left + tooltipWidth > viewportWidth - 10) {
        left = e.originalEvent.clientX - tooltipWidth - 10;
      }
      
      // Adjust if tooltip would go off bottom edge
      if (top + tooltipHeight > viewportHeight - 10) {
        top = e.originalEvent.clientY - tooltipHeight - 10;
      }
      
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add('visible');
    }
    
    // Add mousemove event to map
    map.on('mousemove', debouncedMouseMove);
    
    // Hide tooltip when mouse leaves map
    map.getContainer().addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
    
    // Clear cache when locations are reloaded
    document.addEventListener('locations-reloaded', () => {
      markerDataCache.clear();
    });
    
    // Utility function for debouncing
    function debounce(func, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
    }
  } catch (error) {
    console.error('Error initializing map tooltip:', error);
  }
}

// Add location marker to map with improved security and error handling
function addLocationMarker(location) {
  try {
    if (!map) {
      console.error('Cannot add marker: Map not initialized');
      return null;
    }
    
    if (!location || !location.coordinates || 
        (typeof location.coordinates.lat === 'undefined') || 
        (typeof location.coordinates.lng === 'undefined')) {
      console.error('Invalid location data for marker:', location);
      return null;
    }
    
    let iconType = location.category || 'other';
    
    if (location.locationType && location.locationType !== 'default') {
      iconType = location.locationType;
    }
    
    const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
      icon: createCustomIcon(iconType)
    });
    
    const riskLevel = location.riskLevel || 'unknown';
    
    // Sanitize user-provided content to prevent XSS
    const sanitizeContent = (content) => {
      return typeof window.utilsModule?.sanitizeHtml === 'function'
        ? window.utilsModule.sanitizeHtml(content || '')
        : (content || '');
    };
    
    const name = sanitizeContent(location.name || 'Unnamed Location');
    const description = sanitizeContent(location.description || '');
    const notes = sanitizeContent(location.notes || '');
    const categoryLabel = window.utilsModule?.getCategoryLabel?.(location.category) || location.category || 'Other';
    const riskLabel = window.utilsModule?.getRiskLabel?.(riskLevel) || riskLevel;
    
    let popupContent = `
      <div class="location-popup">
        <div class="location-popup-header">
          <h3>${name}</h3>
          <div class="location-badges">
            <span class="location-category">${categoryLabel}</span>
            <span class="risk-indicator risk-${riskLevel}">${riskLabel}</span>
          </div>
        </div>
    `;
    
    if (description) {
      popupContent += `<p class="location-description">${description}</p>`;
    }
    
    if (notes) {
      popupContent += `<p class="location-notes"><strong>Notes:</strong> ${notes}</p>`;
    }
    
    // Safely handle images with error fallbacks
    if (location.imageUrls && Array.isArray(location.imageUrls) && location.imageUrls.length > 0) {
      popupContent += `<div class="location-images">`;
      location.imageUrls.forEach(url => {
        if (url && typeof url === 'string') {
          popupContent += `
            <img src="${url}" alt="${name}" class="location-image" 
                 onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20fill%3D%22%23ddd%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2210%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3EImage%20Error%3C%2Ftext%3E%3C%2Fsvg%3E';">
          `;
        }
      });
      popupContent += `</div>`;
    } else if (location.imageUrl && typeof location.imageUrl === 'string') {
      popupContent += `
        <img src="${location.imageUrl}" alt="${name}" class="location-image"
             onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%22100%22%3E%3Crect%20fill%3D%22%23ddd%22%20width%3D%22100%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23888%22%20font-family%3D%22sans-serif%22%20font-size%3D%2210%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dominant-baseline%3D%22middle%22%3EImage%20Error%3C%2Ftext%3E%3C%2Fsvg%3E';">
      `;
    }
    
    // Add ratings section
    const rating = location.rating ? parseFloat(location.rating).toFixed(1) : '0.0';
    const ratingCount = location.ratingCount || 0;
    const upvotes = location.upvotes || 0;
    const downvotes = location.downvotes || 0;
    
    popupContent += `
      <div class="star-rating" data-id="${location.id}">
        <span class="star" data-rating="1">★</span>
        <span class="star" data-rating="2">★</span>
        <span class="star" data-rating="3">★</span>
        <span class="star" data-rating="4">★</span>
        <span class="star" data-rating="5">★</span>
        <span class="rating-value">${rating}</span>
        <span class="rating-count">(${ratingCount})</span>
      </div>
      
      <div class="rating-container">
        <button class="rating-btn upvote" data-id="${location.id}" data-action="upvote">👍</button>
        <span class="rating-count">${upvotes}</span>
        <button class="rating-btn downvote" data-id="${location.id}" data-action="downvote">👎</button>
        <span class="rating-count">${downvotes}</span>
      </div>
    `;
    
    // Add territory information
    if (location.claimedBy) {
      const claimedBy = sanitizeContent(location.claimedBy);
      popupContent += `
        <div class="territory-owner">
          <span>Claimed by: </span>
          <span class="territory-owner-name">${claimedBy}</span>
        </div>
      `;
    } else {
      popupContent += `
        <button class="claim-territory-btn neon-button" data-id="${location.id}">Claim Territory</button>
      `;
    }
    
    // Add comments section
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
    
    // Add offline badge if needed
    if (location.isOffline) {
      popupContent += `<p class="offline-badge">Saved Offline</p>`;
    }
    
    popupContent += `</div>`;
    
    // Bind popup to marker
    marker.bindPopup(popupContent, {
      maxWidth: 300,
      minWidth: 200
    });
    
    // Add marker to map
    marker.addTo(map);
    locationMarkers[location.id] = marker;
    
    // Set up event listeners when popup opens
    marker.on('popupopen', () => {
      setTimeout(() => {
        setupPopupEventListeners(location.id);
        loadComments(location.id);
      }, 100);
    });
    
    return marker;
  } catch (error) {
    console.error('Error adding location marker:', error);
    return null;
  }
}

// Set up event listeners for popup elements
function setupPopupEventListeners(locationId) {
  try {
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
          }).catch(error => {
            console.error('Error adding comment:', error);
          });
        }
      });
    }
  } catch (error) {
    console.error('Error setting up popup event listeners:', error);
  }
}

// Load comments for a location
function loadComments(locationId) {
  try {
    const commentsContainer = document.querySelector(`.comments-container[data-id="${locationId}"]`);
    if (!commentsContainer) return;
    
    commentsContainer.innerHTML = '<p class="loading-comments">Loading comments...</p>';
    
    if (window.locationsModule?.loadComments) {
      window.locationsModule.loadComments(locationId)
        .then(comments => {
          comm
