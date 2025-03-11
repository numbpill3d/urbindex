// Urbindex - Locations Module

// DOM Elements
const myLocationsList = document.getElementById('my-locations-list');

// IndexedDB database name and version
const DB_NAME = 'urbindex-db';
const DB_VERSION = 1;
const LOCATIONS_STORE = 'offlineLocations';
const USER_LOCATIONS_STORE = 'userLocations';

// Initialize locations functionality
function initLocations() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    loadUserLocations(user.uid);
  });
  
  document.addEventListener('user-signed-out', () => {
    clearUserLocationsList();
  });
  
  // Initialize IndexedDB
  initIndexedDB();
  
  // Set up online/offline event listeners
  window.addEventListener('online', syncOfflineLocations);
  window.addEventListener('offline', () => {
    console.log('App is offline. Changes will be saved locally.');
  });
}

// Initialize IndexedDB
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      console.log('IndexedDB initialized successfully');
      resolve(event.target.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(LOCATIONS_STORE)) {
        db.createObjectStore(LOCATIONS_STORE, { keyPath: 'id', autoIncrement: true });
        console.log(`Created ${LOCATIONS_STORE} object store`);
      }
      
      if (!db.objectStoreNames.contains(USER_LOCATIONS_STORE)) {
        db.createObjectStore(USER_LOCATIONS_STORE, { keyPath: 'id' });
        console.log(`Created ${USER_LOCATIONS_STORE} object store`);
      }
    };
  });
}

// Open IndexedDB connection
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

// Save location to IndexedDB for offline use
function saveLocationOffline(locationData) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([LOCATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(LOCATIONS_STORE);
      
      // Generate a temporary ID
      const tempLocation = {
        ...locationData,
        id: 'temp-' + Date.now(),
        isOffline: true,
        pendingSync: true,
        createdAt: new Date().toISOString() // Use ISO string since we can't store Firestore Timestamp in IndexedDB
      };
      
      const request = store.add(tempLocation);
      
      request.onsuccess = () => {
        console.log('Location saved offline');
        resolve(tempLocation);
      };
      
      request.onerror = (event) => {
        console.error('Error saving location offline:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      console.error('Error in saveLocationOffline:', error);
      reject(error);
    }
  });
}

// Load offline locations from IndexedDB
function loadOfflineLocations() {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([LOCATIONS_STORE], 'readonly');
      const store = transaction.objectStore(LOCATIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        const locations = request.result;
        console.log(`Loaded ${locations.length} offline locations`);
        resolve(locations);
      };
      
      request.onerror = (event) => {
        console.error('Error loading offline locations:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      console.error('Error in loadOfflineLocations:', error);
      reject(error);
    }
  });
}

// Sync offline locations with Firestore when online
function syncOfflineLocations() {
  if (!navigator.onLine) {
    console.log('Still offline, cannot sync locations');
    return Promise.resolve();
  }
  
  if (!authModule.isAuthenticated()) {
    console.log('User not authenticated, cannot sync locations');
    return Promise.resolve();
  }
  
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Syncing offline locations...');
      
      const db = await openDB();
      const transaction = db.transaction([LOCATIONS_STORE], 'readonly');
      const store = transaction.objectStore(LOCATIONS_STORE);
      const request = store.getAll();
      
      request.onsuccess = async () => {
        const offlineLocations = request.result;
        
        if (offlineLocations.length === 0) {
          console.log('No offline locations to sync');
          resolve();
          return;
        }
        
        console.log(`Found ${offlineLocations.length} offline locations to sync`);
        
        // Process each offline location
        const syncPromises = offlineLocations.map(async (location) => {
          try {
            // Convert back to Firestore GeoPoint if needed
            if (typeof location.coordinates === 'object' && 
                'latitude' in location.coordinates && 
                'longitude' in location.coordinates) {
              location.coordinates = new firebase.firestore.GeoPoint(
                location.coordinates.latitude,
                location.coordinates.longitude
              );
            }
            
            // Remove temporary fields
            delete location.id;
            delete location.isOffline;
            delete location.pendingSync;
            
            // Add to Firestore
            const docRef = await locationsRef.add({
              ...location,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Synced offline location to Firestore:', docRef.id);
            
            // Remove from IndexedDB
            await deleteOfflineLocation(location.id);
            
            return { success: true, id: docRef.id };
          } catch (error) {
            console.error('Error syncing location:', error);
            return { success: false, error };
          }
        });
        
        const results = await Promise.all(syncPromises);
        console.log('Sync results:', results);
        
        // Refresh the map
        if (typeof mapModule !== 'undefined' && mapModule.loadLocations) {
          mapModule.loadLocations();
        }
        
        resolve(results);
      };
      
      request.onerror = (event) => {
        console.error('Error getting offline locations for sync:', event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      console.error('Error in syncOfflineLocations:', error);
      reject(error);
    }
  });
}

// Delete an offline location from IndexedDB
function deleteOfflineLocation(id) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await openDB();
      const transaction = db.transaction([LOCATIONS_STORE], 'readwrite');
      const store = transaction.objectStore(LOCATIONS_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`Deleted offline location: ${id}`);
        resolve();
      };
      
      request.onerror = (event) => {
        console.error(`Error deleting offline location ${id}:`, event.target.error);
        reject(event.target.error);
      };
      
      transaction.oncomplete = () => {
        db.close();
      };
    } catch (error) {
      console.error('Error in deleteOfflineLocation:', error);
      reject(error);
    }
  });
}

// Load user's locations from Firestore
function loadUserLocations(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  // Clear the list first
  clearUserLocationsList();
  
  // Query Firestore for user's locations
  locationsRef.where('createdBy', '==', userId)
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        showEmptyUserLocations();
        return;
      }
      
      // Process each location
      snapshot.forEach(doc => {
        const locationData = doc.data();
        addLocationToList(doc.id, locationData);
      });
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
      addLocationToList(location.id, location, true);
    });
  });
}

// Add a location to the user's locations list
function addLocationToList(id, locationData, isOffline = false) {
  // Create list item
  const listItem = document.createElement('li');
  listItem.className = 'list-item location-item';
  listItem.dataset.id = id;
  
  // Format date
  let dateDisplay = 'Unknown date';
  if (locationData.createdAt) {
    if (typeof locationData.createdAt === 'string') {
      // ISO string from IndexedDB
      dateDisplay = new Date(locationData.createdAt).toLocaleDateString();
    } else if (locationData.createdAt.toDate) {
      // Firestore Timestamp
      dateDisplay = locationData.createdAt.toDate().toLocaleDateString();
    }
  }
  
  // Create content
  listItem.innerHTML = `
    <div class="location-item-header">
      <h3>${locationData.name}</h3>
      <span class="location-category">${getCategoryLabel(locationData.category)}</span>
    </div>
    <p class="location-description">${locationData.description || 'No description'}</p>
    <div class="location-meta">
      <span class="location-date">${dateDisplay}</span>
      <div class="location-stats">
        <span class="location-stat">👍 ${locationData.upvotes || 0}</span>
        <span class="location-stat">👎 ${locationData.downvotes || 0}</span>
      </div>
    </div>
    ${isOffline ? '<div class="offline-badge">Saved Offline</div>' : ''}
  `;
  
  // Add click event to show on map
  listItem.addEventListener('click', () => {
    // Show the map view
    document.getElementById('map-view-btn').click();
    
    // Center map on this location
    if (typeof mapModule !== 'undefined' && mapModule.map) {
      const lat = locationData.coordinates.latitude || locationData.coordinates.lat;
      const lng = locationData.coordinates.longitude || locationData.coordinates.lng;
      
      mapModule.map.setView([lat, lng], 16);
      
      // Open the popup if marker exists
      if (mapModule.locationMarkers && mapModule.locationMarkers[id]) {
        mapModule.locationMarkers[id].openPopup();
      }
    }
  });
  
  // Add to the list
  myLocationsList.appendChild(listItem);
}

// Clear the user locations list
function clearUserLocationsList() {
  if (myLocationsList) {
    myLocationsList.innerHTML = '';
  }
}

// Show empty state for user locations
function showEmptyUserLocations() {
  if (myLocationsList) {
    myLocationsList.innerHTML = `
      <div class="empty-state">
        <p>You haven't added any locations yet.</p>
        <p>Tap the + button on the map to add your first location!</p>
      </div>
    `;
  }
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

// Export functions for use in other modules
window.locationsModule = {
  initLocations,
  saveLocationOffline,
  loadOfflineLocations,
  syncOfflineLocations,
  loadUserLocations
};
