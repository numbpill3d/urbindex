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
  
  // Set up image preview for location form
  const imageInput = document.getElementById('location-image');
  if (imageInput) {
    imageInput.addEventListener('change', handleImagePreview);
  }
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

// Handle image preview
function handleImagePreview(event) {
  const files = event.target.files;
  const previewContainer = document.getElementById('image-preview-container');
  
  // Clear previous previews
  previewContainer.innerHTML = '';
  
  if (files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Only process image files
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.className = 'image-preview';
        previewContainer.appendChild(img);
      };
      
      reader.readAsDataURL(file);
    }
  }
}

// Save location to Firestore
async function saveLocation(e) {
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
    crewId: null
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

// Upload images to Firebase Storage
async function uploadImages(files, userId) {
  if (files.length === 0) return [];
  
  const imageUrls = [];
  const storageRef = storage.ref();
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileRef = storageRef.child(`locations/${userId}/${Date.now()}_${file.name}`);
    
    try {
      const snapshot = await fileRef.put(file);
      const downloadUrl = await snapshot.ref.getDownloadURL();
      imageUrls.push(downloadUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }
  
  return imageUrls;
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
  
  // Get risk level indicator
  const riskLevel = locationData.riskLevel || 'unknown';
  const riskIndicator = `<span class="risk-indicator risk-${riskLevel}">${utilsModule.getRiskLabel(riskLevel)}</span>`;
  
  // Get location type
  const locationType = locationData.locationType || 'default';
  const locationTypeLabel = utilsModule.getLocationTypeLabel(locationType);
  
  // Get first image if available
  const imageHtml = locationData.imageUrls && locationData.imageUrls.length > 0 
    ? `<img src="${locationData.imageUrls[0]}" alt="${locationData.name}" class="location-thumbnail">` 
    : '';
  
  // Create content
  listItem.innerHTML = `
    <div class="location-item-header">
      <h3>${locationData.name}</h3>
      <div class="location-badges">
        <span class="location-category">${utilsModule.getCategoryLabel(locationData.category)}</span>
        ${riskIndicator}
      </div>
    </div>
    ${imageHtml}
    <p class="location-description">${locationData.description || 'No description'}</p>
    ${locationData.notes ? `<p class="location-notes"><strong>Notes:</strong> ${locationData.notes}</p>` : ''}
    <div class="location-meta">
      <span class="location-date">${dateDisplay}</span>
      <div class="location-stats">
        <span class="location-stat">👍 ${locationData.upvotes || 0}</span>
        <span class="location-stat">👎 ${locationData.downvotes || 0}</span>
        <span class="location-type">${locationTypeLabel}</span>
      </div>
    </div>
    ${locationData.claimedBy ? `
      <div class="territory-owner">
        <span>Claimed by: </span>
        <span class="territory-owner-name">${locationData.claimedBy}</span>
      </div>
    ` : ''}
    ${isOffline ? '<div class="offline-badge">Saved Offline</div>' : ''}
    <div class="location-actions">
      <button class="view-on-map-btn neon-button" data-id="${id}">View on Map</button>
    </div>
  `;
  
  // Add click event to show on map
  const viewOnMapBtn = listItem.querySelector('.view-on-map-btn');
  viewOnMapBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
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

// Use utility functions directly from utilsModule instead of creating local constants

// Close location modal
function closeLocationModal() {
  const modal = document.getElementById('location-modal');
  if (modal) {
    modal.classList.remove('active');
  }
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

// Add comment to a location
async function addComment(locationId, commentText) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to add comments');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    const commentData = {
      locationId,
      text: commentText,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userDisplayName: user.displayName || 'Anonymous',
      userPhotoURL: user.photoURL || null
    };
    
    await commentsRef.add(commentData);
    console.log('Comment added successfully');
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
}

// Load comments for a location
async function loadComments(locationId) {
  try {
    const snapshot = await commentsRef
      .where('locationId', '==', locationId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const comments = [];
    snapshot.forEach(doc => {
      comments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return comments;
  } catch (error) {
    console.error('Error loading comments:', error);
    return [];
  }
}

// Claim a location
async function claimLocation(locationId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to claim locations');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if location is already claimed
    const locationDoc = await locationsRef.doc(locationId).get();
    
    if (!locationDoc.exists) {
      console.error('Location does not exist');
      return false;
    }
    
    const locationData = locationDoc.data();
    
    // If already claimed by this user, do nothing
    if (locationData.claimedBy === user.uid) {
      return true;
    }
    
    // Update location with claim info
    await locationsRef.doc(locationId).update({
      claimedBy: user.uid,
      claimedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Add to territories collection
    await territoriesRef.add({
      locationId,
      userId: user.uid,
      claimedAt: firebase.firestore.FieldValue.serverTimestamp(),
      points: 0
    });
    
    console.log('Location claimed successfully');
    return true;
  } catch (error) {
    console.error('Error claiming location:', error);
    return false;
  }
}

// Rate a location with stars (1-5)
async function rateLocationWithStars(locationId, rating) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to rate locations');
    return false;
  }
  
  if (rating < 1 || rating > 5) {
    console.error('Invalid rating value');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if user has already rated this location
    const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}_stars`);
    const ratingDoc = await ratingRef.get();
    
    const locationRef = locationsRef.doc(locationId);
    const locationDoc = await locationRef.get();
    
    if (!locationDoc.exists) {
      console.error('Location does not exist');
      return false;
    }
    
    const locationData = locationDoc.data();
    let newRating, newCount;
    
    if (ratingDoc.exists) {
      // User is updating their rating
      const oldRating = ratingDoc.data().value;
      const oldTotal = locationData.rating * locationData.ratingCount;
      const newTotal = oldTotal - oldRating + rating;
      newCount = locationData.ratingCount;
      newRating = newTotal / newCount;
      
      // Update the rating document
      await ratingRef.update({
        value: rating,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // New rating
      const oldTotal = (locationData.rating || 0) * (locationData.ratingCount || 0);
      newCount = (locationData.ratingCount || 0) + 1;
      newRating = (oldTotal + rating) / newCount;
      
      // Create new rating document
      await ratingRef.set({
        locationId,
        userId: user.uid,
        value: rating,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Update location with new rating
    await locationRef.update({
      rating: newRating,
      ratingCount: newCount
    });
    
    console.log('Location rated successfully');
    return true;
  } catch (error) {
    console.error('Error rating location:', error);
    return false;
  }
}

// Save a location to user's saved locations
async function saveLocationToFavorites(locationId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to save locations');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if location is already saved
    const savedLocationsRef = firebase.firestore().collection('savedLocations');
    const savedId = `${user.uid}_${locationId}`;
    const savedDoc = await savedLocationsRef.doc(savedId).get();
    
    if (savedDoc.exists) {
      console.log('Location already saved');
      return true;
    }
    
    // Save to savedLocations collection
    await savedLocationsRef.doc(savedId).set({
      userId: user.uid,
      locationId: locationId,
      savedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Location saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving location:', error);
    return false;
  }
}

// Remove a location from user's saved locations
async function removeLocationFromFavorites(locationId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to manage saved locations');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Delete from savedLocations collection
    const savedLocationsRef = firebase.firestore().collection('savedLocations');
    const savedId = `${user.uid}_${locationId}`;
    await savedLocationsRef.doc(savedId).delete();
    
    console.log('Location removed from saved successfully');
    return true;
  } catch (error) {
    console.error('Error removing saved location:', error);
    return false;
  }
}

// Check if a location is saved by the current user
async function isLocationSaved(locationId) {
  if (!authModule.isAuthenticated()) {
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    const savedLocationsRef = firebase.firestore().collection('savedLocations');
    const savedId = `${user.uid}_${locationId}`;
    const savedDoc = await savedLocationsRef.doc(savedId).get();
    
    return savedDoc.exists;
  } catch (error) {
    console.error('Error checking if location is saved:', error);
    return false;
  }
}

// Export functions for use in other modules
window.locationsModule = {
  initLocations,
  saveLocation,
  saveLocationOffline,
  loadOfflineLocations,
  syncOfflineLocations,
  loadUserLocations,
  addComment,
  loadComments,
  claimLocation,
  rateLocationWithStars,
  closeLocationModal,
  saveLocationToFavorites,
  removeLocationFromFavorites,
  isLocationSaved
};
