// Urbindex - Offline Module

// DOM Elements
const offlineModeToggle = document.getElementById('offline-mode');
const offlineIndicator = document.createElement('div');
offlineIndicator.className = 'offline-indicator';
offlineIndicator.textContent = 'Offline Mode';
document.body.appendChild(offlineIndicator);

// Offline state
let isOffline = !navigator.onLine;
let isOfflineModeEnabled = false;

// Initialize offline functionality
function initOffline() {
  // Set up event listeners for online/offline events
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
  
  // Initialize offline mode toggle
  if (offlineModeToggle) {
    // Try to load saved preference from localStorage
    const savedOfflineMode = localStorage.getItem('offlineMode');
    if (savedOfflineMode === 'true') {
      offlineModeToggle.checked = true;
      isOfflineModeEnabled = true;
      updateOfflineIndicator();
    }
    
    // Set up event listener for toggle
    offlineModeToggle.addEventListener('change', (e) => {
      isOfflineModeEnabled = e.target.checked;
      localStorage.setItem('offlineMode', isOfflineModeEnabled);
      updateOfflineIndicator();
      
      if (isOfflineModeEnabled) {
        // If enabling offline mode, cache current data
        cacheCurrentData();
      }
    });
  }
  
  // Initial check
  handleOnlineStatus();
  
  // Register sync event with service worker
  registerBackgroundSync();
}

// Handle online/offline status changes
function handleOnlineStatus() {
  const wasOffline = isOffline;
  isOffline = !navigator.onLine;
  
  updateOfflineIndicator();
  
  if (wasOffline && !isOffline) {
    // We're back online
    console.log('App is back online');
    
    // Sync any offline data
    if (typeof locationsModule !== 'undefined' && locationsModule.syncOfflineLocations) {
      locationsModule.syncOfflineLocations()
        .then(() => {
          showToast('Synced offline data');
        })
        .catch(error => {
          console.error('Error syncing offline data:', error);
          showToast('Error syncing some offline data', 'error');
        });
    }
  } else if (!wasOffline && isOffline) {
    // We've gone offline
    console.log('App is offline');
    showToast('You are offline. Changes will be saved locally.', 'warning');
  }
}

// Update offline indicator
function updateOfflineIndicator() {
  if (isOffline || isOfflineModeEnabled) {
    offlineIndicator.classList.add('active');
    offlineIndicator.textContent = isOffline ? 'Offline' : 'Offline Mode Enabled';
  } else {
    offlineIndicator.classList.remove('active');
  }
}

// Cache current data for offline use
function cacheCurrentData() {
  // This function would pre-cache data for offline use
  // For example, it could fetch and store locations in the user's area
  
  if (typeof mapModule !== 'undefined' && mapModule.getUserLocation) {
    mapModule.getUserLocation()
      .then(position => {
        if (position) {
          // Cache locations near the user
          cacheLocationsNearPosition(position);
        }
      });
  }
}

// Cache locations near a position
function cacheLocationsNearPosition(position, radiusKm = 10) {
  // This would fetch locations within a radius of the user's position
  // and store them in IndexedDB for offline use
  
  // For simplicity, we'll just fetch all locations for now
  // In a real app, you'd use geoqueries to fetch only nearby locations
  
  locationsRef.get()
    .then(snapshot => {
      const locations = [];
      snapshot.forEach(doc => {
        locations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Store in IndexedDB
      cacheLocations(locations);
    })
    .catch(error => {
      console.error('Error caching locations:', error);
    });
}

// Cache locations in IndexedDB
function cacheLocations(locations) {
  return new Promise((resolve, reject) => {
    // Open IndexedDB
    const request = indexedDB.open('urbindex-db', 1);
    
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error);
      reject(event.target.error);
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      // Check if cachedLocations store exists
      if (!db.objectStoreNames.contains('cachedLocations')) {
        // Create the store in a new transaction
        db.close();
        const upgradeRequest = indexedDB.open('urbindex-db', db.version + 1);
        
        upgradeRequest.onupgradeneeded = (event) => {
          const upgradeDb = event.target.result;
          upgradeDb.createObjectStore('cachedLocations', { keyPath: 'id' });
          console.log('Created cachedLocations object store');
        };
        
        upgradeRequest.onsuccess = (event) => {
          const upgradedDb = event.target.result;
          cacheLocationsInDb(upgradedDb, locations)
            .then(resolve)
            .catch(reject);
        };
        
        upgradeRequest.onerror = (event) => {
          console.error('Error upgrading database:', event.target.error);
          reject(event.target.error);
        };
      } else {
        // Store already exists, proceed with caching
        cacheLocationsInDb(db, locations)
          .then(resolve)
          .catch(reject);
      }
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object store for cached locations if it doesn't exist
      if (!db.objectStoreNames.contains('cachedLocations')) {
        db.createObjectStore('cachedLocations', { keyPath: 'id' });
        console.log('Created cachedLocations object store during upgrade');
      }
    };
  });
}

// Helper function to cache locations in the database
function cacheLocationsInDb(db, locations) {
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(['cachedLocations'], 'readwrite');
      const store = transaction.objectStore('cachedLocations');
      
      // Clear existing cached locations
      store.clear();
      
      // Add each location to the store
      locations.forEach(location => {
        store.add(location);
      });
      
      transaction.oncomplete = () => {
        console.log(`Cached ${locations.length} locations for offline use`);
        showToast(`Cached ${locations.length} locations for offline use`);
        db.close();
        resolve(locations.length);
      };
      
      transaction.onerror = (event) => {
        console.error('Error caching locations:', event.target.error);
        reject(event.target.error);
      };
    } catch (error) {
      console.error('Error in cacheLocationsInDb:', error);
      reject(error);
    }
  });
}

// Register background sync with service worker
function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then(registration => {
        // Register sync event
        return registration.sync.register('sync-locations');
      })
      .then(() => {
        console.log('Background sync registered');
      })
      .catch(error => {
        console.error('Error registering background sync:', error);
      });
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Check if app is in offline mode (either actually offline or offline mode enabled)
function isOfflineMode() {
  return isOffline || isOfflineModeEnabled;
}

// Export functions for use in other modules
window.offlineModule = {
  initOffline,
  isOfflineMode,
  showToast
};

// Add CSS for toast notifications
const style = document.createElement('style');
style.textContent = `
  .toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 20px;
    z-index: 1000;
    opacity: 0;
    transition: transform 0.3s ease, opacity 0.3s ease;
  }
  
  .toast.show {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
  
  .toast-info {
    border-left: 4px solid var(--neon-blue);
  }
  
  .toast-warning {
    border-left: 4px solid #fee440;
  }
  
  .toast-error {
    border-left: 4px solid var(--neon-pink);
  }
`;

document.head.appendChild(style);
