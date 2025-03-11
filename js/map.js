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
  user: createCustomIcon('user'),
  abandoned: createCustomIcon('abandoned'),
  historical: createCustomIcon('historical'),
  'street-art': createCustomIcon('street-art'),
  viewpoint: createCustomIcon('viewpoint'),
  'hidden-gem': createCustomIcon('hidden-gem'),
  other: createCustomIcon('other')
};

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
  document.addEventListener('user-signed-in', () => {
    // Load user's locations when signed in
    loadLocations();
  });
  
  document.addEventListener('user-signed-out', () => {
    // Clear user-specific markers when signed out
    clearUserSpecificMarkers();
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
  
  // Store coordinates in form data attribute
  document.getElementById('location-form').dataset.lat = position.lat;
  document.getElementById('location-form').dataset.lng = position.lng;
  
  // Show modal
  document.getElementById('location-modal').classList.add('active');
  
  // Set up form submission
  document.getElementById('location-form').onsubmit = saveLocation;
}

// Save location to Firestore
function saveLocation(e) {
  e.preventDefault();
  
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to add locations');
    return;
  }
  
  const form = document.getElementById('location-form');
  const user = authModule.getCurrentUser();
  
  // Get form values
  const locationData = {
    name: document.getElementById('location-name').value,
    category: document.getElementById('location-category').value,
    description: document.getElementById('location-description').value,
    imageUrl: document.getElementById('location-image').value || null,
    coordinates: new firebase.firestore.GeoPoint(
      parseFloat(form.dataset.lat),
      parseFloat(form.dataset.lng)
    ),
    createdBy: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    upvotes: 0,
    downvotes: 0
  };
  
  // Check if we're online
  if (navigator.onLine) {
    // Save to Firestore
    locationsRef.add(locationData)
      .then(docRef => {
        console.log('Location added with ID:', docRef.id);
        
        // Add marker to map
        addLocationMarker({
          id: docRef.id,
          ...locationData,
          coordinates: { 
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          }
        });
        
        // Update user's location count
        updateUserLocationCount(user.uid);
        
        // Close modal
        closeLocationModal();
      })
      .catch(error => {
        console.error('Error adding location:', error);
        alert('Error saving location. Please try again.');
      });
  } else {
    // Save to IndexedDB for offline use
    saveLocationOffline(locationData)
      .then(() => {
        // Add marker to map (temporary until sync)
        const tempId = 'temp-' + Date.now();
        addLocationMarker({
          id: tempId,
          ...locationData,
          coordinates: { 
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          },
          isOffline: true
        });
        
        // Close modal
        closeLocationModal();
        
        // Show offline indicator
        showOfflineIndicator();
      })
      .catch(error => {
        console.error('Error saving location offline:', error);
        alert('Error saving location offline. Please try again.');
      });
  }
}

// Close location modal
function closeLocationModal() {
  document.getElementById('location-modal').classList.remove('active');
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
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          }
        });
      });
    })
    .catch(error => {
      console.error('Error loading locations:', error);
    });
    
  // Also load any offline locations
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
  // Create marker
  const marker = L.marker([location.coordinates.lat, location.coordinates.lng], {
    icon: markerIcons[location.category] || markerIcons.other
  });
  
  // Create popup content
  let popupContent = `
    <div class="location-popup">
      <h3>${location.name}</h3>
      <p class="location-category">${getCategoryLabel(location.category)}</p>
      ${location.description ? `<p>${location.description}</p>` : ''}
      ${location.imageUrl ? `<img src="${location.imageUrl}" alt="${location.name}" class="location-image">` : ''}
      <div class="rating-container">
        <button class="rating-btn upvote" data-id="${location.id}" data-action="upvote">👍</button>
        <span class="rating-count">${location.upvotes || 0}</span>
        <button class="rating-btn downvote" data-id="${location.id}" data-action="downvote">👎</button>
        <span class="rating-count">${location.downvotes || 0}</span>
      </div>
      ${location.isOffline ? '<p class="offline-badge">Saved Offline</p>' : ''}
    </div>
  `;
  
  // Bind popup to marker
  marker.bindPopup(popupContent);
  
  // Add marker to map
  marker.addTo(map);
  
  // Store marker reference
  locationMarkers[location.id] = marker;
  
  // Add event listeners to rating buttons
  marker.on('popupopen', () => {
    setTimeout(() => {
      const upvoteBtn = document.querySelector(`.rating-btn.upvote[data-id="${location.id}"]`);
      const downvoteBtn = document.querySelector(`.rating-btn.downvote[data-id="${location.id}"]`);
      
      if (upvoteBtn) {
        upvoteBtn.addEventListener('click', () => rateLocation(location.id, 'upvote'));
      }
      
      if (downvoteBtn) {
        downvoteBtn.addEventListener('click', () => rateLocation(location.id, 'downvote'));
      }
    }, 100);
  });
  
  return marker;
}

// Rate a location
function rateLocation(locationId, action) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to rate locations');
    return;
  }
  
  // Check if this is an offline location
  if (locationId.startsWith('temp-')) {
    alert('You cannot rate locations that are saved offline');
    return;
  }
  
  const user = authModule.getCurrentUser();
  const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}`);
  
  // Check if user has already rated this location
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
      // Refresh the location data
      return locationsRef.doc(locationId).get();
    })
    .then(doc => {
      if (doc.exists) {
        const locationData = doc.data();
        
        // Update the popup content
        const marker = locationMarkers[locationId];
        if (marker) {
          const popup = marker.getPopup();
          const newContent = `
            <div class="location-popup">
              <h3>${locationData.name}</h3>
              <p class="location-category">${getCategoryLabel(locationData.category)}</p>
              ${locationData.description ? `<p>${locationData.description}</p>` : ''}
              ${locationData.imageUrl ? `<img src="${locationData.imageUrl}" alt="${locationData.name}" class="location-image">` : ''}
              <div class="rating-container">
                <button class="rating-btn upvote ${action === 'upvote' ? 'active' : ''}" data-id="${locationId}" data-action="upvote">👍</button>
                <span class="rating-count">${locationData.upvotes || 0}</span>
                <button class="rating-btn downvote ${action === 'downvote' ? 'active' : ''}" data-id="${locationId}" data-action="downvote">👎</button>
                <span class="rating-count">${locationData.downvotes || 0}</span>
              </div>
            </div>
          `;
          
          popup.setContent(newContent);
          
          // Re-add event listeners
          setTimeout(() => {
            const upvoteBtn = document.querySelector(`.rating-btn.upvote[data-id="${locationId}"]`);
            const downvoteBtn = document.querySelector(`.rating-btn.downvote[data-id="${locationId}"]`);
            
            if (upvoteBtn) {
              upvoteBtn.addEventListener('click', () => rateLocation(locationId, 'upvote'));
            }
            
            if (downvoteBtn) {
              downvoteBtn.addEventListener('click', () => rateLocation(locationId, 'downvote'));
            }
          }, 100);
        }
      }
    })
    .catch(error => {
      console.error('Error rating location:', error);
      alert('Error rating location. Please try again.');
    });
}

// Update user's location count
function updateUserLocationCount(userId) {
  // Count user's locations
  locationsRef.where('createdBy', '==', userId).get()
    .then(snapshot => {
      const count = snapshot.size;
      
      // Update user document
      return usersRef.doc(userId).update({
        locationsCount: count
      });
    })
    .catch(error => {
      console.error('Error updating user location count:', error);
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
  // This could remove only markers added by the current user
}

// Create custom icon for markers
function createCustomIcon(type) {
  // Define colors for different categories
  const colors = {
    user: '#39ff14', // Neon green
    abandoned: '#ff2a6d', // Neon pink
    historical: '#05d9e8', // Neon blue
    'street-art': '#9d4edd', // Neon purple
    viewpoint: '#fee440', // Yellow
    'hidden-gem': '#f15bb5', // Pink
    other: '#ffffff' // White
  };
  
  // Get color for this type
  const color = colors[type] || colors.other;
  
  // Create icon
  return L.divIcon({
    className: `custom-marker marker-${type}`,
    html: `<div style="background-color: ${color}"></div>`,
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
