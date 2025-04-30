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
    
    // Set up event listeners
    map.on('click', onMapClick);
    
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
  try {
    // Check if db is defined
    if (typeof db !== 'undefined') {
      const locationsRef = db.collection('locations');
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
    } else {
      console.warn('db is not defined');
    }
  } catch (error) {
    console.error('Error in loadLocations:', error);
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
    
    // Add marker to map
    marker.addTo(map);
    locationMarkers[location.id] = marker;
    
    return marker;
  } catch (error) {
    console.error('Error adding location marker:', error);
    return null;
  }
}

// Clear location markers
function clearLocationMarkers() {
  try {
    Object.values(locationMarkers).forEach(marker => {
      if (map && marker) {
        map.removeLayer(marker);
      }
    });
    
    locationMarkers = {};
  } catch (error) {
    console.error('Error clearing location markers:', error);
  }
}

// Create custom icon for map markers
function createCustomIcon(type) {
  // Default icon options
  const iconOptions = {
    iconUrl: 'images/markers/default.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  };
  
  // Set icon URL based on type
  switch (type) {
    case 'abandoned':
      iconOptions.iconUrl = 'images/markers/abandoned.png';
      break;
    case 'historical':
      iconOptions.iconUrl = 'images/markers/historical.png';
      break;
    case 'viewpoint':
      iconOptions.iconUrl = 'images/markers/viewpoint.png';
      break;
    case 'water':
      iconOptions.iconUrl = 'images/markers/water.png';
      break;
    case 'camp':
      iconOptions.iconUrl = 'images/markers/camp.png';
      break;
    case 'user':
      iconOptions.iconUrl = 'images/markers/user.png';
      break;
    default:
      iconOptions.iconUrl = 'images/markers/default.png';
  }
  
  return L.icon(iconOptions);
}

// Clear user-specific markers
function clearUserSpecificMarkers() {
  // Implementation would depend on how user-specific markers are tracked
  console.log('Clearing user-specific markers');
}

// Load comments for a location
function loadComments(locationId) {
  const commentsContainer = document.querySelector(`.comments-container[data-id="${locationId}"]`);
  if (!commentsContainer) return;
  
  commentsContainer.innerHTML = '<p class="loading-comments">Loading comments...</p>';
  
  if (window.commentsModule?.loadComments) {
    window.commentsModule.loadComments(locationId);
  } else {
    commentsContainer.innerHTML = '<p>Comments not available</p>';
  }
}

// Add comment to a location
function addComment(locationId, text) {
  return new Promise((resolve, reject) => {
    if (window.commentsModule?.addComment) {
      window.commentsModule.addComment(locationId, text)
        .then(() => resolve(true))
        .catch(error => {
          console.error('Error adding comment:', error);
          reject(error);
        });
    } else {
      console.warn('commentsModule.addComment is not available');
      reject(new Error('Comments module not available'));
    }
  });
}

// Rate location with stars
function rateLocationWithStars(locationId, rating) {
  if (window.ratingsModule?.rateLocation) {
    window.ratingsModule.rateLocation(locationId, rating);
  } else {
    console.warn('ratingsModule.rateLocation is not available');
  }
}

// Rate location with upvote/downvote
function rateLocation(locationId, action) {
  if (window.ratingsModule?.voteLocation) {
    window.ratingsModule.voteLocation(locationId, action);
  } else {
    console.warn('ratingsModule.voteLocation is not available');
  }
}

// Claim territory
function claimTerritory(locationId) {
  if (window.territoriesModule?.claimTerritory) {
    window.territoriesModule.claimTerritory(locationId);
  } else {
    console.warn('territoriesModule.claimTerritory is not available');
  }
}

// Export functions for use in other modules
window.mapModule = {
  initMap,
  getUserLocation,
  loadLocations,
  clearLocationMarkers,
  addLocationMarker,
  locationMarkers,
  map: () => map // Return the map instance as a getter function
};

// Initialize map when the script loads
document.addEventListener('DOMContentLoaded', () => {
  // Wait a short time to ensure all dependencies are loaded
  setTimeout(() => {
    if (typeof initMap === 'function') {
      initMap();
      
      // Add event listener for the add location button
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
              openAddLocationModal(position);
            }).catch(error => {
              console.error('Error getting user location:', error);
              alert('Could not get your location. Please try again.');
            });
          }
        });
      }
    }
  }, 500);
});
