const CACHE_NAME = 'urbindex-cache-v6';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/service-worker.js',
  '/firebaseConfig.js',
  '/css/styles.css',
  '/css/spots.css',
  '/css/forum.css',
  '/css/custom-markers.css',
  '/css/risk-indicators.css',
  '/css/profile.css',
  '/css/achievements.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/config.js',
  '/js/map.js',
  '/js/map-functions.js',
  '/js/locations.js',
  '/js/comments.js',
  '/js/ratings.js',
  '/js/geocaching.js',
  '/js/geocaching-complete.js',
  '/js/geocaching-export.js',
  '/js/geocaching-fix.js',
  '/js/territories.js',
  '/js/territories-export.js',
  '/js/territories-fix.js',
  '/js/forum.js',
  '/js/forum-init.js',
  '/js/radar.js',
  '/js/spots.js',
  '/js/achievements.js',
  '/js/challenges.js',
  '/js/profile.js',
  '/js/search.js',
  '/js/media.js',
  '/js/notifications.js',
  '/js/social.js',
  '/js/offline.js',
  '/js/utils.js',
  '/js/leaderboard.js',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png',
  '/images/default-avatar.txt',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/JetBrainsMono/2.304/web/woff2/JetBrainsMono-Regular.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/Space-Grotesk/3.0.1/SpaceGrotesk[wght].woff2'
];

// URLs for offline fallback content
const OFFLINE_FALLBACKS = {
  document: '/index.html',
  image: '/images/icons/icon-192x192.png'
};

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
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
  // Skip cross-origin requests like Google Analytics
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('unpkg.com/leaflet')) {
    return;
  }

  // For Firebase API requests, use network-first strategy
  if (event.request.url.includes('firebaseio.com') || 
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebasestorage.googleapis.com')) {
    return event.respondWith(networkFirstStrategy(event));
  }

  // For all other requests, use cache-first strategy
  event.respondWith(cacheFirstStrategy(event));
});

// Cache-first strategy with improved offline fallback
async function cacheFirstStrategy(event) {
  const cachedResponse = await caches.match(event.request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
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
    
    // For font requests
    if (event.request.destination === 'font') {
      return new Response('', {
        status: 503,
        statusText: 'Service Unavailable'
      });
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
    const networkResponse = await fetch(event.request);
    
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

// Function to sync offline locations with server
async function syncLocations() {
  try {
    const db = await openIndexedDB();
    const offlineLocations = await getAllOfflineLocations(db);
    
    if (offlineLocations.length === 0) {
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

// Create an offline fallback page
async function createOfflineFallbackPage() {
  const cache = await caches.open(CACHE_NAME);
  
  // Get the existing index.html
  const indexResponse = await cache.match('/index.html');
  if (!indexResponse) return;
  
  const indexHtml = await indexResponse.text();
  
  // Add offline indicator
  const offlineHtml = indexHtml.replace(
    '<body',
    '<body data-offline="true"'
  );
  
  // Store the offline version
  const offlineResponse = new Response(offlineHtml, {
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
  // This would be implemented similarly to syncOfflineLocations
  // but handling comments instead
  return Promise.resolve();
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
});

// Create offline fallback when the service worker installs
self.addEventListener('install', (event) => {
  event.waitUntil(createOfflineFallbackPage());
});
