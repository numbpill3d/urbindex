/**
 * Optimized Service Worker for Urbindex
 * Enhanced PWA capabilities with intelligent caching and offline support
 */

const CACHE_NAME = 'urbindex-v3.0.0';
const STATIC_CACHE = 'urbindex-static-v3.0.0';
const DYNAMIC_CACHE = 'urbindex-dynamic-v3.0.0';
const IMAGES_CACHE = 'urbindex-images-v3.0.0';
const API_CACHE = 'urbindex-api-v3.0.0';

// Critical resources to cache immediately
const STATIC_ASSETS = [
    '/',
    '/final-optimized.html',
    '/css/app.css',
    '/js/app-optimized.js',
    '/js/firebase-optimized.js',
    '/js/map-optimized.js',
    '/js/ui-optimized.js',
    '/js/auth-optimized.js',
    '/manifest.json',
    // Add Firebase CDNs
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    // Firebase SDKs
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
    // Leaflet markercluster
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css',
    'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css'
];

// Cache strategies
const CACHE_STRATEGIES = {
    CACHE_FIRST: 'cache-first',
    NETWORK_FIRST: 'network-first',
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
    NETWORK_ONLY: 'network-only',
    CACHE_ONLY: 'cache-only'
};

// API endpoints and their caching strategies
const API_ENDPOINTS = {
    'https://firestore.googleapis.com': {
        strategy: CACHE_STRATEGIES.NETWORK_FIRST,
        maxAge: 5 * 60 * 1000, // 5 minutes
        cacheName: API_CACHE
    },
    'https://www.googleapis.com': {
        strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
        maxAge: 10 * 60 * 1000, // 10 minutes
        cacheName: API_CACHE
    }
};

/**
 * Service Worker Installation
 */
self.addEventListener('install', (event) => {
    console.log('[SW] NORMAL INSTALL: Installing service worker v3.0.0');
    console.log('[SW] NORMAL INSTALL: Install event started');
    event.waitUntil(
        Promise.all([
            // Cache static assets
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('[SW] NORMAL INSTALL: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            }),
            // Initialize other caches
            caches.open(DYNAMIC_CACHE),
            caches.open(IMAGES_CACHE),
            caches.open(API_CACHE)
        ]).then(() => {
            console.log('[SW] NORMAL INSTALL: Static assets cached successfully');
            // Skip waiting to activate immediately
            return self.skipWaiting();
        })
    );
});

/**
 * Service Worker Activation
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker v3.0.0');
    console.log('[SW] Activate event started');
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(),
            // Claim clients immediately
            self.clients.claim()
        ]).then(() => {
            console.log('[SW] Service worker activated');
            console.log('[SW] Activate event completed');
        })
    );
});

/**
 * Fetch Event Handler with Intelligent Caching
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    console.log('[SW] Fetch event for:', request.url);
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Handle different types of requests
    if (isStaticAsset(request)) {
        event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(request)) {
        event.respondWith(handleAPIRequest(request));
    } else if (isImageRequest(request)) {
        event.respondWith(handleImageRequest(request));
    } else if (isHTMLRequest(request)) {
        event.respondWith(handleHTMLRequest(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

/**
 * Background Sync for offline actions
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(performBackgroundSync());
    }
});

/**
 * Push notifications
 */
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/images/icons/icon-192x192.png',
            badge: '/images/icons/icon-72x72.png',
            vibrate: [100, 50, 100],
            data: data.data,
            actions: [
                {
                    action: 'explore',
                    title: 'Explore Now',
                    icon: '/images/icons/icon-72x72.png'
                },
                {
                    action: 'dismiss',
                    title: 'Dismiss',
                    icon: '/images/icons/icon-72x72.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else {
        // Default click action
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

/**
 * Handle Static Assets (CSS, JS, etc.)
 */
async function handleStaticAsset(request) {
    console.log('[SW] Handling static asset:', request.url);
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        console.log('[SW] Static asset found in cache:', request.url);
        // Return cached version and update in background
        fetch(request).then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
        }).catch(() => {
            // Network failed, but we have cached version
        });
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            console.log('[SW] Caching static asset:', request.url);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[SW] Failed to fetch static asset:', error);
        throw error;
    }
}

/**
 * Handle API Requests with Network-First Strategy
 */
async function handleAPIRequest(request) {
    console.log('[SW] Handling API request:', request.url);
    const cache = await caches.open(API_CACHE);
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            // Cache successful responses
            const cacheKey = request.url;
            await cache.put(cacheKey, response.clone());
        }
        return response;
    } catch (error) {
        // Network failed, try cache
        const cacheKey = request.url;
        const cached = await cache.match(cacheKey);
        if (cached) {
            // Add offline indicator header
            const headers = new Headers(cached.headers);
            headers.set('X-Served-From', 'cache');
            const offlineResponse = new Response(cached.body, {
                status: cached.status,
                statusText: cached.statusText,
                headers: headers
            });
            return offlineResponse;
        }
        
        // No cached version available
        return new Response(JSON.stringify({
        error: 'Network unavailable',
        offline: true
    }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handle Image Requests with Cache-First Strategy
 */
async function handleImageRequest(request) {
    console.log('[SW] Handling image request:', request.url);
    const cache = await caches.open(IMAGES_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Return placeholder image for failed image loads
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="#f0f0f0"/><text x="100" y="75" text-anchor="middle" fill="#999" font-family="Arial" font-size="14">Image unavailable</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
}

/**
 * Handle HTML Requests with Network-First Strategy
 */
async function handleHTMLRequest(request) {
    console.log('[SW] Handling HTML request:', request.url);
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            // Only cache successful HTML responses
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Network failed, try cache
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        
        // Return offline page
        return new Response(getOfflinePage(), {
            headers: { 'Content-Type': 'text/html' }
        });
    }
}

/**
 * Handle Dynamic Requests
 */
async function handleDynamicRequest(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        // Update cache in background
        fetch(request).then(response => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
        }).catch(() => {
            // Network failed, but we have cached version
        });
        return cached;
    }
    
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Return a simple error response for failed requests
        return new Response('Network unavailable', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

/**
 * Background Sync Implementation
 */
async function performBackgroundSync() {
    const lastSync = localStorage.getItem('lastBackgroundSync');
    const now = Date.now();
    const syncInterval = 5 * 60 * 1000; // 5 minutes

    if (lastSync && now - lastSync < syncInterval) {
      console.log('[SW] Background sync throttled');
      return;
    }

    console.log('[SW] Performing background sync');

    try {
        // Sync pending location data
        await syncPendingLocations();
        
        // Sync user data updates
        await syncPendingUserUpdates();

        console.log('[SW] Background sync completed');
        localStorage.setItem('lastBackgroundSync', now);
    } catch (error) {
        console.error('[SW] Background sync failed:', error);
    }
}

/**
 * Sync pending location data when back online
 */
async function syncPendingLocations() {
    const pendingLocations = await getPendingData('locations');
    
    for (const location of pendingLocations) {
        try {
            // Attempt to sync with Firebase
            const response = await fetch('/api/locations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(location.data)
            });
            
            if (response.ok) {
                await removePendingData('locations', location.id);
                console.log('[SW] Synced location:', location.id);
            }
        } catch (error) {
            console.error('[SW] Failed to sync location:', location.id, error);
        }
    }
}

/**
 * Sync pending user updates
 */
async function syncPendingUserUpdates() {
    const pendingUpdates = await getPendingData('user-updates');
    
    for (const update of pendingUpdates) {
        try {
            const response = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(update.data)
            });
            
            if (response.ok) {
                await removePendingData('user-updates', update.id);
                console.log('[SW] Synced user update:', update.id);
            }
        } catch (error) {
            console.error('[SW] Failed to sync user update:', update.id, error);
        }
    }
}

/**
 * Utility Functions
 */
function isStaticAsset(request) {
    return request.url.match(/\.(css|js|woff|woff2|ttf|eot)$/i);
}

function isAPIRequest(request) {
    return request.url.includes('firebaseio.com') || 
           request.url.includes('googleapis.com') ||
           request.url.includes('firestore.googleapis.com');
}

function isImageRequest(request) {
    return request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
}

function isHTMLRequest(request) {
    return request.headers.get('accept')?.includes('text/html');
}

async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const validCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGES_CACHE, API_CACHE];
    
    const deletePromises = cacheNames
        .filter(cacheName => !validCaches.includes(cacheName))
        .map(cacheName => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
        });
    
    await Promise.all(deletePromises);
}

/**
 * Offline Data Management
 */
async function savePendingData(type, data) {
    // Store pending data in IndexedDB
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('urbindex-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pending'], 'readwrite');
            const store = transaction.objectStore('pending');
            
            const item = {
                id: Date.now().toString(),
                type: type,
                data: data,
                timestamp: Date.now()
            };
            
            store.add(item);
            transaction.oncomplete = () => resolve(item.id);
            transaction.onerror = () => reject(transaction.error);
        };
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('pending')) {
                const store = db.createObjectStore('pending', { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function getPendingData(type) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('urbindex-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pending'], 'readonly');
            const store = transaction.objectStore('pending');
            const index = store.index('type');
            const getAllRequest = index.getAll(type);
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
    });
}

async function removePendingData(type, id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('urbindex-offline', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['pending'], 'readwrite');
            const store = transaction.objectStore('pending');
            const deleteRequest = store.delete(id);
            
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
    });
}

/**
 * Offline Page Template
 */
function getOfflinePage() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Urbindex - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #2A2A2A 0%, #505050 50%, #2A2A2A 100%);
                    color: #FFFFFF;
                    margin: 0;
                    padding: 20px;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .offline-container {
                    text-align: center;
                    max-width: 400px;
                    padding: 40px;
                    background: rgba(192, 192, 192, 0.1);
                    border-radius: 10px;
                    border: 2px solid #505050;
                }
                h1 {
                    color: #007AFF;
                    margin-bottom: 20px;
                    font-size: 2rem;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
                p {
                    color: #D0D0D0;
                    margin-bottom: 20px;
                    line-height: 1.6;
                }
                .retry-btn {
                    background: #007AFF;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: background 0.3s ease;
                }
                .retry-btn:hover {
                    background: #0051D5;
                }
                .offline-icon {
                    font-size: 4rem;
                    color: #FF4444;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📡</div>
                <h1>You're Offline</h1>
                <p>It looks like you've lost your internet connection. Don't worry, your data is safe and will sync when you're back online.</p>
                <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
            </div>
        </body>
        </html>
    `;
}

/**
 * Performance Monitoring
 */
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_PERFORMANCE_METRICS') {
        // Collect and send performance metrics
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'PERFORMANCE_METRICS',
                    data: getPerformanceMetrics()
                });
            });
        });
    }
});

function getPerformanceMetrics() {
    return {
        timestamp: Date.now(),
        cacheStats: {
            staticCache: STATIC_CACHE,
            dynamicCache: DYNAMIC_CACHE,
            imagesCache: IMAGES_CACHE,
            apiCache: API_CACHE
        },
        userAgent: self.navigator.userAgent
    };
}

console.log('[SW] Service Worker script loaded');

// DEBUG: Check if this self-destruct code is being reached
console.log('[SW] About to check for self-destruct code...');

// Unregister service worker
self.addEventListener('install', function(event) {
  console.log('[SW] CRITICAL: Self-destruct code triggered! Unregistering service worker...');
  event.waitUntil(self.registration.unregister());
});