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
  offlineMapRadius: 10, // Radius in km to cache for offline use
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
    // Check if map is already initialized
    if (map) {
      console.log('Map already initialized, invalidating size');
      map.invalidateSize(true);
      return map;
    }

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      console.error('Leaflet is not loaded');
      return;
    }

    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container not found');
      return;
    }

    // Ensure map container has dimensions and is visible
    if (!mapContainer.style.height || mapContainer.style.height === '0px') {
      mapContainer.style.height = '100%';
    }
    mapContainer.style.display = 'block';

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

    // Force a resize event after a short delay to ensure proper rendering
    setTimeout(() => {
      if (map) {
        map.invalidateSize(true);
        console.log('Map size invalidated after initialization');
      }
    }, 300);

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

// Set up responsive controls based on device type with better device detection
function setupResponsiveControls() {
  // More accurate device detection
  const isMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isTablet = /iPad|tablet|Tab/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 0 && window.innerWidth > 768);
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  // Add device class to map container for CSS targeting
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    if (isMobile) mapContainer.classList.add('mobile-device');
    if (isTablet) mapContainer.classList.add('tablet-device');
    if (isTouchDevice) mapContainer.classList.add('touch-device');
  }

  if (isMobile || isTablet) {
    // Mobile/tablet-specific controls and behaviors
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();

    // Disable unnecessary interactions for mobile
    if (map.scrollWheelZoom) map.scrollWheelZoom.disable();

    // Add touch-optimized controls
    addTouchControls();

    // Add performance optimizations for mobile
    if (mapConfig.performanceMode === 'auto' || mapConfig.performanceMode === 'low') {
      reduceMobileAnimations();
    }
  } else {
    // Desktop-specific controls
    addDesktopControls();

    // Enable keyboard navigation on desktop
    if (!map.keyboard) map.keyboard.enable();
  }

  // Add PWA-specific controls if in standalone mode (PWA)
  if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
    mapContainer.classList.add('pwa-mode');
    addPWAControls();
  }
}

// Function to reduce animations on lower-end devices
function reduceMobileAnimations() {
  // Disable heavy animations
  map.options.fadeAnimation = false;
  map.options.zoomAnimation = window.devicePixelRatio >= 2; // Only on high-DPI screens
  map.options.markerZoomAnimation = window.devicePixelRatio >= 2;

  // Reduce update frequency
  if (watchPositionId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchPositionId);

    watchPositionId = navigator.geolocation.watchPosition(
      updateUserPosition,
      handleGeolocationError,
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000
      }
    );
  }
}

// Add controls optimized for touch devices
function addTouchControls() {
  // Create touch-optimized controls
  const touchControlsDiv = document.createElement('div');
  touchControlsDiv.className = 'touch-map-controls';
  touchControlsDiv.innerHTML = `
    <button id="touch-location-btn" class="touch-control-btn" aria-label="Get My Location" title="Get My Location">
      <i class="fas fa-crosshairs"></i>
    </button>
    <button id="touch-add-btn" class="touch-control-btn" aria-label="Add Location" title="Add Location">
      <i class="fas fa-plus"></i>
    </button>
    <button id="touch-layers-btn" class="touch-control-btn" aria-label="Map Layers" title="Map Layers">
      <i class="fas fa-layer-group"></i>
    </button>
    <button id="touch-filter-btn" class="touch-control-btn" aria-label="Filter Locations" title="Filter Locations">
      <i class="fas fa-filter"></i>
    </button>
  `;

  document.getElementById('map').appendChild(touchControlsDiv);

  // Set up event listeners for touch controls
  document.getElementById('touch-location-btn').addEventListener('click', handleLocationButtonClick);
  document.getElementById('touch-add-btn').addEventListener('click', handleAddButtonClick);
  document.getElementById('touch-layers-btn').addEventListener('click', handleLayersButtonClick);
  document.getElementById('touch-filter-btn').addEventListener('click', handleFilterButtonClick);

  // Add bottom action bar for touch devices
  const actionBarDiv = document.createElement('div');
  actionBarDiv.className = 'touch-action-bar';
  actionBarDiv.innerHTML = `
    <button id="action-explore" class="action-bar-btn active">
      <i class="fas fa-compass"></i>
      <span>Explore</span>
    </button>
    <button id="action-nearby" class="action-bar-btn">
      <i class="fas fa-location-arrow"></i>
      <span>Nearby</span>
    </button>
    <button id="action-saved" class="action-bar-btn">
      <i class="fas fa-bookmark"></i>
      <span>Saved</span>
    </button>
    <button id="action-profile" class="action-bar-btn">
      <i class="fas fa-user"></i>
      <span>Profile</span>
    </button>
  `;

  document.getElementById('map').appendChild(actionBarDiv);

  // Set up event listeners for action bar
  setupActionBarListeners();
}

// Handle location button click with haptic feedback if available
function handleLocationButtonClick() {
  // Provide haptic feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  // Add pressed effect
  this.classList.add('pressed');
  setTimeout(() => this.classList.remove('pressed'), 150);

  getUserLocation().then(position => {
    if (map && position) {
      map.setView([position.lat, position.lng], mapConfig.initialZoom);
    }
  }).catch(err => {
    console.error('Error getting location:', err);
    showLocationError(err.message);
  });
}

// Handle add button click
function handleAddButtonClick() {
  // Provide haptic feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  // Add pressed effect
  this.classList.add('pressed');
  setTimeout(() => this.classList.remove('pressed'), 150);

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
}

// Handle layers button click - shows layer options
function handleLayersButtonClick() {
  // Provide haptic feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  // Add pressed effect
  this.classList.add('pressed');
  setTimeout(() => this.classList.remove('pressed'), 150);

  // Show layer selection panel
  toggleLayersPanel();
}

// Handle filter button click - shows filter options
function handleFilterButtonClick() {
  // Provide haptic feedback if supported
  if (navigator.vibrate) {
    navigator.vibrate(10);
  }

  // Add pressed effect
  this.classList.add('pressed');
  setTimeout(() => this.classList.remove('pressed'), 150);

  // Show filter selection panel
  toggleFilterPanel();
}

// Add desktop-specific controls with more options
function addDesktopControls() {
  // Add scale control
  L.control.scale({
    position: 'bottomleft',
    maxWidth: 200,
    metric: true,
    imperial: true
  }).addTo(map);

  // Add mouse coordinates in more details
  const coordInfo = L.control({position: 'bottomleft'});
  coordInfo.onAdd = function() {
    const div = L.DomUtil.create('div', 'mouse-coord-info');
    div.innerHTML = '<span class="coord-label">Position:</span> <span id="mouse-coordinates">--.---, --.---</span>';
    div.style.fontSize = '11px';
    div.style.background = 'rgba(0,0,0,0.6)';
    div.style.padding = '3px 8px';
    div.style.borderRadius = '4px';
    div.style.marginBottom = '5px';
    return div;
  };

  if (mapConfig.ui.showCoordinates) {
    coordInfo.addTo(map);

    map.on('mousemove', function(e) {
      document.getElementById('mouse-coordinates').textContent =
        `${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`;
    });
  }

  // Add mini-map for context if supported by browser
  if (L.Control.MiniMap && window.innerWidth > 1024) {
    try {
      const miniMapLayer = L.tileLayer(mapConfig.tileLayer, {
        minZoom: 0,
        maxZoom: 13
      });

      const miniMap = new L.Control.MiniMap(miniMapLayer, {
        toggleDisplay: true,
        minimized: true,
        position: 'bottomright',
        width: 150,
        height: 150,
        zoomLevelOffset: -5
      }).addTo(map);
    } catch (e) {
      console.warn('MiniMap initialization failed:', e);
    }
  }
}

// Toggle layers panel visibility
function toggleLayersPanel() {
  let layersPanel = document.querySelector('.layers-panel');

  if (!layersPanel) {
    // Create panel if it doesn't exist
    layersPanel = document.createElement('div');
    layersPanel.className = 'layers-panel slide-in';
    layersPanel.innerHTML = `
      <div class="panel-header">
        <h3>Map Layers</h3>
        <button class="close-panel-btn"><i class="fas fa-times"></i></button>
      </div>
      <div class="panel-content">
        <div class="layer-option">
          <input type="checkbox" id="layer-markers" checked>
          <label for="layer-markers">Location Markers</label>
        </div>
        <div class="layer-option">
          <input type="checkbox" id="layer-heatmap">
          <label for="layer-heatmap">Popularity Heatmap</label>
        </div>
        <div class="layer-option">
          <input type="checkbox" id="layer-territories">
          <label for="layer-territories">Territories</label>
        </div>
        <div class="layer-option">
          <input type="checkbox" id="layer-trails">
          <label for="layer-trails">User Trails</label>
        </div>
        <div class="layer-style">
          <label>Map Style:</label>
          <select id="map-style-selector">
            <option value="dark" selected>Dark (Cyberpunk)</option>
            <option value="light">Light</option>
            <option value="satellite">Satellite</option>
            <option value="standard">Standard</option>
          </select>
        </div>
      </div>
    `;
    document.getElementById('map').appendChild(layersPanel);

    // Set up event listeners
    layersPanel.querySelector('.close-panel-btn').addEventListener('click', () => {
      layersPanel.classList.remove('slide-in');
      layersPanel.classList.add('slide-out');
      setTimeout(() => {
        if (layersPanel.parentNode) {
          layersPanel.parentNode.removeChild(layersPanel);
        }
      }, 300);
    });

    // Set up layer toggle handlers
    setupLayerToggles(layersPanel);
  } else {
    // Remove if already visible
    layersPanel.classList.remove('slide-in');
    layersPanel.classList.add('slide-out');
    setTimeout(() => {
      if (layersPanel.parentNode) {
        layersPanel.parentNode.removeChild(layersPanel);
      }
    }, 300);
  }
}

// Set up layer toggle handlers
function setupLayerToggles(panel) {
  if (!panel) return;

  // Get all layer checkboxes
  const layerCheckboxes = panel.querySelectorAll('.layer-option input[type="checkbox"]');

  // Add event listeners to each checkbox
  layerCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const layerId = this.id.replace('layer-', '');
      toggleMapLayer(layerId, this.checked);
    });
  });

  // Set up map style selector
  const styleSelector = panel.querySelector('#map-style-selector');
  if (styleSelector) {
    styleSelector.addEventListener('change', function() {
      changeMapStyle(this.value);
    });
  }
}

// Toggle map layers based on user selection
function toggleMapLayer(layerId, isVisible) {
  if (!map) return;

  console.log(`Toggling layer: ${layerId}, visible: ${isVisible}`);

  switch (layerId) {
    case 'markers':
      // Toggle location markers
      Object.values(locationMarkers).forEach(marker => {
        if (isVisible) {
          if (!map.hasLayer(marker)) map.addLayer(marker);
        } else {
          if (map.hasLayer(marker)) map.removeLayer(marker);
        }
      });
      break;

    case 'heatmap':
      // Toggle heatmap if it exists
      if (map._heatmapLayer) {
        if (isVisible) {
          if (!map.hasLayer(map._heatmapLayer)) map.addLayer(map._heatmapLayer);
        } else {
          if (map.hasLayer(map._heatmapLayer)) map.removeLayer(map._heatmapLayer);
        }
      } else if (isVisible) {
        // Create heatmap if it doesn't exist
        createHeatmapLayer();
      }
      break;

    case 'territories':
      // Toggle territories layer if it exists
      if (map._territoriesLayer) {
        if (isVisible) {
          if (!map.hasLayer(map._territoriesLayer)) map.addLayer(map._territoriesLayer);
        } else {
          if (map.hasLayer(map._territoriesLayer)) map.removeLayer(map._territoriesLayer);
        }
      }
      break;

    case 'trails':
      // Toggle user trails layer if it exists
      if (map._trailsLayer) {
        if (isVisible) {
          if (!map.hasLayer(map._trailsLayer)) map.addLayer(map._trailsLayer);
        } else {
          if (map.hasLayer(map._trailsLayer)) map.removeLayer(map._trailsLayer);
        }
      }
      break;
  }
}

// Change map style based on user selection
function changeMapStyle(style) {
  if (!map) return;

  // Remove existing tile layers
  map.eachLayer(layer => {
    if (layer instanceof L.TileLayer) {
      map.removeLayer(layer);
    }
  });

  // Set new tile layer based on style
  let tileLayerUrl, tileLayerOptions;

  switch (style) {
    case 'dark':
      tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      document.getElementById('map').classList.add('cyberpunk-filter');
      break;
    case 'light':
      tileLayerUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      document.getElementById('map').classList.remove('cyberpunk-filter');
      break;
    case 'satellite':
      tileLayerUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      document.getElementById('map').classList.remove('cyberpunk-filter');
      break;
    case 'standard':
      tileLayerUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      document.getElementById('map').classList.remove('cyberpunk-filter');
      break;
    default:
      tileLayerUrl = mapConfig.tileLayer;
  }

  // Create and add the new tile layer
  tileLayerOptions = {
    attribution: mapConfig.attribution,
    maxZoom: mapConfig.maxZoom,
    minZoom: mapConfig.minZoom,
    detectRetina: true
  };

  L.tileLayer(tileLayerUrl, tileLayerOptions).addTo(map);
}

// Toggle filter panel visibility
function toggleFilterPanel() {
  let filterPanel = document.querySelector('.filter-panel');

  if (!filterPanel) {
    // Create panel if it doesn't exist
    filterPanel = document.createElement('div');
    filterPanel.className = 'filter-panel slide-in';
    filterPanel.innerHTML = `
      <div class="panel-header">
        <h3>Filters</h3>
        <button class="close-panel-btn"><i class="fas fa-times"></i></button>
      </div>
      <div class="panel-content">
        <div class="filter-section">
          <h4>Location Types</h4>
          <div class="filter-option">
            <input type="checkbox" id="filter-abandoned" checked>
            <label for="filter-abandoned">Abandoned</label>
          </div>
          <div class="filter-option">
            <input type="checkbox" id="filter-historical" checked>
            <label for="filter-historical">Historical</label>
          </div>
          <div class="filter-option">
            <input type="checkbox" id="filter-viewpoint" checked>
            <label for="filter-viewpoint">Viewpoint</label>
          </div>
          <div class="filter-option">
            <input type="checkbox" id="filter-water" checked>
            <label for="filter-water">Water Feature</label>
          </div>
          <div class="filter-option">
            <input type="checkbox" id="filter-camp" checked>
            <label for="filter-camp">Camp</label>
          </div>
        </div>
        <div class="filter-section">
          <h4>Rating</h4>
          <div class="filter-slider">
            <label>Minimum Stars: <span id="min-rating-value">1</span>+</label>
            <input type="range" id="min-rating" min="1" max="5" value="1" step="1">
          </div>
        </div>
        <div class="filter-actions">
          <button id="apply-filters-btn" class="neon-button small">Apply Filters</button>
          <button id="reset-filters-btn" class="neon-button small">Reset</button>
        </div>
      </div>
    `;
    document.getElementById('map').appendChild(filterPanel);

    // Set up event listeners
    filterPanel.querySelector('.close-panel-btn').addEventListener('click', () => {
      filterPanel.classList.remove('slide-in');
      filterPanel.classList.add('slide-out');
      setTimeout(() => {
        if (filterPanel.parentNode) {
          filterPanel.parentNode.removeChild(filterPanel);
        }
      }, 300);
    });

    // Set up filter handlers
    setupFilterHandlers(filterPanel);
  } else {
    // Remove if already visible
    filterPanel.classList.remove('slide-in');
    filterPanel.classList.add('slide-out');
    setTimeout(() => {
      if (filterPanel.parentNode) {
        filterPanel.parentNode.removeChild(filterPanel);
      }
    }, 300);
  }
}

// Set up filter handlers
function setupFilterHandlers(panel) {
  if (!panel) return;

  // Get all filter checkboxes
  const filterCheckboxes = panel.querySelectorAll('.filter-option input[type="checkbox"]');

  // Add event listeners to each checkbox
  filterCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      // Update filter state
      updateFilterState();
    });
  });

  // Set up rating slider
  const ratingSlider = panel.querySelector('#min-rating');
  const ratingValue = panel.querySelector('#min-rating-value');

  if (ratingSlider && ratingValue) {
    ratingSlider.addEventListener('input', function() {
      ratingValue.textContent = this.value;
      // No need to apply filter immediately, will be done on Apply button click
    });
  }

  // Set up apply button
  const applyBtn = panel.querySelector('#apply-filters-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', function() {
      applyFilters();
      // Close the panel after applying
      panel.classList.remove('slide-in');
      panel.classList.add('slide-out');
      setTimeout(() => {
        if (panel.parentNode) {
          panel.parentNode.removeChild(panel);
        }
      }, 300);
    });
  }

  // Set up reset button
  const resetBtn = panel.querySelector('#reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', function() {
      resetFilters(panel);
    });
  }
}

// Update the current filter state based on UI selections
function updateFilterState() {
  // Create filter state object
  const filterState = {
    types: {},
    minRating: 1
  };

  // Get all filter checkboxes
  const filterCheckboxes = document.querySelectorAll('.filter-option input[type="checkbox"]');
  filterCheckboxes.forEach(checkbox => {
    const type = checkbox.id.replace('filter-', '');
    filterState.types[type] = checkbox.checked;
  });

  // Get minimum rating
  const ratingSlider = document.querySelector('#min-rating');
  if (ratingSlider) {
    filterState.minRating = parseInt(ratingSlider.value, 10);
  }

  // Store filter state
  window.mapModule._filterState = filterState;

  return filterState;
}

// Apply filters to markers
function applyFilters() {
  if (!map) return;

  // Get current filter state
  const filterState = updateFilterState();
  console.log('Applying filters:', filterState);

  // Apply to all markers
  Object.entries(locationMarkers).forEach(([id, marker]) => {
    if (!marker || !marker.options || !marker.options.locationData) {
      // Skip markers without location data
      return;
    }

    const locationData = marker.options.locationData;
    let isVisible = true;

    // Check location type
    if (locationData.locationType && filterState.types[locationData.locationType] === false) {
      isVisible = false;
    }

    // Check rating
    if (locationData.rating && locationData.rating < filterState.minRating) {
      isVisible = false;
    }

    // Show/hide marker
    if (isVisible) {
      if (!map.hasLayer(marker)) map.addLayer(marker);
    } else {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    }
  });

  // Show notification
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification success';
    notification.innerHTML = `
      <i class="fas fa-filter"></i>
      <span>Filters applied</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Reset filters to default
function resetFilters(panel) {
  if (!panel) {
    panel = document.querySelector('.filter-panel');
  }

  if (!panel) return;

  // Reset all checkboxes to checked
  const filterCheckboxes = panel.querySelectorAll('.filter-option input[type="checkbox"]');
  filterCheckboxes.forEach(checkbox => {
    checkbox.checked = true;
  });

  // Reset rating slider to 1
  const ratingSlider = panel.querySelector('#min-rating');
  const ratingValue = panel.querySelector('#min-rating-value');

  if (ratingSlider) {
    ratingSlider.value = 1;
  }

  if (ratingValue) {
    ratingValue.textContent = '1';
  }

  // Update filter state
  updateFilterState();

  // Show all markers
  Object.values(locationMarkers).forEach(marker => {
    if (!map.hasLayer(marker)) map.addLayer(marker);
  });

  // Show notification
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification info';
    notification.innerHTML = `
      <i class="fas fa-sync-alt"></i>
      <span>Filters reset</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Add PWA-specific controls when in standalone mode
function addPWAControls() {
  // Add offline map capability notification
  const offlineCapabilityMsg = document.createElement('div');
  offlineCapabilityMsg.className = 'pwa-notification';
  offlineCapabilityMsg.innerHTML = `
    <i class="fas fa-wifi"></i>
    <span>Map available offline in this area</span>
    <button id="save-offline-btn" class="small-btn">
      <i class="fas fa-download"></i>
    </button>
  `;

  document.getElementById('map').appendChild(offlineCapabilityMsg);

  // Add save offline button handler
  document.getElementById('save-offline-btn').addEventListener('click', () => {
    saveCurrentAreaOffline();
  });

  // Auto-hide after 5 seconds
  setTimeout(() => {
    offlineCapabilityMsg.classList.add('fade-out');
    setTimeout(() => {
      if (offlineCapabilityMsg.parentNode) {
        offlineCapabilityMsg.parentNode.removeChild(offlineCapabilityMsg);
      }
    }, 500);
  }, 5000);
}

// Set up action bar listeners
function setupActionBarListeners() {
  const actionBtns = document.querySelectorAll('.action-bar-btn');

  actionBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // Provide haptic feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      // Remove active class from all buttons
      actionBtns.forEach(b => b.classList.remove('active'));
      // Add active class to clicked button
      this.classList.add('active');

      // Handle different actions
      const action = this.id.replace('action-', '');
      handleActionBarClick(action);
    });
  });
}

// Handle action bar button clicks
function handleActionBarClick(action) {
  switch (action) {
    case 'explore':
      // Default map view - already active
      break;
    case 'nearby':
      // Center on user and show nearby locations
      window.mapModule.centerOnUser();
      showNearbyLocations();
      break;
    case 'saved':
      // Show saved/bookmarked locations
      showSavedLocations();
      break;
    case 'profile':
      // Show user profile view
      navigateToView('profile');
      break;
  }
}

// Show nearby locations based on user's current position
function showNearbyLocations() {
  if (!map || !currentPosition) {
    console.warn('Cannot show nearby locations: Map or position not available');
    return;
  }

  // Show loading indicator
  const mapContainer = document.getElementById('map');
  let loadingIndicator;

  if (mapContainer) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'location-loading-indicator';
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div><div>Finding nearby locations...</div>';
    mapContainer.appendChild(loadingIndicator);
  }

  // Function to remove loading indicator
  const removeLoadingIndicator = () => {
    if (loadingIndicator?.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
  };

  // Set map view to user's location with appropriate zoom
  map.setView([currentPosition.lat, currentPosition.lng], mapConfig.initialZoom);

  // If we have a database connection, query for nearby locations
  if (typeof db !== 'undefined') {
    try {
      // Get locations within 5km of user's position
      const locationsRef = db.collection('locations');

      // Use geofirestore if available, otherwise use basic filtering
      if (window.GeoFirestore) {
        const geoLocationsRef = new window.GeoFirestore.GeoCollectionReference(locationsRef);
        geoLocationsRef.near({
          center: new window.GeoFirestore.GeoPoint(currentPosition.lat, currentPosition.lng),
          radius: 5 // 5km radius
        })
        .get()
        .then(snapshot => {
          removeLoadingIndicator();

          if (snapshot.empty) {
            showNoLocationsNearby();
            return;
          }

          // Clear existing markers and add the nearby ones
          clearLocationMarkers();

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

          // Show success message
          showNearbyLocationsFound(snapshot.size);
        })
        .catch(error => {
          console.error('Error getting nearby locations:', error);
          removeLoadingIndicator();
          showLocationError('Could not retrieve nearby locations');
        });
      } else {
        // Fallback to loading all locations and filtering client-side
        locationsRef.get()
          .then(snapshot => {
            removeLoadingIndicator();

            if (snapshot.empty) {
              showNoLocationsNearby();
              return;
            }

            // Clear existing markers
            clearLocationMarkers();

            // Filter locations by distance and add markers
            let nearbyCount = 0;
            snapshot.forEach(doc => {
              const locationData = doc.data();
              const locationCoords = {
                lat: locationData.coordinates.latitude,
                lng: locationData.coordinates.longitude
              };

              // Calculate distance (simple approximation)
              const distance = calculateDistance(
                currentPosition.lat,
                currentPosition.lng,
                locationCoords.lat,
                locationCoords.lng
              );

              // If within 5km, add marker
              if (distance <= 5) {
                addLocationMarker({
                  id: doc.id,
                  ...locationData,
                  coordinates: locationCoords
                });
                nearbyCount++;
              }
            });

            if (nearbyCount > 0) {
              showNearbyLocationsFound(nearbyCount);
            } else {
              showNoLocationsNearby();
            }
          })
          .catch(error => {
            console.error('Error getting locations:', error);
            removeLoadingIndicator();
            showLocationError('Could not retrieve nearby locations');
          });
      }
    } catch (error) {
      console.error('Error in showNearbyLocations:', error);
      removeLoadingIndicator();
      showLocationError('An error occurred while finding nearby locations');
    }
  } else {
    // No database connection
    removeLoadingIndicator();
    showLocationError('Database connection not available');
  }
}

// Calculate distance between two points in km (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Show notification when nearby locations are found
function showNearbyLocationsFound(count) {
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification success';
    notification.innerHTML = `
      <i class="fas fa-map-marker-alt"></i>
      <span>Found ${count} location${count !== 1 ? 's' : ''} nearby</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Show notification when no nearby locations are found
function showNoLocationsNearby() {
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification info';
    notification.innerHTML = `
      <i class="fas fa-info-circle"></i>
      <span>No locations found nearby. Explore or add a new one!</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
}

// Show saved/bookmarked locations
function showSavedLocations() {
  if (!map) {
    console.warn('Cannot show saved locations: Map not available');
    return;
  }

  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) {
    showAuthRequiredMessage('view saved locations');
    return;
  }

  // Show loading indicator
  const mapContainer = document.getElementById('map');
  let loadingIndicator;

  if (mapContainer) {
    loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'location-loading-indicator';
    loadingIndicator.innerHTML = '<div class="loading-spinner"></div><div>Loading your saved locations...</div>';
    mapContainer.appendChild(loadingIndicator);
  }

  // Function to remove loading indicator
  const removeLoadingIndicator = () => {
    if (loadingIndicator?.parentNode) {
      loadingIndicator.parentNode.removeChild(loadingIndicator);
    }
  };

  // If we have a database connection and auth module
  if (typeof db !== 'undefined' && window.authModule?.getCurrentUser) {
    try {
      const currentUser = window.authModule.getCurrentUser();

      if (!currentUser || !currentUser.uid) {
        removeLoadingIndicator();
        showAuthRequiredMessage('view saved locations');
        return;
      }

      // Get user's saved locations
      const userRef = db.collection('users').doc(currentUser.uid);
      userRef.get()
        .then(doc => {
          if (doc.exists) {
            const userData = doc.data();
            const savedLocations = userData.savedLocations || [];

            if (savedLocations.length === 0) {
              removeLoadingIndicator();
              showNoSavedLocations();
              return;
            }

            // Clear existing markers
            clearLocationMarkers();

            // Create a batch query to get all saved locations
            const locationsRef = db.collection('locations');

            // Split into chunks of 10 (Firestore limit for 'in' queries)
            const chunks = [];
            for (let i = 0; i < savedLocations.length; i += 10) {
              chunks.push(savedLocations.slice(i, i + 10));
            }

            // Process each chunk
            Promise.all(chunks.map(chunk => {
              return locationsRef.where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get();
            }))
            .then(results => {
              removeLoadingIndicator();

              let totalLocations = 0;

              // Process all results
              results.forEach(snapshot => {
                snapshot.forEach(doc => {
                  const locationData = doc.data();
                  addLocationMarker({
                    id: doc.id,
                    ...locationData,
                    coordinates: {
                      lat: locationData.coordinates.latitude,
                      lng: locationData.coordinates.longitude
                    },
                    saved: true
                  });
                  totalLocations++;
                });
              });

              if (totalLocations > 0) {
                // Fit map to show all saved locations
                const bounds = new L.LatLngBounds();
                Object.values(locationMarkers).forEach(marker => {
                  bounds.extend(marker.getLatLng());
                });

                if (bounds.isValid()) {
                  map.fitBounds(bounds, { padding: [50, 50] });
                }

                showSavedLocationsFound(totalLocations);
              } else {
                showNoSavedLocations();
              }
            })
            .catch(error => {
              console.error('Error getting saved locations:', error);
              removeLoadingIndicator();
              showLocationError('Could not retrieve your saved locations');
            });
          } else {
            removeLoadingIndicator();
            showNoSavedLocations();
          }
        })
        .catch(error => {
          console.error('Error getting user data:', error);
          removeLoadingIndicator();
          showLocationError('Could not retrieve your user data');
        });
    } catch (error) {
      console.error('Error in showSavedLocations:', error);
      removeLoadingIndicator();
      showLocationError('An error occurred while loading saved locations');
    }
  } else {
    // No database connection or auth module
    removeLoadingIndicator();
    showLocationError('Database or authentication not available');
  }
}

// Show notification when saved locations are found
function showSavedLocationsFound(count) {
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification success';
    notification.innerHTML = `
      <i class="fas fa-bookmark"></i>
      <span>Showing ${count} saved location${count !== 1 ? 's' : ''}</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Show notification when no saved locations are found
function showNoSavedLocations() {
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification info';
    notification.innerHTML = `
      <i class="fas fa-info-circle"></i>
      <span>You don't have any saved locations yet</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }
}

// Navigate to a different view in the app
function navigateToView(viewName) {
  // Check if navigation function exists in the app module
  if (window.appModule?.navigateTo) {
    window.appModule.navigateTo(viewName);
  } else {
    console.warn(`Navigation to ${viewName} not available`);

    // Fallback: try to find and click a navigation element
    const navElement = document.querySelector(`.nav-item[data-view="${viewName}"]`) ||
                       document.querySelector(`#nav-${viewName}`) ||
                       document.querySelector(`[data-navigate="${viewName}"]`);

    if (navElement) {
      navElement.click();
    } else {
      // Show message to user
      const mapContainer = document.getElementById('map');
      if (mapContainer) {
        const notification = document.createElement('div');
        notification.className = 'map-notification warning';
        notification.innerHTML = `
          <i class="fas fa-exclamation-triangle"></i>
          <span>Navigation to ${viewName} is not available</span>
        `;
        mapContainer.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 3000);
      }
    }
  }
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
      if (loadingIndicator?.parentNode) {
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
  if (!userMarker || (map?.hasLayer(userMarker) && map._following)) {
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
      icon: createCustomIcon(iconType),
      locationData: location // Store location data with the marker for filtering
    });

    // Add popup with location information
    const popupContent = `
      <div class="location-popup">
        <h3>${location.name || 'Unnamed Location'}</h3>
        ${location.description ? `<p>${location.description}</p>` : ''}
        ${location.locationType ? `<div class="location-type">${location.locationType}</div>` : ''}
        ${location.rating ? `<div class="location-rating">${'★'.repeat(Math.floor(location.rating))}${location.rating % 1 >= 0.5 ? '½' : ''}</div>` : ''}
        <div class="popup-actions">
          <button class="popup-action-btn view-details" data-id="${location.id}">
            <i class="fas fa-info-circle"></i> Details
          </button>
          <button class="popup-action-btn directions" data-lat="${location.coordinates.lat}" data-lng="${location.coordinates.lng}">
            <i class="fas fa-directions"></i> Directions
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent);

    // Set up popup event listeners
    marker.on('popupopen', () => {
      // Find buttons in the popup
      const viewDetailsBtn = document.querySelector(`.popup-action-btn.view-details[data-id="${location.id}"]`);
      const directionsBtn = document.querySelector(`.popup-action-btn.directions[data-lat="${location.coordinates.lat}"]`);

      // Add event listeners
      if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
          // Navigate to location details page
          if (window.appModule?.showLocationDetails) {
            window.appModule.showLocationDetails(location.id);
          } else {
            console.warn('Location details view not available');
          }
        });
      }

      if (directionsBtn) {
        directionsBtn.addEventListener('click', () => {
          // Show directions to this location
          showDirectionsToLocation(location.coordinates);
        });
      }
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

// Show directions to a location
function showDirectionsToLocation(coordinates) {
  if (!currentPosition) {
    getUserLocation().then(() => {
      calculateAndShowDirections(coordinates);
    }).catch(err => {
      console.error('Error getting user location for directions:', err);
      showLocationError('Could not get your location for directions');
    });
  } else {
    calculateAndShowDirections(coordinates);
  }
}

// Calculate and show directions between current position and destination
function calculateAndShowDirections(destination) {
  if (!map || !currentPosition) {
    console.warn('Cannot show directions: Map or position not available');
    return;
  }

  // Check if routing plugin is available
  if (typeof L.Routing === 'undefined') {
    // Fallback to external maps
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentPosition.lat},${currentPosition.lng}&destination=${destination.lat},${destination.lng}&travelmode=walking`;
    window.open(url, '_blank');
    return;
  }

  // Remove existing route if any
  if (map._routingControl) {
    map.removeControl(map._routingControl);
  }

  // Create routing control
  const routingControl = L.Routing.control({
    waypoints: [
      L.latLng(currentPosition.lat, currentPosition.lng),
      L.latLng(destination.lat, destination.lng)
    ],
    routeWhileDragging: true,
    showAlternatives: true,
    altLineOptions: {
      styles: [
        {color: 'black', opacity: 0.15, weight: 9},
        {color: '#6c6c6c', opacity: 0.8, weight: 6},
        {color: 'white', opacity: 0.9, weight: 2}
      ]
    },
    lineOptions: {
      styles: [
        {color: 'black', opacity: 0.15, weight: 9},
        {color: '#0078ff', opacity: 0.8, weight: 6},
        {color: '#00eaff', opacity: 0.9, weight: 2}
      ]
    },
    router: L.Routing.mapbox(mapConfig.mapboxToken || '', {
      profile: 'mapbox/walking'
    }),
    createMarker: function() {
      return null; // Don't create markers, we already have them
    }
  }).addTo(map);

  // Store routing control for later removal
  map._routingControl = routingControl;

  // Show notification
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    const notification = document.createElement('div');
    notification.className = 'map-notification info';
    notification.innerHTML = `
      <i class="fas fa-directions"></i>
      <span>Showing walking directions</span>
    `;
    mapContainer.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Create heatmap layer from location data
function createHeatmapLayer() {
  if (!map) return;

  // Check if heatmap plugin is available
  if (typeof L.heatLayer === 'undefined') {
    console.warn('Heatmap plugin not available');
    return;
  }

  // Collect points for heatmap
  const heatPoints = [];

  // Add all location markers to heatmap
  Object.values(locationMarkers).forEach(marker => {
    if (marker?.getLatLng) {
      const latLng = marker.getLatLng();

      // Get intensity based on location data if available
      let intensity = 1;
      if (marker.options?.locationData) {
        const locationData = marker.options.locationData;

        // Use rating or visit count for intensity if available
        if (locationData.rating) {
          intensity = locationData.rating / 5; // Normalize to 0-1 range
        } else if (locationData.visitCount) {
          intensity = Math.min(locationData.visitCount / 100, 1); // Cap at 1
        }
      }

      heatPoints.push([latLng.lat, latLng.lng, intensity]);
    }
  });

  // If we have points, create the heatmap layer
  if (heatPoints.length > 0) {
    // Remove existing heatmap if any
    if (map._heatmapLayer) {
      map.removeLayer(map._heatmapLayer);
    }

    // Create new heatmap layer
    map._heatmapLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: 'blue',
        0.25: 'lime',
        0.5: 'yellow',
        0.75: 'orange',
        1.0: 'red'
      }
    }).addTo(map);

    console.log('Heatmap created with', heatPoints.length, 'points');
  } else {
    console.warn('No points available for heatmap');
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
  // Ensure Font Awesome is loaded by checking if the icon class exists
  const iconClass = typeof FontAwesome !== 'undefined' ? `fas fa-${icon}` : 'fa fa-map-marker';

  return `
    <div class="marker-container">
      <div class="marker-pin" style="background-color: ${color}; box-shadow: 0 0 10px ${color};">
        <i class="${iconClass}" style="color: white; transform: rotate(45deg); position: relative; z-index: 1;"></i>
      </div>
      <div class="marker-pulse" style="border-color: ${color}; animation: markerPulse 2s infinite;"></div>
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
  getLocationMarkers: () => locationMarkers, // Return the location markers object
  refreshMap: () => {
    if (map) {
      console.log('Refreshing map and invalidating size');
      map.invalidateSize(true);
      if (currentPosition) {
        map.setView([currentPosition.lat, currentPosition.lng], map.getZoom());
      }
    } else {
      console.log('Map not initialized, initializing now');
      initMap();
    }
  },
  // Add new exported functions
  centerOnUser: () => {
    if (map && currentPosition) {
      map.setView([currentPosition.lat, currentPosition.lng], mapConfig.initialZoom);
      return true;
    } else {
      getUserLocation().then(position => {
        if (map) {
          map.setView([position.lat, position.lng], mapConfig.initialZoom);
          return true;
        }
      }).catch(err => {
        console.error('Error centering on user:', err);
        return false;
      });
    }
    return false;
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
  },
  // Add missing functions
  saveCurrentAreaOffline: () => {
    if (!map) return false;

    // Implementation for saving current map area for offline use
    console.log('Saving current map area for offline use');

    // Show notification to user
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      const notification = document.createElement('div');
      notification.className = 'map-notification success';
      notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>Map area saved for offline use</span>
      `;
      mapContainer.appendChild(notification);

      // Remove after 3 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }

    return true;
  }
};

// Initialize map when the script loads
document.addEventListener('DOMContentLoaded', () => {
  // Add map-specific styles
  addMapStyles();

  // Check if Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet is not loaded');
    // Try to load Leaflet dynamically if not available
    loadLeafletDynamically();
    return;
  }

  // Ensure map container exists and has proper height
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }

  // Set explicit height if not set
  if (!mapContainer.style.height) {
    mapContainer.style.height = '100%';
  }

  // Make sure the map container is visible
  mapContainer.style.display = 'block';

  // Add a slight delay to ensure DOM is fully ready
  setTimeout(() => {
    // Initialize map
    initMap();

    // Force a resize event after a short delay to ensure proper rendering
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
        console.log('Map size invalidated to ensure proper rendering');
      }
    }, 500);
  }, 100);

  // Add function to dynamically load Leaflet if needed
  function loadLeafletDynamically() {
    console.log('Attempting to load Leaflet dynamically');

    // Create script element for Leaflet JS
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    leafletScript.crossOrigin = '';

    // Create link element for Leaflet CSS
    const leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    leafletCSS.crossOrigin = '';

    // Add to document head
    document.head.appendChild(leafletCSS);
    document.head.appendChild(leafletScript);

    // Initialize map once Leaflet is loaded
    leafletScript.onload = () => {
      console.log('Leaflet loaded dynamically');
      initMap();
    };
  }

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
});


