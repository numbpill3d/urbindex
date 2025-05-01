// Urbindex - Map Module

// Map instance with improved state management
let map;
let userMarker;
let locationMarkers = {};
let currentPosition = null;
let onlineUsers = [];
let watchPositionId = null;
let lastMapInteraction = Date.now();
let mapInteractionTimeout = null;

// Map configuration with enhanced options
const mapConfig = {
  initialView: [40.7128, -74.0060], // Default to New York City
  initialZoom: 18, // Increased zoom level for much closer view
  maxZoom: 19,
  minZoom: 3,
  tileLayer: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', // Upgraded to Carto dark basemap
  tileLayerFallback: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // Fallback in case primary fails
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a> | Urbindex',
  cyberpunkStyle: true, // Enable custom cyberpunk styling
  loadFullMap: true, // Load all map tiles
  enableHighAccuracy: true, // Use high accuracy for geolocation
  watchPosition: true, // Enable position tracking
  showAccuracyCircle: true, // Show accuracy circle around user position
  mapFadeIn: true, // Enable smooth fade-in for map tiles
  adaptiveTileLoading: true, // Adjust tile loading based on device performance
  heatmapEnabled: true, // Enable heatmap for popular locations
  clusterMarkers: true, // Cluster markers when zoomed out
  enableOfflineMap: true, // Support offline map functionality
  offllineMapRadius: 10, // Radius in km to cache for offline use
  performanceMode: 'auto', // Options: 'high', 'medium', 'low', 'auto'
  gestures: {
    pinchToZoom: true,
    doubleTapZoom: true,
    touchDragPan: true,
    rotate: false // Disabled by default, can be enabled on modern devices
  },
  ui: {
    showScale: true,
    showCoordinates: true,
    showZoomLevel: true,
    showCompass: true,
    darkMode: true // Match app's dark theme
  }
};

// Initialize map with enhanced error handling, performance improvements, and modern features
function initMap() {
  try {
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }
    
    // Show loading indicator
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'map-loading-indicator';
    loadingIndicator.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading Map</div>
    `;
    mapContainer.appendChild(loadingIndicator);
    
    // Create map instance with enhanced options
    map = L.map('map', {
      zoomControl: false,
      attributionControl: true,
      maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
      maxBoundsViscosity: 1.0,
      fadeAnimation: mapConfig.mapFadeIn,
      zoomAnimation: true,
      markerZoomAnimation: true,
      doubleClickZoom: mapConfig.gestures.doubleTapZoom,
      touchZoom: mapConfig.gestures.pinchToZoom,
      dragging: mapConfig.gestures.touchDragPan,
      tapTolerance: 15, // More forgiving for mobile taps
      tap: true,
      bounceAtZoomLimits: true,
      preferCanvas: true, // Better performance for many markers
      worldCopyJump: true, // Better experience when panning across date line
      wheelDebounceTime: 100, // Smoother wheel zooming
      wheelPxPerZoomLevel: 120 // More intuitive mouse wheel zooming
    }).setView(mapConfig.initialView, mapConfig.initialZoom);
    
    // Add pulsing dot indicating map is active
    const mapActiveDot = document.createElement('div');
    mapActiveDot.className = 'map-active-indicator';
    mapContainer.appendChild(mapActiveDot);

    // Add custom zoom control to bottom right with proper tooltips
    L.control.zoom({
      position: 'bottomright',
      zoomInTitle: 'Zoom in',
      zoomOutTitle: 'Zoom out'
    }).addTo(map);

    // Add fullscreen control for better user experience
    L.control.fullscreen({
      position: 'bottomright',
      title: 'Toggle fullscreen mode',
      titleCancel: 'Exit fullscreen mode',
      forceSeparateButton: true
    }).addTo(map);

    // Add location control for easier navigation to user's location
    L.control.locate({
      position: 'bottomright',
      strings: {
        title: 'Show my location'
      },
      flyTo: true,
      cacheLocation: true,
      drawCircle: mapConfig.showAccuracyCircle,
      drawMarker: false, // We'll handle our own marker
      showPopup: false,
      locateOptions: {
        enableHighAccuracy: mapConfig.enableHighAccuracy,
        maximumAge: 60000,
        timeout: 10000
      }
    }).addTo(map);

    // Add tile layer with enhanced options and cyberpunk styling
    const tileLayerOptions = {
      attribution: mapConfig.attribution,
      maxZoom: mapConfig.maxZoom,
      minZoom: mapConfig.minZoom,
      updateWhenIdle: !mapConfig.adaptiveTileLoading,
      updateWhenZooming: true,
      keepBuffer: mapConfig.adaptiveTileLoading ? 12 : 8, // Enhanced buffer for smoother panning
      noWrap: false, // Allow map to wrap around the world
      bounds: mapConfig.loadFullMap ? null : undefined, // Load full map if enabled
      className: mapConfig.cyberpunkStyle ? 'cyberpunk-map-tiles' : '',
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Transparent pixel for error tiles
      detectRetina: true, // Better display on retina screens
      crossOrigin: true, // Allow CORS for offline caching
      subdomains: 'abcd', // Multiple subdomains for parallel downloads
    };
    
    // Create and add the tile layer with fallback
    let tileLayer;
    try {
      tileLayer = L.tileLayer(mapConfig.tileLayer, tileLayerOptions).addTo(map);
      
      // Add error handler to fall back to OSM if Carto fails
      tileLayer.on('tileerror', (error) => {
        console.warn('Tile error, falling back to OSM', error);
        if (!map._fallbackTileLayerAdded) {
          map._fallbackTileLayerAdded = true;
          L.tileLayer(mapConfig.tileLayerFallback, tileLayerOptions).addTo(map);
          
          // Show notification about fallback
          const fallbackNotification = document.createElement('div');
          fallbackNotification.className = 'map-notification warning';
          fallbackNotification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>Using backup map tiles</span>
          `;
          mapContainer.appendChild(fallbackNotification);
          
          // Remove after 3 seconds
          setTimeout(() => {
            if (fallbackNotification.parentNode) {
              fallbackNotification.parentNode.removeChild(fallbackNotification);
            }
          }, 3000);
        }
      });
    } catch (e) {
      console.error('Error loading primary tile layer:', e);
      // Fall back to OSM immediately
      tileLayer = L.tileLayer(mapConfig.tileLayerFallback, tileLayerOptions).addTo(map);
    }
    
    // If clustering is enabled, create a marker cluster group
    let markerClusterGroup;
    if (mapConfig.clusterMarkers) {
      markerClusterGroup = L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          let size, className;
          
          if (count < 10) {
            size = 'small';
            className = 'cluster-small';
          } else if (count < 50) {
            size = 'medium';
            className = 'cluster-medium';
          } else {
            size = 'large';
            className = 'cluster-large';
          }
          
          return L.divIcon({
            html: `<div class="cluster-marker-count">${count}</div>`,
            className: `marker-cluster ${className}`,
            iconSize: L.point(40, 40)
          });
        }
      });
      
      map.addLayer(markerClusterGroup);
    }
    
    // Apply cyberpunk filter if enabled
    if (mapConfig.cyberpunkStyle) {
      mapContainer.classList.add('cyberpunk-filter');
    }
    
    // Set up event listeners with debouncing for better performance
    let clickTimeout;
    map.on('click', (e) => {
      // Clear any existing timeout to prevent multiple rapid clicks
      clearTimeout(clickTimeout);
      // Set a timeout to prevent accidental double clicks
      clickTimeout = setTimeout(() => {
        onMapClick(e);
      }, 200);
    });
    
    // Update coordinates display on mouse move with throttling
    let lastMoveUpdate = 0;
    map.on('mousemove', (e) => {
      const now = Date.now();
      // Update at most every 100ms to avoid performance issues
      if (now - lastMoveUpdate > 100) {
        const coordsDisplay = document.getElementById('current-coordinates');
        if (coordsDisplay) {
          // Modern coordinate display with icon
          coordsDisplay.innerHTML = `
            <i class="fas fa-location-dot"></i>
            <span>${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}</span>
          `;
        }
        lastMoveUpdate = now;
      }
    });
    
    // Add compass indicator for orientation if enabled
    if (mapConfig.ui.showCompass) {
      const compassControl = L.control({position: 'topright'});
      compassControl.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-compass');
        div.innerHTML = '<i class="fas fa-compass"></i>';
        return div;
      };
      compassControl.addTo(map);
      
      // Update compass rotation based on map bearing
      map.on('rotate', function(e) {
        const compass = document.querySelector('.map-compass i');
        if (compass) {
          compass.style.transform = `rotate(${-e.bearing}deg)`;
        }
      });
    }
    
    // Update zoom level display on zoom
    map.on('zoomend', () => {
      const zoomDisplay = document.getElementById('current-zoom');
      if (zoomDisplay) {
        zoomDisplay.textContent = map.getZoom();
      }
    });
    
    // Track map interactions for battery optimization
    map.on('movestart zoomstart', trackMapInteraction);
    
    // Show mobile/desktop appropriate controls
    setupResponsiveControls();
    
    // Remove loading indicator when all tiles are loaded
    tileLayer.on('load', () => {
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
    });
    
    console.log('Map initialized successfully');
    
    // Get user location after map initialization
    getUserLocation();
    
  } catch (error) {
    console.error('Error initializing map:', error);
    // Show error message to user
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div class="map-error">
          <p>There was a problem loading the map. Please try again.</p>
          <button id="retry-map-btn" class="neon-button small">Retry</button>
        </div>
      `;
      
      // Add retry button functionality
      const retryBtn = document.getElementById('retry-map-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', initMap);
      }
    }
  }
}

// Set up responsive controls based on device type
function setupResponsiveControls() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Mobile-specific controls and behaviors
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    
    // Add simpler controls for mobile
    addMobileControls();
  } else {
    // Desktop-specific controls
    addDesktopControls();
  }
}

// Add mobile-friendly controls
function addMobileControls() {
  // Create simplified controls for mobile
  const mobileControlsDiv = document.createElement('div');
  mobileControlsDiv.className = 'mobile-map-controls';
  mobileControlsDiv.innerHTML = `
    <button id="mobile-location-btn" class="mobile-control-btn" title="Get My Location">
      <i class="fas fa-crosshairs"></i>
    </button>
    <button id="mobile-add-btn" class="mobile-control-btn" title="Add Location">
      <i class="fas fa-plus"></i>
    </button>
  `;
  
  document.getElementById('map').appendChild(mobileControlsDiv);
  
  // Set up event listeners for mobile controls
  document.getElementById('mobile-location-btn').addEventListener('click', () => {
    getUserLocation().then(position => {
      if (map && position) {
        map.setView([position.lat, position.lng], mapConfig.initialZoom);
      }
    }).catch(err => {
      console.error('Error getting location:', err);
      showLocationError(err.message);
    });
  });
  
  document.getElementById('mobile-add-btn').addEventListener('click', () => {
    if (!window.authModule?.isAuthenticated()) {
      showAuthRequiredMessage('add locations');
      return;
    }
    
    if (currentPosition) {
      openAddLocationModal(currentPosition);
    } else {
      getUserLocation().then(position => {
        openAddLocationModal(position);
      }).catch(error => {
        console.error('Error getting user location:', error);
        showLocationError('Could not get your location. Please try again.');
      });
    }
  });
}

// Add desktop-specific controls
function addDesktopControls() {
  // Add scale control
  L.control.scale({
    position: 'bottomleft',
    maxWidth: 200,
    metric: true,
    imperial: true
  }).addTo(map);
}

// Track map interaction to optimize battery usage
function trackMapInteraction() {
  lastMapInteraction = Date.now();
  
  // Clear existing timeout if any
  if (mapInteractionTimeout) {
    clearTimeout(mapInteractionTimeout);
  }
  
  // Set a new timeout to reduce updates when map is idle
  mapInteractionTimeout = setTimeout(() => {
    // If we're watching position, we can reduce update frequency when map is idle
    if (watchPositionId && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchPositionId);
      
      // Switch to less frequent updates
      watchPositionId = navigator.geolocation.watchPosition(
        updateUserPosition,
        handleGeolocationError,
        {
          enableHighAccuracy: false, // Lower accuracy to save battery
          timeout: 30000,
          maximumAge: 120000 // Allow older positions when idle
        }
      );
    }
  }, 60000); // After 1 minute of inactivity
}

// Show error when location access fails
function showLocationError(message) {
  if (window.offlineModule?.showToast) {
    window.offlineModule.showToast(message, 'error');
  } else {
    alert(message);
  }
}

// Show message when auth is required
function showAuthRequiredMessage(action) {
  const message = `Please sign in to ${action}.`;
  
  if (window.offlineModule?.showToast) {
    window.offlineModule.showToast(message, 'warning', {
      actionText: 'Sign In',
      action: () => {
        const loginBtn = document.getElementById('login-button');
        if (loginBtn) loginBtn.click();
      }
    });
  } else {
    alert(message);
  }
}

// Get user's current location with enhanced error handling and continuous tracking
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!map) {
      reject(new Error('Map not initialized'));
      return;
    }
    
    // Show loading indicator for location
    const mapContainer = document.getElementById('map');
    let loadingIndicator;
    
    if (mapContainer) {
      loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'location-loading-indicator';
      loadingIndicator.innerHTML = '<div class="loading-spinner"></div><div>Getting your location...</div>';
      mapContainer.appendChild(loadingIndicator);
    }
    
    const removeLoadingIndicator = () => {
      if (loadingIndicator && loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
    };
    
    if ('geolocation' in navigator) {
      // Get position once first
      navigator.geolocation.getCurrentPosition(
        position => {
          try {
            updateUserPosition(position);
            removeLoadingIndicator();
            resolve(currentPosition);
            
            // After getting position once, set up continuous tracking if enabled
            if (mapConfig.watchPosition) {
              // Clear any existing watch
              if (watchPositionId !== null) {
                navigator.geolocation.clearWatch(watchPositionId);
              }
              
              // Set up continuous tracking
              watchPositionId = navigator.geolocation.watchPosition(
                updateUserPosition,
                handleGeolocationError,
                {
                  enableHighAccuracy: mapConfig.enableHighAccuracy,
                  timeout: 10000,
                  maximumAge: 60000 // Cache location for 1 minute
                }
              );
            }
          } catch (error) {
            removeLoadingIndicator();
            console.error('Error processing geolocation result:', error);
            reject(error);
          }
        },
        error => {
          removeLoadingIndicator();
          const errorMessage = handleGeolocationError(error);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: mapConfig.enableHighAccuracy,
          timeout: 15000, // Increased timeout for better reliability
          maximumAge: 60000 // Cache location for 1 minute
        }
      );
    } else {
      removeLoadingIndicator();
      const errorMessage = 'Geolocation is not supported by this browser';
      console.warn(errorMessage);
      
      // Show error message on map
      if (mapContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'map-notification error';
        errorDiv.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <span>${errorMessage}</span>
        `;
        mapContainer.appendChild(errorDiv);
        
        // Remove after 5 seconds
        setTimeout(() => {
          if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
          }
        }, 5000);
      }
      
      reject(new Error(errorMessage));
    }
  });
}

// Handler for geolocation errors
function handleGeolocationError(error) {
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
  
  // Show error message on map
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'map-notification error';
    errorDiv.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>${errorMessage}</span>
    `;
    mapContainer.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
  
  return errorMessage;
}

// Update user position with accuracy indicator
function updateUserPosition(position) {
  const { latitude, longitude, accuracy } = position.coords;
  currentPosition = { lat: latitude, lng: longitude, accuracy };
  
  // Set view center if this is first location or if we're actively following user
  if (!userMarker || (map && map.hasLayer(userMarker) && map._following)) {
    map.setView([latitude, longitude], mapConfig.initialZoom);
  }
  
  // Create or update user marker
  if (userMarker) {
    userMarker.setLatLng([latitude, longitude]);
  } else {
    userMarker = L.marker([latitude, longitude], {
      icon: createCustomIcon('user'),
      zIndexOffset: 1000
    }).addTo(map);
    
    userMarker.bindPopup(`
      <div class="user-popup">
        <strong>Your Location</strong>
        <div class="coordinates">${latitude.toFixed(6)}, ${longitude.toFixed(6)}</div>
        <button id="add-here-btn" class="neon-button small">Add Location Here</button>
      </div>
    `);
    
    // Add event listener for the Add Location button in popup
    userMarker.on('popupopen', () => {
      const addHereBtn = document.getElementById('add-here-btn');
      if (addHereBtn) {
        addHereBtn.addEventListener('click', () => {
          if (!window.authModule?.isAuthenticated()) {
            showAuthRequiredMessage('add locations');
            return;
          }
          
          openAddLocationModal(currentPosition);
          userMarker.closePopup();
        });
      }
    });
  }
  
  // Add or update accuracy circle
  if (mapConfig.showAccuracyCircle && accuracy) {
    if (userMarker._accuracyCircle) {
      userMarker._accuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy);
    } else {
      userMarker._accuracyCircle = L.circle([latitude, longitude], {
        radius: accuracy,
        fillColor: 'rgba(0, 213, 255, 0.15)',
        fillOpacity: 0.2,
        color: 'rgba(0, 213, 255, 0.5)',
        weight: 1
      }).addTo(map);
    }
  }
  
  // Update coordinates display
  const coordsDisplay = document.getElementById('current-coordinates');
  if (coordsDisplay) {
    coordsDisplay.innerHTML = `
      <span>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</span>
      ${accuracy ? `<small>±${Math.round(accuracy)}m</small>` : ''}
    `;
  }
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

// Open add location modal with enhanced functionality
function openAddLocationModal(position) {
  const latElement = document.getElementById('location-lat');
  const lngElement = document.getElementById('location-lng');
  const modalTitle = document.getElementById('modal-title');
  const locationForm = document.getElementById('location-form');
  const locationModal = document.getElementById('location-modal');
  
  if (!latElement || !lngElement || !modalTitle || !locationForm || !locationModal) {
    console.error('Required modal elements not found');
    
    // If elements not found, try to create a dynamic modal as fallback
    createFallbackLocationModal(position);
    return;
  }
  
  // Update modal fields with position data
  latElement.textContent = position.lat.toFixed(6);
  lngElement.textContent = position.lng.toFixed(6);
  modalTitle.textContent = 'Add New Location';
  locationForm.reset();
  
  // Show a temporary marker at the selected location
  const tempMarker = L.marker([position.lat, position.lng], {
    icon: createCustomIcon('default'),
    opacity: 0.8
  }).addTo(map);
  
  // Store the temporary marker so we can remove it later
  locationModal._tempMarker = tempMarker;
  
  // Add event listener to remove marker when modal is closed
  const removeMarkerOnClose = () => {
    if (locationModal._tempMarker && map) {
      map.removeLayer(locationModal._tempMarker);
      locationModal._tempMarker = null;
    }
    locationModal.removeEventListener('close', removeMarkerOnClose);
  };
  
  locationModal.addEventListener('close', removeMarkerOnClose);
  
  // Reset image preview container
  const previewContainer = document.getElementById('image-preview-container');
  if (previewContainer) {
    previewContainer.innerHTML = '';
  }
  
  // Get address from coordinates if reverse geocoding is available
  if (window.utilsModule?.reverseGeocode) {
    const loadingText = document.createElement('div');
    loadingText.className = 'address-loading';
    loadingText.textContent = 'Looking up address...';
    
    const addressContainer = document.getElementById('address-container');
    if (addressContainer) {
      addressContainer.innerHTML = '';
      addressContainer.appendChild(loadingText);
      
      window.utilsModule.reverseGeocode(position.lat, position.lng)
        .then(address => {
          if (address) {
            // Create address field
            const addressField = document.createElement('div');
            addressField.className = 'address-result';
            addressField.innerHTML = `
              <strong>Address:</strong> ${address}
              <input type="hidden" name="address" value="${address}">
            `;
            addressContainer.innerHTML = '';
            addressContainer.appendChild(addressField);
          } else {
            addressContainer.innerHTML = '<div class="address-unknown">Address unavailable</div>';
          }
        })
        .catch(error => {
          console.error('Error getting address:', error);
          addressContainer.innerHTML = '<div class="address-error">Could not retrieve address</div>';
        });
    }
  }
  
  // Update form data and show modal
  locationForm.dataset.lat = position.lat;
  locationForm.dataset.lng = position.lng;
  
  // Set timestamp
  const timestampField = document.getElementById('location-timestamp');
  if (timestampField) {
    timestampField.value = new Date().toISOString();
  }
  
  // Add animation to modal
  locationModal.classList.add('active', 'modal-animation');
  
  // Set up form submission
  if (window.locationsModule?.saveLocation) {
    locationForm.onsubmit = (e) => {
      e.preventDefault();
      
      // Disable submit button to prevent multiple submissions
      const submitBtn = locationForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
      }
      
      // Call the save location function
      window.locationsModule.saveLocation(e)
        .then(() => {
          // Success handling is done by saveLocation
          // Clear the temporary marker
          if (tempMarker && map) {
            map.removeLayer(tempMarker);
          }
        })
        .catch(error => {
          console.error('Error saving location:', error);
          // Re-enable submit button on error
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Location';
          }
          
          // Show error message
          const errorMessage = document.createElement('div');
          errorMessage.className = 'form-error';
          errorMessage.textContent = 'Error saving location. Please try again.';
          locationForm.prepend(errorMessage);
          
          // Remove error message after 3 seconds
          setTimeout(() => {
            if (errorMessage.parentNode) {
              errorMessage.parentNode.removeChild(errorMessage);
            }
          }, 3000);
        });
    };
  } else {
    console.warn('locationsModule.saveLocation not available');
    
    // Show a message about missing functionality
    const errorMessage = document.createElement('div');
    errorMessage.className = 'form-error';
    errorMessage.textContent = 'Location saving is currently unavailable. Please try again later.';
    locationForm.prepend(errorMessage);
  }
}

// Create fallback modal if the regular one is not found
function createFallbackLocationModal(position) {
  // Check if body exists
  if (!document.body) return;
  
  // Create modal element
  const fallbackModal = document.createElement('div');
  fallbackModal.id = 'fallback-location-modal';
  fallbackModal.className = 'modal active';
  
  fallbackModal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3 id="modal-title">Add New Location</h3>
      
      <form id="fallback-location-form">
        <div class="form-group">
          <label for="location-name">Location Name</label>
          <input type="text" id="location-name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="location-description">Description</label>
          <textarea id="location-description" name="description" rows="3" required></textarea>
        </div>
        
        <div class="form-group">
          <label for="location-type">Location Type</label>
          <select id="location-type" name="locationType">
            <option value="abandoned">Abandoned</option>
            <option value="historical">Historical</option>
            <option value="viewpoint">Viewpoint</option>
            <option value="water">Water Feature</option>
            <option value="camp">Camp</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div class="coordinates-display">
          <div>Latitude: <span id="location-lat">${position.lat.toFixed(6)}</span></div>
          <div>Longitude: <span id="location-lng">${position.lng.toFixed(6)}</span></div>
        </div>
        
        <div class="form-actions">
          <button type="button" id="fallback-cancel-btn" class="neon-button">Cancel</button>
          <button type="submit" class="neon-button">Save Location</button>
        </div>
      </form>
    </div>
  `;
  
  // Add modal to body
  document.body.appendChild(fallbackModal);
  
  // Set up event listeners
  const closeBtn = fallbackModal.querySelector('.close-modal');
  const cancelBtn = fallbackModal.querySelector('#fallback-cancel-btn');
  const fallbackForm = fallbackModal.querySelector('#fallback-location-form');
  
  const closeModal = () => {
    fallbackModal.classList.remove('active');
    setTimeout(() => {
      if (fallbackModal.parentNode) {
        fallbackModal.parentNode.removeChild(fallbackModal);
      }
    }, 300);
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
  
  // Handle click outside modal
  fallbackModal.addEventListener('click', (e) => {
    if (e.target === fallbackModal) {
      closeModal();
    }
  });
  
  // Handle form submission
  if (fallbackForm) {
    fallbackForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form data
      const formData = new FormData(fallbackForm);
      const locationData = {
        name: formData.get('name'),
        description: formData.get('description'),
        locationType: formData.get('locationType'),
        coordinates: {
          latitude: position.lat,
          longitude: position.lng
        }
      };
      
      // Try to save location
      if (window.locationsModule?.saveLocationData) {
        window.locationsModule.saveLocationData(locationData)
          .then(() => {
            closeModal();
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'map-notification success';
            successMessage.innerHTML = `
              <i class="fas fa-check-circle"></i>
              <span>Location saved successfully!</span>
            `;
            document.getElementById('map').appendChild(successMessage);
            
            // Remove after 3 seconds
            setTimeout(() => {
              if (successMessage.parentNode) {
                successMessage.parentNode.removeChild(successMessage);
              }
            }, 3000);
          })
          .catch(error => {
            console.error('Error saving location:', error);
            
            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'form-error';
            errorMessage.textContent = 'Error saving location. Please try again.';
            fallbackForm.prepend(errorMessage);
            
            // Remove error message after 3 seconds
            setTimeout(() => {
              if (errorMessage.parentNode) {
                errorMessage.parentNode.removeChild(errorMessage);
              }
            }, 3000);
          });
      } else {
        console.error('locationsModule.saveLocationData not available');
        closeModal();
      }
    });
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

// Create custom icon for map markers using CSS and SVG instead of image files
function createCustomIcon(type) {
  // Generate HTML for the icon using a div with appropriate styling
  const iconHTML = createSVGMarkerForType(type);
  
  // Create a divIcon which allows for custom HTML
  return L.divIcon({
    html: iconHTML,
    className: `custom-marker marker-${type}`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

// Helper function to create SVG markers based on type
function createSVGMarkerForType(type) {
  // Define colors for each type
  let color, secondaryColor, icon;
  
  switch (type) {
    case 'abandoned':
      color = '#ff2a6d'; // neon pink
      secondaryColor = '#ff005d';
      icon = 'home';
      break;
    case 'historical':
      color = '#9d4edd'; // neon purple
      secondaryColor = '#8c2cf5';
      icon = 'landmark';
      break;
    case 'viewpoint':
      color = '#05d9e8'; // neon blue
      secondaryColor = '#00c1cf';
      icon = 'mountain';
      break;
    case 'water':
      color = '#05d9e8'; // neon blue
      secondaryColor = '#00c1cf';
      icon = 'water';
      break;
    case 'camp':
      color = '#39ff14'; // neon green
      secondaryColor = '#29ee04';
      icon = 'campground';
      break;
    case 'user':
      color = '#ffdd44'; // yellow
      secondaryColor = '#ffc107';
      icon = 'user';
      break;
    default:
      color = '#05d9e8'; // neon blue
      secondaryColor = '#00c1cf';
      icon = 'map-pin';
  }
  
  // Create SVG marker with pulsing animation
  return `
    <div class="marker-container">
      <div class="marker-pin" style="background-color: ${color}; box-shadow: 0 0 10px ${color};">
        <i class="fas fa-${icon}" style="color: white;"></i>
      </div>
      <div class="marker-pulse" style="border-color: ${color};"></div>
    </div>
  `;
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

// Add CSS for new map features
function addMapStyles() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .map-loading-indicator {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(22, 22, 42, 0.8);
      border-radius: 10px;
      padding: 20px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(5px);
      border: 1px solid var(--neon-blue);
    }
    
    .location-loading-indicator {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(22, 22, 42, 0.8);
      border-radius: 8px;
      padding: 10px 20px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(5px);
      border: 1px solid var(--neon-blue);
      animation: fade-in 0.3s ease-out;
    }
    
    .loading-spinner {
      width: 24px;
      height: 24px;
      border: 3px solid transparent;
      border-top-color: var(--neon-blue);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    .loading-text {
      margin-top: 10px;
      color: var(--text-primary);
      font-size: 14px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .map-error {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(22, 22, 42, 0.9);
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
      border: 1px solid var(--danger);
      max-width: 80%;
    }
    
    .map-notification {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(22, 22, 42, 0.9);
      border-radius: 8px;
      padding: 10px 20px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      animation: fade-in 0.3s ease-out, fade-out 0.3s ease-in 4.7s forwards;
    }
    
    .map-notification.error {
      border-left: 3px solid var(--danger);
    }
    
    .map-notification.success {
      border-left: 3px solid var(--success);
    }
    
    .map-notification.warning {
      border-left: 3px solid var(--warning);
    }
    
    @keyframes fade-in {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    
    @keyframes fade-out {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
    
    .mobile-map-controls {
      position: absolute;
      right: 20px;
      bottom: 80px;
      z-index: 900;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    .mobile-control-btn {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--secondary-bg);
      color: var(--neon-blue);
      border: 2px solid var(--neon-blue);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 10px rgba(0, 213, 255, 0.5);
      font-size: 20px;
      transition: all 0.2s ease;
    }
    
    .mobile-control-btn:active {
      transform: scale(0.95);
    }
    
    .user-popup {
      text-align: center;
      padding: 5px;
    }
    
    .user-popup .coordinates {
      font-family: monospace;
      margin: 5px 0 10px;
      font-size: 12px;
      color: var(--text-secondary);
    }
    
    #current-coordinates small {
      display: block;
      font-size: 10px;
      opacity: 0.7;
    }
    
    @media (max-width: 768px) {
      .leaflet-control-container .leaflet-top,
      .leaflet-control-container .leaflet-bottom {
        padding: 5px;
      }
      
      .leaflet-control-zoom a,
      .leaflet-control-fullscreen a,
      .leaflet-control-locate a {
        width: 36px !important;
        height: 36px !important;
        line-height: 36px !important;
      }
    }
  `;
  
  document.head.appendChild(styleEl);
}

// Export enhanced functions for use in other modules
window.mapModule = {
  initMap,
  getUserLocation,
  loadLocations,
  clearLocationMarkers,
  addLocationMarker,
  locationMarkers,
  map: () => map, // Return the map instance as a getter function
  refreshMap: () => {
    if (map) {
      map.invalidateSize();
      if (currentPosition) {
        map.setView([currentPosition.lat, currentPosition.lng], map.getZoom());
      }
    }
  },
  // Add new exported functions
  centerOnUser: () => {
    if (map && currentPosition) {
      map.setView([currentPosition.lat, currentPosition.lng], mapConfig.initialZoom);
    } else {
      getUserLocation().then(position => {
        if (map) {
          map.setView([position.lat, position.lng], mapConfig.initialZoom);
        }
      }).catch(err => console.error('Error centering on user:', err));
    }
  },
  addCustomControl: (html, position = 'topright') => {
    if (!map) return null;
    
    const CustomControl = L.Control.extend({
      options: { position },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'custom-leaflet-control');
        container.innerHTML = html;
        return container;
      }
    });
    
    const control = new CustomControl();
    map.addControl(control);
    return control;
  }
};

// Initialize map when the script loads
document.addEventListener('DOMContentLoaded', () => {
  // Add map-specific styles
  addMapStyles();
  
  // Wait a short time to ensure all dependencies are loaded
  setTimeout(() => {
    if (typeof initMap === 'function') {
      initMap();
      
      // Add event listener for the add location button with better UX
      const addLocationBtn = document.getElementById('add-location-btn');
      if (addLocationBtn) {
        addLocationBtn.addEventListener('click', () => {
          if (!window.authModule?.isAuthenticated()) {
            showAuthRequiredMessage('add locations');
            return;
          }
          
          // Add loading state to button
          addLocationBtn.classList.add('loading');
          addLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
          
          if (currentPosition) {
            openAddLocationModal(currentPosition);
            // Reset button
            addLocationBtn.classList.remove('loading');
            addLocationBtn.innerHTML = '<i class="fas fa-plus"></i> Add Location';
          } else {
            getUserLocation().then(position => {
              openAddLocationModal(position);
            }).catch(error => {
              console.error('Error getting user location:', error);
              showLocationError('Could not get your location. Please try again.');
            }).finally(() => {
              // Reset button
              addLocationBtn.classList.remove('loading');
              addLocationBtn.innerHTML = '<i class="fas fa-plus"></i> Add Location';
            });
          }
        });
      }
      
      // Add "My Location" button if it exists
      const myLocationBtn = document.getElementById('my-location-btn');
      if (myLocationBtn) {
        myLocationBtn.addEventListener('click', () => window.mapModule.centerOnUser());
      }
      
      // Set up keyboard shortcuts for accessibility
      document.addEventListener('keydown', (e) => {
        // Only if map view is active
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer || !mapContainer.classList.contains('active')) return;
        
        // Alt+L focuses on user location
        if (e.altKey && e.key === 'l') {
          window.mapModule.centerOnUser();
          e.preventDefault();
        }
        
        // Alt+A opens add location modal if authenticated
        if (e.altKey && e.key === 'a') {
          const addLocationBtn = document.getElementById('add-location-btn');
          if (addLocationBtn) addLocationBtn.click();
          e.preventDefault();
        }
      });
    }
  }, 500);
});
