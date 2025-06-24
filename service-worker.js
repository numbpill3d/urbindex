const CACHE_NAME = 'urbindex-cache-v11';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './css/styles.css',
  './css/custom-markers.css',
  './css/toast.css',
  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/map.js',
  './js/locations.js',
  './js/comments.js',
  './js/forum.js',
  './js/offline.js',
  './js/utils.js',
  './images/icons/icon-192x192.png',
  './images/icons/icon-512x512.png',
  './images/default-avatar.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// URLs for offline fallback content with enhanced options
const OFFLINE_FALLBACKS = {
  document: '/index.html',
  image: '/images/icons/icon-192x192.png',
  json: JSON.stringify({
    error: 'You are currently offline',
    code: 'OFFLINE_MODE',
    timestamp: Date.now()
  }),
  map: '/images/icons/offline-map-placeholder.png'
};

// URLs that should be available offline even if not explicitly cached
const CRITICAL_ASSETS = [
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/map.js',
  '/js/offline.js',
  '/images/icons/icon-192x192.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch(error => {
          console.error('Failed to cache static assets:', error);
          throw error;
        });
      })
      .then(() => {
        console.log('Service worker installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service worker installation failed:', error);
        throw error;
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests that we don't need to handle
  if (!event.request.url.startsWith(self.location.origin) &&
      !event.request.url.includes('unpkg.com') &&
      !event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }

  // For Firebase API requests, use network-first strategy
  if (event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebasestorage.googleapis.com')) {
    return event.respondWith(networkFirstStrategy(event));
  }

  // For CDN resources (unpkg, cloudflare), use stale-while-revalidate
  if (event.request.url.includes('unpkg.com') ||
      event.request.url.includes('cdnjs.cloudflare.com')) {
    return event.respondWith(staleWhileRevalidateStrategy(event));
  }

  // For all other requests, use cache-first strategy with network update
  event.respondWith(cacheFirstWithUpdateStrategy(event));
});

// Stale-while-revalidate strategy for CDN resources
async function staleWhileRevalidateStrategy(event) {
  const cachedResponse = await caches.match(event.request);
  
  // Return cached response immediately if available
  if (cachedResponse) {
    // Fetch new version in the background
    updateCacheInBackground(event.request);
    return cachedResponse;
  }
  
  // If not in cache, fetch from network and cache
  try {
    const networkResponse = await fetch(event.request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Stale while revalidate fetch failed:', error);
    // No fallback available for these resources if not cached
    return new Response('Resource unavailable offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Function to update cache in background
function updateCacheInBackground(request) {
  fetch(request).then(response => {
    if (response && response.status === 200) {
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, response);
      });
    }
  }).catch(error => {
    console.log('Background fetch failed:', error);
  });
}

// Cache-first strategy with network update and improved offline fallback
async function cacheFirstWithUpdateStrategy(event) {
  try {
    const cachedResponse = await caches.match(event.request);
    
    // Return cached response immediately
    if (cachedResponse) {
      // But also fetch an updated version in the background
      fetchAndUpdateCache(event.request);
      return cachedResponse;
    }
    
    // If not in cache, fetch from network
    const networkResponse = await fetch(event.request);
    
    // Cache valid responses for future use
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Fetch failed:', error);
    
    // For navigation requests, return the offline page
    if (event.request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_FALLBACKS.document);
    }
    
    // For image requests, return fallback image
    if (event.request.destination === 'image') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_FALLBACKS.image);
    }
    
    // Special handling for map tile requests
    if (event.request.url.includes('tile') &&
       (event.request.url.includes('.png') || event.request.url.includes('.jpg'))) {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_FALLBACKS.map);
    }
    
    // For API or other requests
    return new Response(JSON.stringify({
      error: 'You are offline',
      errorCode: 'OFFLINE'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    });
  }
}

// Network-first strategy with better caching
async function networkFirstStrategy(event) {
  try {
    const networkResponse = await fetchWithTimeout(event.request);
    
    // Cache valid responses for future use
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      try {
        cache.put(event.request, networkResponse.clone());
      } catch (cacheError) {
        console.error('Cache put error:', cacheError);
      }
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network request failed, falling back to cache', error);
    
    const cachedResponse = await caches.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache for this specific request, determine appropriate fallback
    if (event.request.headers.get('Accept')?.includes('application/json')) {
      return new Response(JSON.stringify({
        error: 'You are offline',
        errorCode: 'OFFLINE',
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
    } else {
      // For non-JSON requests without a cached response
      return new Response('Service unavailable while offline', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
}

// Background sync for offline data
self.addEventListener('sync', event => {
  if (event.tag === 'sync-locations') {
    event.waitUntil(syncLocations());
  }
});

// Function to fetch and update cache in the background
function fetchAndUpdateCache(request) {
  fetch(request).then(response => {
    if (response && response.status === 200) {
      caches.open(CACHE_NAME).then(cache => {
        cache.put(request, response);
      });
    }
  }).catch(error => {
    console.log('Background update failed:', error);
  });
}

// Function to sync offline locations with server
async function syncLocations() {
  try {
    const db = await openIndexedDB();
    
    // Check if the offlineLocations store exists
    if (!db.objectStoreNames.contains('offlineLocations')) {
      console.log('No offlineLocations store found, skipping sync');
      return;
    }
    
    // Define getAllOfflineLocations if it doesn't exist
    const getAllOfflineLocations = async (db) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['offlineLocations'], 'readonly');
          const store = transaction.objectStore('offlineLocations');
          const request = store.getAll();
          
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = (e) => reject(e.target.error);
        } catch (error) {
          console.error('Error getting offline locations:', error);
          resolve([]);
        }
      });
    };
    
    // Define deleteOfflineLocation if it doesn't exist
    const deleteOfflineLocation = async (db, id) => {
      return new Promise((resolve, reject) => {
        try {
          const transaction = db.transaction(['offlineLocations'], 'readwrite');
          const store = transaction.objectStore('offlineLocations');
          const request = store.delete(id);
          
          request.onsuccess = () => resolve();
          request.onerror = (e) => reject(e.target.error);
        } catch (error) {
          console.error('Error deleting offline location:', error);
          resolve();
        }
      });
    };
    
    const offlineLocations = await getAllOfflineLocations(db);
    
    if (offlineLocations.length === 0) {
      db.close();
      return;
    }
    
    // Process each offline location
    const syncPromises = offlineLocations.map(async location => {
      try {
        // This would be replaced with actual Firebase API call
        const response = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(location)
        });
        
        if (response.ok) {
          // Remove from IndexedDB after successful sync
          await deleteOfflineLocation(db, location.id);
        }
        
        return response.ok;
      } catch (error) {
        console.error('Failed to sync location:', error);
        return false;
      }
    });
    
    await Promise.all(syncPromises);
    db.close();
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('urbindex-db', 1);
    
    request.onerror = event => reject(event.target.error);
    request.onsuccess = event => resolve(event.target.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineLocations')) {
        db.createObjectStore('offlineLocations', { keyPath: 'id' });
      }
    };
  });
}

function getAllOfflineLocations(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineLocations'], 'readonly');
    const store = transaction.objectStore('offlineLocations');
    const request = store.getAll();
    
    request.onerror = event => reject(event.target.error);
    request.onsuccess = event => resolve(event.target.result);
  });
}

function deleteOfflineLocation(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offlineLocations'], 'readwrite');
    const store = transaction.objectStore('offlineLocations');
    const request = store.delete(id);
    
    request.onerror = event => reject(event.target.error);
    request.onsuccess = event => resolve();
  });
}

// Create an enhanced offline fallback page
async function createOfflineFallbackPage() {
  const cache = await caches.open(CACHE_NAME);
  
  // Get the existing index.html
  const indexResponse = await cache.match('/index.html');
  if (!indexResponse) return;
  
  const indexHtml = await indexResponse.text();
  
  // Add offline indicator and enhanced styling
  const offlineHtml = indexHtml
    .replace('<body', '<body data-offline="true"')
    .replace('</head>', `
      <style>
        .offline-indicator {
          position: fixed;
          bottom: 20px;
          left: 20px;
          padding: 8px 16px;
          background-color: rgba(255, 58, 125, 0.9);
          color: white;
          border-radius: 8px;
          font-family: var(--font-secondary);
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          animation: pulse 2s infinite alternate;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .offline-indicator i {
          font-size: 16px;
        }
        
        .offline-map-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background-color: rgba(10, 10, 30, 0.8);
          padding: 20px 30px;
          border-radius: 8px;
          z-index: 500;
          text-align: center;
          color: #fff;
          border: 1px solid #00e5ff;
          max-width: 80%;
        }
        
        .network-dependent {
          opacity: 0.5;
          pointer-events: none;
        }
        
        .offline-button {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 229, 255, 0.2);
          border: 1px solid #00e5ff;
          color: #00e5ff;
          padding: 10px 15px;
          border-radius: 8px;
          font-size: 14px;
          z-index: 1000;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        @keyframes pulse {
          0% { opacity: 0.8; }
          100% { opacity: 1; }
        }
      </style>
    </head>`);
  
  // Inject offline indicator script at end of body
  const bodyEndPos = offlineHtml.lastIndexOf('</body>');
  const offlineHtmlWithScript = offlineHtml.substring(0, bodyEndPos) + `
    <div class="offline-indicator">
      <i class="fas fa-wifi"></i> You're offline
    </div>
    <button class="offline-button" id="refresh-when-online">
      <i class="fas fa-sync-alt"></i> Refresh when online
    </button>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        // Set up the app to work in offline mode
        window.URBINDEX_OFFLINE_MODE = true;
        
        // Disable features that require network connectivity
        const disabledButtons = [
          '.chat-send-btn',
          '#forum-search-btn',
          '#spots-search-btn'
        ];
        
        disabledButtons.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            el.disabled = true;
            el.title = 'Not available offline';
            el.style.opacity = '0.5';
          });
        });
        
        // Add offline message to map
        const mapElement = document.getElementById('map');
        if (mapElement) {
          const offlineMapMsg = document.createElement('div');
          offlineMapMsg.className = 'offline-map-message';
          offlineMapMsg.innerHTML = '<i class="fas fa-map-marked-alt"></i> Map data unavailable offline';
          mapElement.style.position = 'relative';
          mapElement.appendChild(offlineMapMsg);
        }
        
        // Check for online status periodically
        // Add refresh when online button handler
        document.getElementById('refresh-when-online').addEventListener('click', function() {
          this.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Waiting for network...';
          
          const checkOnline = setInterval(() => {
            if (navigator.onLine) {
              clearInterval(checkOnline);
              window.location.reload();
            }
          }, 1000);
        });
        
        window.addEventListener('online', function() {
          document.querySelector('.offline-indicator').style.display = 'none';
          // Reload fresh content or enable disabled features
          if (window.URBINDEX_OFFLINE_MODE) {
            window.URBINDEX_OFFLINE_MODE = false;
            // Re-enable buttons
            disabledButtons.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              elements.forEach(el => {
                el.disabled = false;
                el.removeAttribute('title');
                el.style.opacity = '1';
              });
            });
            
            // Remove offline map message if exists
            const offlineMapMsg = document.querySelector('.offline-map-message');
            if (offlineMapMsg) {
              offlineMapMsg.remove();
            }
            
            // Trigger a background sync
            if ('serviceWorker' in navigator && 'SyncManager' in window) {
              navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-locations');
              });
            }
          }
        });
        
        window.addEventListener('offline', function() {
          document.querySelector('.offline-indicator').style.display = 'flex';
        });
      });
    </script>
  </body>`;
  
  // Store the offline version
  const offlineResponse = new Response(offlineHtmlWithScript, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-store'
    }
  });
  
  await cache.put(new Request(OFFLINE_FALLBACKS.document), offlineResponse);
}

// Push notification event with enhanced options
self.addEventListener('push', event => {
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'New Notification',
      body: event.data.text(),
      url: '/'
    };
  }
  
  const options = {
    body: data.body,
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    tag: data.tag || 'default',
    actions: data.actions || [],
    silent: data.silent || false,
    timestamp: data.timestamp || Date.now(),
    data: {
      url: data.url || '/',
      primaryKey: data.primaryKey || null,
      dateOfArrival: Date.now()
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // If a window client is already open, focus it
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Periodic background sync (for newer browsers that support it)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'sync-urbindex-data') {
    event.waitUntil(syncBackgroundData());
  }
});

// Function to sync data in the background
async function syncBackgroundData() {
  try {
    const db = await openIndexedDB();
    
    // Sync various types of data
    await Promise.all([
      syncOfflineLocations(db),
      syncOfflineComments(db),
      syncOfflineRatings(db)
    ]);
    
    db.close();
    
    // Update last sync timestamp
    localStorage.setItem('last_background_sync', Date.now().toString());
    
    return true;
  } catch (error) {
    console.error('Background sync failed:', error);
    return false;
  }
}

// Function to sync offline comments
async function syncOfflineComments(db) {
  // Check if the comments store exists
  if (!db.objectStoreNames.contains('offlineComments')) {
    return Promise.resolve();
  }
  
  try {
    // Get all offline comments
    const transaction = db.transaction(['offlineComments'], 'readonly');
    const store = transaction.objectStore('offlineComments');
    const offlineComments = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = event => reject(event.target.error);
      request.onsuccess = event => resolve(event.target.result);
    });
    
    if (offlineComments.length === 0) {
      return Promise.resolve();
    }
    
    // Process each comment
    const syncPromises = offlineComments.map(async comment => {
      try {
        // This would be replaced with actual API call
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(comment)
        });
        
        if (response.ok) {
          // Remove from IndexedDB after successful sync
          const deleteTransaction = db.transaction(['offlineComments'], 'readwrite');
          const deleteStore = deleteTransaction.objectStore('offlineComments');
          await new Promise((resolve, reject) => {
            const request = deleteStore.delete(comment.id);
            request.onerror = event => reject(event.target.error);
            request.onsuccess = event => resolve();
          });
        }
        
        return response.ok;
      } catch (error) {
        console.error('Failed to sync comment:', error);
        return false;
      }
    });
    
    return Promise.all(syncPromises);
  } catch (error) {
    console.error('Comment sync error:', error);
    return Promise.resolve();
  }
}

// Function to sync offline ratings
async function syncOfflineRatings(db) {
  // This would be implemented similarly to syncOfflineLocations
  // but handling ratings instead
  return Promise.resolve();
}

// Handle app installation event
self.addEventListener('appinstalled', (event) => {
  console.log('App was installed', event);
  
  // Notify clients that the app was installed
  clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'APP_INSTALLED',
        timestamp: Date.now()
      });
    });
  });
});

// Create offline fallback when the service worker installs
self.addEventListener('install', (event) => {
  event.waitUntil(createOfflineFallbackPage());
});

// Check for updates when clients connect
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_FOR_UPDATES') {
    console.log('Checking for app updates...');
    // This would potentially trigger an update check process
    // For now, just respond that we're up to date
    event.source.postMessage({
      type: 'UPDATE_STATUS',
      status: 'UP_TO_DATE',
      version: '2.1'
    });
  }
});

// Handle page transitions for analytics
self.addEventListener('navigate', event => {
  event.waitUntil(async function() {
    // Track page views if needed
    console.log('Navigation occurred:', event.destination.url);
    
    // You could send analytics data here
    try {
      const client = await clients.get(event.clientId);
      client.postMessage({
        type: 'PAGE_VIEW',
        url: event.destination.url,
        previousUrl: event.sourceUrl || null,
        timestamp: Date.now()
      });
    } catch (e) {
      console.error('Error handling navigation event:', e);
    }
  }());
});

self.addEventListener('error', event => {
  console.error('Service worker error:', event.error);
});

// Function to fetch with timeout
function fetchWithTimeout(request, timeout = 8000) {
  return new Promise((resolve, reject) => {
    // Set timeout
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
    
    fetch(request).then(
      (response) => {
        clearTimeout(timeoutId);
        resolve(response);
      },
      (err) => {
        clearTimeout(timeoutId);
        reject(err);
      }
    );
  });
}
