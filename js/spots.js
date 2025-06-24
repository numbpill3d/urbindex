// Urbindex - Spots Module

// DOM Elements
const spotsContainer = document.getElementById('spots-container');
const spotsListView = document.getElementById('spots-list-view');
const spotsGridView = document.getElementById('spots-grid-view');
const spotsMapView = document.getElementById('spots-map-view');
const spotsGrid = document.getElementById('spots-grid');
const spotsMap = document.getElementById('spots-map');
const myLocationsList = document.getElementById('my-locations-list');
const playlistsContainer = document.getElementById('playlists-container');
const playlistsList = document.getElementById('playlists-list');

// Filter and view elements
const spotsFilterType = document.getElementById('spots-filter-type');
const spotsFilterVisibility = document.getElementById('spots-filter-visibility');
const spotsFilterRating = document.getElementById('spots-filter-rating');
const spotsViewList = document.getElementById('spots-view-list');
const spotsViewGrid = document.getElementById('spots-view-grid');
const spotsViewMap = document.getElementById('spots-view-map');
const spotsSearch = document.getElementById('spots-search');
const spotsSearchBtn = document.getElementById('spots-search-btn');

// Tab elements
const spotsTabAll = document.getElementById('spots-tab-all');
const spotsTabMy = document.getElementById('spots-tab-my');
const spotsTabSaved = document.getElementById('spots-tab-saved');
const spotsTabPlaylists = document.getElementById('spots-tab-playlists');
const createPlaylistBtn = document.getElementById('create-playlist-btn');

// Form elements
const locationForm = document.getElementById('location-form');
const formTabs = document.querySelectorAll('.form-tab');
const formTabContents = document.querySelectorAll('.form-tab-content');
const prevTabBtn = document.getElementById('prev-tab-btn');
const nextTabBtn = document.getElementById('next-tab-btn');
const saveLocationBtn = document.getElementById('save-location-btn');
const locationWifi = document.getElementById('location-wifi');
const wifiDetails = document.getElementById('wifi-details');
const markTrailBtn = document.getElementById('mark-trail-btn');
const trailCoordinates = document.getElementById('trail-coordinates');

// State variables
let currentFormTab = 0;
let allLocations = [];
let userLocations = [];
let savedLocations = [];
let userPlaylists = [];
let currentFilter = {
  type: 'all',
  visibility: 'all',
  rating: 'all',
  search: ''
};
let currentView = 'list';
let currentTab = 'all';
let isTrailMarkingActive = false;
let trailPath = [];
let spotsMapInstance = null;
let spotsMarkers = {};

// Performance optimization: Use a debounce function for search
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initialize spots functionality
function initSpots() {
  try {
    // Set up event listeners with error handling
    document.addEventListener('user-signed-in', async (event) => {
      try {
        const user = event.detail;
        await Promise.all([
          loadAllLocations(),
          loadUserLocations(user.uid),
          loadSavedLocations(user.uid),
          loadUserPlaylists(user.uid)
        ]);
      } catch (error) {
        console.error('Error loading user data:', error);
        showErrorMessage('Failed to load user data. Please try again.');
      }
    });

    // Optimized search with debouncing
    const debouncedSearch = debounce(() => {
      currentFilter.search = spotsSearch.value.trim().toLowerCase();
      applyFilters();
    }, 300);

    spotsSearch.addEventListener('input', debouncedSearch);
    spotsSearchBtn.addEventListener('click', debouncedSearch);
    
    // Set up filter listeners with debouncing
    const debouncedFilter = debounce(applyFilters, 100);
    spotsFilterType.addEventListener('change', debouncedFilter);
    spotsFilterVisibility.addEventListener('change', debouncedFilter);
    spotsFilterRating.addEventListener('change', debouncedFilter);
    
    // Set up view toggle listeners
    spotsViewList.addEventListener('click', () => setView('list'));
    spotsViewGrid.addEventListener('click', () => setView('grid'));
    spotsViewMap.addEventListener('click', () => setView('map'));
    
    // Set up tab listeners
    spotsTabAll.addEventListener('click', () => setTab('all'));
    spotsTabMy.addEventListener('click', () => setTab('my'));
    spotsTabSaved.addEventListener('click', () => setTab('saved'));
    spotsTabPlaylists.addEventListener('click', () => setTab('playlists'));
    
    // Initialize map
    initSpotsMap();
    
  } catch (error) {
    console.error('Error initializing spots module:', error);
    showErrorMessage('Failed to initialize spots module. Please refresh the page.');
  }
}

// Initialize the spots map
function initSpotsMap() {
  if (!spotsMap) return;
  
  // Create map instance
  spotsMapInstance = L.map(spotsMap, {
    center: [40.7128, -74.0060], // Default to NYC
    zoom: 13
  });
  
  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(spotsMapInstance);
}

// Load all locations from Firestore
function loadAllLocations() {
  // Clear existing locations
  allLocations = [];
  
  // Query Firestore for all public locations
  locationsRef.where('visibility', '==', 'public')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const locationData = doc.data();
        allLocations.push({
          id: doc.id,
          ...locationData
        });
      });
      
      // Apply filters and update view
      applyFilters();
    })
    .catch(error => {
      console.error('Error loading all locations:', error);
    });
}

// Load user's locations from Firestore
function loadUserLocations(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  // Clear existing user locations
  userLocations = [];
  
  // Query Firestore for user's locations
  locationsRef.where('createdBy', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const locationData = doc.data();
        userLocations.push({
          id: doc.id,
          ...locationData
        });
      });
      
      // Apply filters and update view
      applyFilters();
    })
    .catch(error => {
      console.error('Error loading user locations:', error);
    });
  
  // Also load any offline locations
  loadOfflineLocations().then(offlineLocations => {
    const userOfflineLocations = offlineLocations.filter(location => {
      return location.createdBy === userId;
    });
    
    userOfflineLocations.forEach(location => {
      userLocations.push(location);
    });
    
    // Apply filters and update view
    applyFilters();
  });
}

// Load user's saved locations
function loadSavedLocations(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  // Clear existing saved locations
  savedLocations = [];
  
  // Query Firestore for user's saved locations
  savedLocationsRef = firebase.firestore().collection('savedLocations');
  savedLocationsRef.where('userId', '==', userId)
    .get()
    .then(snapshot => {
      const savedLocationIds = [];
      
      snapshot.forEach(doc => {
        const savedData = doc.data();
        savedLocationIds.push(savedData.locationId);
      });
      
      if (savedLocationIds.length === 0) {
        applyFilters();
        return;
      }
      
      // Get the actual location data for each saved location
      // Firestore doesn't support 'in' queries with more than 10 items,
      // so we need to batch the requests if there are more than 10 saved locations
      const batches = [];
      for (let i = 0; i < savedLocationIds.length; i += 10) {
        const batch = savedLocationIds.slice(i, i + 10);
        batches.push(batch);
      }
      
      const promises = batches.map(batch => {
        return locationsRef.where(firebase.firestore.FieldPath.documentId(), 'in', batch)
          .get()
          .then(querySnapshot => {
            querySnapshot.forEach(doc => {
              savedLocations.push({
                id: doc.id,
                ...doc.data(),
                isSaved: true
              });
            });
          });
      });
      
      Promise.all(promises)
        .then(() => {
          // Apply filters and update view
          applyFilters();
        })
        .catch(error => {
          console.error('Error loading saved locations:', error);
        });
    })
    .catch(error => {
      console.error('Error loading saved location IDs:', error);
    });
}

// Load user's playlists
function loadUserPlaylists(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  // Clear existing playlists
  userPlaylists = [];
  
  // Query Firestore for user's playlists
  playlistsRef = firebase.firestore().collection('playlists');
  playlistsRef.where('createdBy', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        userPlaylists.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Render playlists if on playlists tab
      if (currentTab === 'playlists') {
        renderPlaylists();
      }
    })
    .catch(error => {
      console.error('Error loading user playlists:', error);
    });
}

// Apply filters to locations
function applyFilters() {
  // Get current filter values
  currentFilter.type = spotsFilterType.value;
  currentFilter.visibility = spotsFilterVisibility.value;
  currentFilter.rating = spotsFilterRating.value;
  
  // Determine which locations to filter based on current tab
  let locationsToFilter = [];
  
  switch (currentTab) {
    case 'all':
      locationsToFilter = [...allLocations, ...userLocations.filter(loc => loc.visibility === 'private')];
      break;
    case 'my':
      locationsToFilter = [...userLocations];
      break;
    case 'saved':
      locationsToFilter = [...savedLocations];
      break;
    case 'playlists':
      // Playlists are handled separately
      renderPlaylists();
      return;
  }
  
  // Apply type filter
  if (currentFilter.type !== 'all') {
    locationsToFilter = locationsToFilter.filter(location => {
      return location.category === currentFilter.type || location.locationType === currentFilter.type;
    });
  }
  
  // Apply visibility filter
  if (currentFilter.visibility !== 'all') {
    locationsToFilter = locationsToFilter.filter(location => {
      return location.visibility === currentFilter.visibility;
    });
  }
  
  // Apply rating filter
  if (currentFilter.rating !== 'all') {
    const minRating = parseInt(currentFilter.rating);
    locationsToFilter = locationsToFilter.filter(location => {
      return location.rating >= minRating;
    });
  }
  
  // Apply search filter
  if (currentFilter.search) {
    locationsToFilter = locationsToFilter.filter(location => {
      const searchText = currentFilter.search.toLowerCase();
      return (
        (location.name && location.name.toLowerCase().includes(searchText)) ||
        (location.description && location.description.toLowerCase().includes(searchText)) ||
        (location.notes && location.notes.toLowerCase().includes(searchText)) ||
        (location.address && location.address.toLowerCase().includes(searchText))
      );
    });
  }
  
  // Render the filtered locations
  renderLocations(locationsToFilter);
}

// Render locations based on current view
function renderLocations(locations) {
  // Clear existing content
  myLocationsList.innerHTML = '';
  spotsGrid.innerHTML = '';
  
  if (locations.length === 0) {
    showEmptyState();
    return;
  }
  
  // Render based on current view
  switch (currentView) {
    case 'list':
      renderListView(locations);
      break;
    case 'grid':
      renderGridView(locations);
      break;
    case 'map':
      renderMapView(locations);
      break;
  }
}

// Render list view
function renderListView(locations) {
  locations.forEach(location => {
    addLocationToList(location.id, location, location.isOffline);
  });
}

// Enhanced renderGridView with lazy loading
function renderGridView(locations) {
  if (!spotsGrid) return;
  
  spotsGrid.innerHTML = '';
  
  if (locations.length === 0) {
    showEmptyState();
    return;
  }

  const fragment = document.createDocumentFragment();
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.classList.remove('loading');
            observer.unobserve(img);
          }
        }
      });
    },
    { rootMargin: '50px 0px', threshold: 0.1 }
  );
  
  locations.forEach(location => {
    const item = document.createElement('div');
    item.className = 'spot-grid-item';
    item.setAttribute('role', 'article');
    
    const img = document.createElement('img');
    img.className = 'spot-grid-image loading';
    img.alt = `${location.name} preview`;
    img.dataset.src = location.imageUrl || 'path/to/placeholder.jpg';
    imageObserver.observe(img);
    
    const content = document.createElement('div');
    content.className = 'spot-grid-content';
    content.innerHTML = `
      <h3 class="spot-grid-title">${escapeHtml(location.name)}</h3>
      <p>${escapeHtml(location.description || '')}</p>
      <div class="spot-grid-meta">
        <span>${location.type}</span>
        <span>${location.rating || 'N/A'} ★</span>
      </div>
    `;
    
    item.appendChild(img);
    item.appendChild(content);
    fragment.appendChild(item);
  });
  
  spotsGrid.appendChild(fragment);
}

// Render map view
function renderMapView(locations) {
  if (!spotsMapInstance) {
    initSpotsMap();
  }
  
  // Clear existing markers
  if (spotsMapInstance) {
    for (const id in spotsMarkers) {
      spotsMapInstance.removeLayer(spotsMarkers[id]);
    }
    spotsMarkers = {};
    
    // Add markers for each location
    locations.forEach(location => {
      const lat = location.coordinates.latitude || location.coordinates.lat;
      const lng = location.coordinates.longitude || location.coordinates.lng;
      
      if (lat && lng) {
        const marker = L.marker([lat, lng]).addTo(spotsMapInstance);
        
        // Create popup content
        const popupContent = `
          <div class="map-popup">
            <h3>${location.name}</h3>
            <p>${location.description || 'No description'}</p>
            <div class="popup-meta">
              <span class="popup-category">${utilsModule.getCategoryLabel(location.category)}</span>
              <span class="popup-rating">${'★'.repeat(Math.round(location.rating || 0))}</span>
            </div>
            <button class="view-details-btn neon-button small" data-id="${location.id}">View Details</button>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        spotsMarkers[location.id] = marker;
      }
    });
    
    // Fit map to markers
    if (Object.keys(spotsMarkers).length > 0) {
      const group = new L.featureGroup(Object.values(spotsMarkers));
      spotsMapInstance.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }
}

// Show empty state
function showEmptyState() {
  let message = '';
  
  switch (currentTab) {
    case 'all':
      message = 'No locations found matching your filters.';
      break;
    case 'my':
      message = 'You haven\'t added any locations yet. Tap the + button on the map to add your first location!';
      break;
    case 'saved':
      message = 'You haven\'t saved any locations yet. Browse the map and save locations you\'re interested in!';
      break;
    case 'playlists':
      message = 'You haven\'t created any playlists yet. Create a playlist to organize your favorite spots!';
      break;
  }
  
  const emptyState = `
    <div class="empty-state">
      <p>${message}</p>
    </div>
  `;
  
  if (currentView === 'list') {
    myLocationsList.innerHTML = emptyState;
  } else if (currentView === 'grid') {
    spotsGrid.innerHTML = emptyState;
  }
}

// Set current view
function setView(view) {
  currentView = view;
  
  // Update active button
  spotsViewList.classList.toggle('active', view === 'list');
  spotsViewGrid.classList.toggle('active', view === 'grid');
  spotsViewMap.classList.toggle('active', view === 'map');
  
  // Show/hide view containers
  spotsListView.classList.toggle('active', view === 'list');
  spotsGridView.classList.toggle('active', view === 'grid');
  spotsMapView.classList.toggle('active', view === 'map');
  
  // Apply filters to update view
  applyFilters();
  
  // Initialize map if needed
  if (view === 'map' && !spotsMapInstance) {
    initSpotsMap();
  }
}

// Set current tab
function setTab(tab) {
  currentTab = tab;
  
  // Update active tab
  spotsTabAll.classList.toggle('active', tab === 'all');
  spotsTabMy.classList.toggle('active', tab === 'my');
  spotsTabSaved.classList.toggle('active', tab === 'saved');
  spotsTabPlaylists.classList.toggle('active', tab === 'playlists');
  
  // Show/hide playlists container
  spotsContainer.classList.toggle('hidden', tab === 'playlists');
  playlistsContainer.classList.toggle('hidden', tab !== 'playlists');
  
  // Apply filters or render playlists
  if (tab === 'playlists') {
    renderPlaylists();
  } else {
    applyFilters();
  }
}

// Render playlists
function renderPlaylists() {
  // Clear existing playlists
  playlistsList.innerHTML = '';
  
  if (userPlaylists.length === 0) {
    playlistsList.innerHTML = `
      <div class="empty-state">
        <p>You haven't created any playlists yet.</p>
        <p>Create a playlist to organize your favorite spots!</p>
      </div>
    `;
    return;
  }
  
  // Render each playlist
  userPlaylists.forEach(playlist => {
    const playlistItem = document.createElement('li');
    playlistItem.className = 'playlist-item';
    playlistItem.dataset.id = playlist.id;
    
    // Format date
    let dateDisplay = 'Unknown date';
    if (playlist.createdAt) {
      if (typeof playlist.createdAt === 'string') {
        dateDisplay = new Date(playlist.createdAt).toLocaleDateString();
      } else if (playlist.createdAt.toDate) {
        dateDisplay = playlist.createdAt.toDate().toLocaleDateString();
      }
    }
    
    // Create content
    playlistItem.innerHTML = `
      <div class="playlist-header">
        <h3 class="playlist-title">${playlist.name}</h3>
        <p class="playlist-description">${playlist.description || 'No description'}</p>
      </div>
      <div class="playlist-content">
        <div class="playlist-stats">
          <span class="playlist-date">Created: ${dateDisplay}</span>
          <span class="playlist-locations">${playlist.locationIds ? playlist.locationIds.length : 0} locations</span>
        </div>
        <div class="playlist-actions">
          <button class="view-playlist-btn neon-button small" data-id="${playlist.id}">View</button>
          <button class="edit-playlist-btn neon-button small" data-id="${playlist.id}">Edit</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    const viewBtn = playlistItem.querySelector('.view-playlist-btn');
    viewBtn.addEventListener('click', () => viewPlaylist(playlist.id));
    
    const editBtn = playlistItem.querySelector('.edit-playlist-btn');
    editBtn.addEventListener('click', () => editPlaylist(playlist.id));
    
    // Add to list
    playlistsList.appendChild(playlistItem);
  });
}

// Show create playlist modal
function showCreatePlaylistModal() {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'playlist-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>Create New Playlist</h2>
      <form id="playlist-form">
        <div class="form-group">
          <label for="playlist-name">Name</label>
          <input type="text" id="playlist-name" required>
        </div>
        <div class="form-group">
          <label for="playlist-description">Description</label>
          <textarea id="playlist-description" rows="3"></textarea>
        </div>
        <div class="form-group">
          <label for="playlist-visibility">Visibility</label>
          <select id="playlist-visibility">
            <option value="private">Private - Only visible to you</option>
            <option value="public">Public - Visible to everyone</option>
          </select>
        </div>
        <button type="submit" class="neon-button">Create Playlist</button>
      </form>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  const form = modal.querySelector('#playlist-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('playlist-name').value;
    const description = document.getElementById('playlist-description').value;
    const visibility = document.getElementById('playlist-visibility').value;
    
    createPlaylist(name, description, visibility);
    document.body.removeChild(modal);
  });
}

// Create a new playlist
function createPlaylist(name, description, visibility) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to create playlists');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  const playlistData = {
    name,
    description,
    visibility,
    createdBy: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    locationIds: []
  };
  
  playlistsRef.add(playlistData)
    .then(docRef => {
      console.log('Playlist created with ID:', docRef.id);
      
      // Add to local playlists
      userPlaylists.push({
        id: docRef.id,
        ...playlistData
      });
      
      // Render playlists
      renderPlaylists();
    })
    .catch(error => {
      console.error('Error creating playlist:', error);
      alert('Error creating playlist. Please try again.');
    });
}

// View a playlist
function viewPlaylist(playlistId) {
  const playlist = userPlaylists.find(p => p.id === playlistId);
  
  if (!playlist) {
    console.error('Playlist not found:', playlistId);
    return;
  }
  
  // If no locations in playlist
  if (!playlist.locationIds || playlist.locationIds.length === 0) {
    alert('This playlist is empty. Add locations to view it.');
    return;
  }
  
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'playlist-view-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>${playlist.name}</h2>
      <p>${playlist.description || 'No description'}</p>
      <div class="playlist-locations-container">
        <h3>Locations</h3>
        <ul id="playlist-locations-list" class="playlist-locations-list"></ul>
      </div>
      <div class="modal-actions">
        <button id="view-on-map-btn" class="neon-button">View All on Map</button>
      </div>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  const viewOnMapBtn = modal.querySelector('#view-on-map-btn');
  viewOnMapBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
    viewPlaylistOnMap(playlist);
  });
  
  // Load and display playlist locations
  const locationsList = modal.querySelector('#playlist-locations-list');
  loadPlaylistLocations(playlist.locationIds, locationsList);
}

// Load playlist locations
function loadPlaylistLocations(locationIds, container) {
  if (!locationIds || locationIds.length === 0 || !container) {
    return;
  }
  
  // Firestore doesn't support 'in' queries with more than 10 items,
  // so we need to batch the requests if there are more than 10 locations
  const batches = [];
  for (let i = 0; i < locationIds.length; i += 10) {
    const batch = locationIds.slice(i, i + 10);
    batches.push(batch);
  }
  
  const promises = batches.map(batch => {
    return locationsRef.where(firebase.firestore.FieldPath.documentId(), 'in', batch)
      .get()
      .then(querySnapshot => {
        querySnapshot.forEach(doc => {
          const location = {
            id: doc.id,
            ...doc.data()
          };
          
          // Create list item
          const listItem = document.createElement('li');
          listItem.className = 'playlist-location-item';
          
          // Format date
          let dateDisplay = 'Unknown date';
          if (location.createdAt) {
            if (typeof location.createdAt === 'string') {
              dateDisplay = new Date(location.createdAt).toLocaleDateString();
            } else if (location.createdAt.toDate) {
              dateDisplay = location.createdAt.toDate().toLocaleDateString();
            }
          }
          
          // Create content
          listItem.innerHTML = `
            <div class="location-item-header">
              <h4>${location.name}</h4>
              <div class="location-badges">
                <span class="location-category">${utilsModule.getCategoryLabel(location.category)}</span>
              </div>
            </div>
            <p class="location-description">${location.description || 'No description'}</p>
            <div class="location-meta">
              <span class="location-date">${dateDisplay}</span>
              <span class="location-rating">${'★'.repeat(Math.round(location.rating || 0))}</span>
            </div>
            <button class="view-location-btn neon-button small" data-id="${location.id}">View Details</button>
          `;
          
          // Add event listener for view button
          const viewBtn = listItem.querySelector('.view-location-btn');
          viewBtn.addEventListener('click', () => {
            // Show the map view
            document.getElementById('map-view-btn').click();
            
            // Center map on this location
            if (typeof mapModule !== 'undefined' && mapModule.map) {
              const lat = location.coordinates.latitude || location.coordinates.lat;
              const lng = location.coordinates.longitude || location.coordinates.lng;
              
              mapModule.map.setView([lat, lng], 16);
              
              // Open the popup if marker exists
              if (mapModule.locationMarkers?.[location.id]) {
                mapModule.locationMarkers[location.id].openPopup();
              }
            }
          });
          
          // Add to list
          container.appendChild(listItem);
        });
      });
  });
  
  Promise.all(promises)
    .catch(error => {
      console.error('Error loading playlist locations:', error);
    });
}

// View playlist on map
function viewPlaylistOnMap(playlist) {
  if (!playlist || !playlist.locationIds || playlist.locationIds.length === 0) {
    return;
  }
  
  // Show the map view
  document.getElementById('map-view-btn').click();
  
  // Load locations and center map
  loadPlaylistLocations(playlist.locationIds, document.createElement('div'))
    .then(locations => {
      if (locations && locations.length > 0) {
        // Create bounds
        const bounds = [];
        
        locations.forEach(location => {
          const lat = location.coordinates.latitude || location.coordinates.lat;
          const lng = location.coordinates.longitude || location.coordinates.lng;
          
          if (lat && lng) {
            bounds.push([lat, lng]);
          }
        });
        
        if (bounds.length > 0) {
          // Fit map to bounds
          mapModule.map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    });
}

// Edit a playlist
function editPlaylist(playlistId) {
  const playlist = userPlaylists.find(p => p.id === playlistId);
  
  if (!playlist) {
    console.error('Playlist not found:', playlistId);
    return;
  }
  
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'modal active';
  modal.id = 'playlist-edit-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>Edit Playlist</h2>
      <form id="playlist-edit-form">
        <div class="form-group">
          <label for="playlist-name-edit">Name</label>
          <input type="text" id="playlist-name-edit" value="${playlist.name}" required>
        </div>
        <div class="form-group">
          <label for="playlist-description-edit">Description</label>
          <textarea id="playlist-description-edit" rows="3">${playlist.description || ''}</textarea>
        </div>
        <div class="form-group">
          <label for="playlist-visibility-edit">Visibility</label>
          <select id="playlist-visibility-edit">
            <option value="private" ${playlist.visibility === 'private' ? 'selected' : ''}>Private - Only visible to you</option>
            <option value="public" ${playlist.visibility === 'public' ? 'selected' : ''}>Public - Visible to everyone</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="submit" class="neon-button">Save Changes</button>
          <button type="button" id="delete-playlist-btn" class="neon-button danger">Delete Playlist</button>
        </div>
      </form>
    </div>
  `;
  
  // Add to body
  document.body.appendChild(modal);
  
  // Add event listeners
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  const form = modal.querySelector('#playlist-edit-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = document.getElementById('playlist-name-edit').value;
    const description = document.getElementById('playlist-description-edit').value;
    const visibility = document.getElementById('playlist-visibility-edit').value;
    
    updatePlaylist(playlistId, name, description, visibility);
    document.body.removeChild(modal);
  });
  
  const deleteBtn = modal.querySelector('#delete-playlist-btn');
  deleteBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this playlist?')) {
      deletePlaylist(playlistId);
      document.body.removeChild(modal);
    }
  });
}

// Update a playlist
function updatePlaylist(playlistId, name, description, visibility) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to update playlists');
    return;
  }
  
  playlistsRef.doc(playlistId).update({
    name,
    description,
    visibility,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then(() => {
      console.log('Playlist updated successfully');
      
      // Update local playlist
      const index = userPlaylists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        userPlaylists[index].name = name;
        userPlaylists[index].description = description;
        userPlaylists[index].visibility = visibility;
        userPlaylists[index].updatedAt = new Date();
      }
      
      // Render playlists
      renderPlaylists();
    })
    .catch(error => {
      console.error('Error updating playlist:', error);
      alert('Error updating playlist. Please try again.');
    });
}

// Delete a playlist
function deletePlaylist(playlistId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to delete playlists');
    return;
  }
  
  playlistsRef.doc(playlistId).delete()
    .then(() => {
      console.log('Playlist deleted successfully');
      
      // Remove from local playlists
      const index = userPlaylists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        userPlaylists.splice(index, 1);
      }
      
      // Render playlists
      renderPlaylists();
    })
    .catch(error => {
      console.error('Error deleting playlist:', error);
      alert('Error deleting playlist. Please try again.');
    });
}

// Add location to playlist
function addLocationToPlaylist(locationId, playlistId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to add locations to playlists');
    return;
  }
  
  // Get the playlist
  const playlist = userPlaylists.find(p => p.id === playlistId);
  
  if (!playlist) {
    console.error('Playlist not found:', playlistId);
    return;
  }
  
  // Check if location is already in playlist
  if (playlist.locationIds?.includes(locationId)) {
    alert('This location is already in the playlist');
    return;
  }
  
  // Add location to playlist
  const locationIds = playlist.locationIds || [];
  locationIds.push(locationId);
  
  playlistsRef.doc(playlistId).update({
    locationIds,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then(() => {
      console.log('Location added to playlist successfully');
      
      // Update local playlist
      const index = userPlaylists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        userPlaylists[index].locationIds = locationIds;
        userPlaylists[index].updatedAt = new Date();
      }
      
      alert('Location added to playlist successfully');
    })
    .catch(error => {
      console.error('Error adding location to playlist:', error);
      alert('Error adding location to playlist. Please try again.');
    });
}

// Remove location from playlist
function removeLocationFromPlaylist(locationId, playlistId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to remove locations from playlists');
    return;
  }
  
  // Get the playlist
  const playlist = userPlaylists.find(p => p.id === playlistId);
  
  if (!playlist) {
    console.error('Playlist not found:', playlistId);
    return;
  }
  
  // Check if location is in playlist
  if (!playlist.locationIds || !playlist.locationIds.includes(locationId)) {
    alert('This location is not in the playlist');
    return;
  }
  
  // Remove location from playlist
  const locationIds = playlist.locationIds.filter(id => id !== locationId);
  
  playlistsRef.doc(playlistId).update({
    locationIds,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
    .then(() => {
      console.log('Location removed from playlist successfully');
      
      // Update local playlist
      const index = userPlaylists.findIndex(p => p.id === playlistId);
      if (index !== -1) {
        userPlaylists[index].locationIds = locationIds;
        userPlaylists[index].updatedAt = new Date();
      }
      
      alert('Location removed from playlist successfully');
    })
    .catch(error => {
      console.error('Error removing location from playlist:', error);
      alert('Error removing location from playlist. Please try again.');
    });
}

// Switch form tab
function switchFormTab(tabIndex) {
  if (tabIndex < 0 || tabIndex >= formTabs.length) {
    return;
  }
  
  // Update current tab
  currentFormTab = tabIndex;
  
  // Update active tab
  formTabs.forEach((tab, index) => {
    tab.classList.toggle('active', index === tabIndex);
  });
  
  // Show/hide tab content
  formTabContents.forEach((content, index) => {
    content.classList.toggle('active', index === tabIndex);
  });
  
  // Update navigation buttons
  prevTabBtn.disabled = tabIndex === 0;
  
  if (tabIndex === formTabs.length - 1) {
    nextTabBtn.classList.add('hidden');
    saveLocationBtn.classList.remove('hidden');
  } else {
    nextTabBtn.classList.remove('hidden');
    saveLocationBtn.classList.add('hidden');
  }
}

// Toggle trail marking
function toggleTrailMarking() {
  if (!mapModule || !mapModule.map) {
    alert('Map not available');
    return;
  }
  
  isTrailMarkingActive = !isTrailMarkingActive;
  
  if (isTrailMarkingActive) {
    // Start marking trail
    markTrailBtn.textContent = 'Finish Trail';
    markTrailBtn.classList.add('active');
    
    // Clear existing trail
    trailPath = [];
    
    // Add click listener to map
    mapModule.map.on('click', onMapClick);
    
    // Show instructions
    alert('Click on the map to mark trail points. Click "Finish Trail" when done.');
  } else {
    // Finish marking trail
    markTrailBtn.textContent = 'Mark Trail on Map';
    markTrailBtn.classList.remove('active');
    
    // Remove click listener
    mapModule.map.off('click', onMapClick);
    
    // Save trail coordinates
    if (trailPath.length > 0) {
      trailCoordinates.textContent = JSON.stringify(trailPath);
      trailCoordinates.classList.remove('hidden');
    }
  }
}

// Handle map click for trail marking
function onMapClick(e) {
  if (!isTrailMarkingActive) return;
  
  // Add point to trail
  trailPath.push({
    lat: e.latlng.lat,
    lng: e.latlng.lng
  });
  
  // Add marker
  L.marker(e.latlng).addTo(mapModule.map);
  
  // If at least 2 points, draw line
  if (trailPath.length >= 2) {
    const lastIndex = trailPath.length - 1;
    const start = [trailPath[lastIndex - 1].lat, trailPath[lastIndex - 1].lng];
    const end = [trailPath[lastIndex].lat, trailPath[lastIndex].lng];
    
    L.polyline([start, end], {
      color: 'var(--neon-green)',
      weight: 3,
      opacity: 0.7
    }).addTo(mapModule.map);
  }
}

// Save enhanced location with new fields
async function saveEnhancedLocation(e) {
  e.preventDefault();
  
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to add locations');
    return;
  }
  
  const form = document.getElementById('location-form');
  const user = authModule.getCurrentUser();
  const imageInput = document.getElementById('location-image');
  
  // Get form values
  const locationData = {
    name: document.getElementById('location-name').value,
    category: document.getElementById('location-category').value,
    description: document.getElementById('location-description').value,
    notes: document.getElementById('location-notes').value || '',
    riskLevel: document.getElementById('location-risk').value,
    locationType: document.getElementById('location-type').value,
    visibility: document.getElementById('location-visibility').value,
    coordinates: new firebase.firestore.GeoPoint(
      parseFloat(form.dataset.lat),
      parseFloat(form.dataset.lng)
    ),
    createdBy: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    upvotes: 0,
    downvotes: 0,
    rating: 0,
    ratingCount: 0,
    imageUrls: [],
    claimedBy: null,
    claimedAt: null,
    crewId: null,
    
    // New fields
    address: document.getElementById('location-address').value || '',
    safetyRating: parseInt(document.getElementById('location-safety').value),
    popularity: document.getElementById('location-popularity').value,
    accessibility: document.getElementById('location-accessibility').value,
    bestTimeToVisit: document.getElementById('location-best-time').value,
    features: Array.from(document.querySelectorAll('input[name="features"]:checked')).map(cb => cb.value),
    hasWifi: document.getElementById('location-wifi').checked,
    wifiDetails: document.getElementById('location-wifi').checked ? {
      name: document.getElementById('location-wifi-name').value || '',
      password: document.getElementById('location-wifi-password').value || ''
    } : null,
    trailPath: trailPath.length > 0 ? trailPath : null
  };
  
  // Check if we're online
  if (navigator.onLine) {
    try {
      // Upload images if any
      if (imageInput.files.length > 0) {
        const imageUrls = await uploadImages(imageInput.files, user.uid);
        locationData.imageUrls = imageUrls;
      }
      
      // Save to Firestore
      const docRef = await locationsRef.add(locationData);
      console.log('Location added with ID:', docRef.id);
      
      // Add marker to map
      if (typeof mapModule !== 'undefined' && mapModule.addLocationMarker) {
        mapModule.addLocationMarker({
          id: docRef.id,
          ...locationData,
          coordinates: { 
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          }
        });
      }
      
      // Update user's location count
      updateUserLocationCount(user.uid);
      
      // Close modal
      closeLocationModal();
      
      // Refresh locations
      loadAllLocations();
      loadUserLocations(user.uid);
    } catch (error) {
      console.error('Error adding location:', error);
      alert('Error saving location. Please try again.');
    }
  } else {
    // Save to IndexedDB for offline use
    try {
      await saveLocationOffline(locationData);
      
      // Add marker to map (temporary until sync)
      const tempId = 'temp-' + Date.now();
      if (typeof mapModule !== 'undefined' && mapModule.addLocationMarker) {
        mapModule.addLocationMarker({
          id: tempId,
          ...locationData,
          coordinates: { 
            lat: locationData.coordinates.latitude, 
            lng: locationData.coordinates.longitude 
          },
          isOffline: true
        });
      }
      
      // Close modal
      closeLocationModal();
      
      // Show offline indicator
      showOfflineIndicator();
    } catch (error) {
      console.error('Error saving location offline:', error);
      alert('Error saving location offline. Please try again.');
    }
  }
}

// Utility function to safely escape HTML
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Show error message to user
function showErrorMessage(message) {
  const errorContainer = document.createElement('div');
  errorContainer.className = 'error-message';
  errorContainer.setAttribute('role', 'alert');
  errorContainer.textContent = message;
  
  const existingError = document.querySelector('.error-message');
  if (existingError) {
    existingError.remove();
  }
  
  document.body.appendChild(errorContainer);
  setTimeout(() => errorContainer.remove(), 5000);
}

// Clear locations
function clearLocations() {
  allLocations = [];
  userLocations = [];
  savedLocations = [];
  
  // Clear UI
  myLocationsList.innerHTML = '';
  spotsGrid.innerHTML = '';
  
  // Clear map markers
  if (spotsMapInstance) {
    for (const id in spotsMarkers) {
      spotsMapInstance.removeLayer(spotsMarkers[id]);
    }
    spotsMarkers = {};
  }
}

// Clear playlists
function clearPlaylists() {
  userPlaylists = [];
  
  // Clear UI
  playlistsList.innerHTML = '';
}

// Export functions for use in other modules
window.spotsModule = {
  initSpots,
  loadAllLocations,
  loadUserLocations,
  loadSavedLocations,
  loadUserPlaylists,
  applyFilters,
  setView,
  setTab,
  addLocationToPlaylist,
  removeLocationFromPlaylist,
  switchFormTab
};
