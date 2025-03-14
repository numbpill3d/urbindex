// Load comments for a location
function loadComments(locationId) {
  try {
    const commentsContainer = document.querySelector(`.comments-container[data-id="${locationId}"]`);
    if (!commentsContainer) return;
    
    commentsContainer.innerHTML = '<p class="loading-comments">Loading comments...</p>';
    
    if (window.locationsModule?.loadComments) {
      window.locationsModule.loadComments(locationId)
        .then(comments => {
          commentsContainer.innerHTML = '';
          
          if (comments.length === 0) {
            commentsContainer.innerHTML = '<p class="no-comments">No comments yet</p>';
            return;
          }
          
          const fragment = document.createDocumentFragment();
          
          comments.forEach(comment => {
            const commentEl = document.createElement('div');
            commentEl.className = 'comment';
            
            let dateDisplay = 'Just now';
            if (comment.createdAt) {
              dateDisplay = window.utilsModule?.formatDate?.(comment.createdAt, true) || 'Recent';
            }
            
            // Sanitize user input
            const userDisplayName = typeof window.utilsModule?.sanitizeHtml === 'function'
              ? window.utilsModule.sanitizeHtml(comment.userDisplayName || 'Anonymous')
              : (comment.userDisplayName || 'Anonymous');
              
            const text = typeof window.utilsModule?.sanitizeHtml === 'function'
              ? window.utilsModule.sanitizeHtml(comment.text || '')
              : (comment.text || '');
            
            commentEl.innerHTML = `
              <div class="comment-header">
                <span class="comment-author">${userDisplayName}</span>
                <span class="comment-date">${dateDisplay}</span>
              </div>
              <div class="comment-content">${text}</div>
            `;
            
            fragment.appendChild(commentEl);
          });
          
          commentsContainer.appendChild(fragment);
        })
        .catch(error => {
          console.error('Error loading comments:', error);
          commentsContainer.innerHTML = '<p class="error-message">Error loading comments</p>';
        });
    } else {
      commentsContainer.innerHTML = '<p class="error-message">Comments module not available</p>';
    }
  } catch (error) {
    console.error('Error in loadComments:', error);
  }
}

// Add a comment to a location
function addComment(locationId, text) {
  if (!window.locationsModule?.addComment) {
    console.error('Comments module not available');
    return Promise.reject(new Error('Comments module not available'));
  }
  
  return window.locationsModule.addComment(locationId, text);
}

// Claim territory
function claimTerritory(locationId) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to claim territories');
    return;
  }
  
  if (locationId.startsWith('temp-')) {
    alert('You cannot claim offline locations');
    return;
  }
  
  if (!window.locationsModule?.claimLocation) {
    console.error('Territories module not available');
    return;
  }
  
  window.locationsModule.claimLocation(locationId)
    .then(success => {
      if (success) {
        refreshLocationMarker(locationId);
      }
    })
    .catch(error => {
      console.error('Error claiming territory:', error);
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error claiming territory. Please try again.', 'error');
      }
    });
}

// Rate a location with stars
function rateLocationWithStars(locationId, rating) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to rate locations');
    return;
  }
  
  if (locationId.startsWith('temp-')) {
    alert('You cannot rate offline locations');
    return;
  }
  
  if (!window.locationsModule?.rateLocationWithStars) {
    console.error('Ratings module not available');
    return;
  }
  
  window.locationsModule.rateLocationWithStars(locationId, rating)
    .then(success => {
      if (success) {
        updateStarRatingUI(locationId, rating);
      }
    })
    .catch(error => {
      console.error('Error rating location:', error);
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error rating location. Please try again.', 'error');
      }
    });
}

// Update star rating UI
function updateStarRatingUI(locationId, rating) {
  try {
    const stars = document.querySelectorAll(`.star-rating[data-id="${locationId}"] .star`);
    stars.forEach(star => {
      const starRating = parseInt(star.dataset.rating);
      if (starRating <= rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });
    
    locationsRef.doc(locationId).get().then(doc => {
      if (doc.exists) {
        const locationData = doc.data();
        
        const ratingValue = document.querySelector(`.star-rating[data-id="${locationId}"] .rating-value`);
        const ratingCount = document.querySelector(`.star-rating[data-id="${locationId}"] .rating-count`);
        
        if (ratingValue && locationData.rating !== undefined) {
          ratingValue.textContent = parseFloat(locationData.rating).toFixed(1);
        }
        
        if (ratingCount && locationData.ratingCount !== undefined) {
          ratingCount.textContent = `(${locationData.ratingCount})`;
        }
      }
    }).catch(error => {
      console.error('Error updating star rating UI:', error);
    });
  } catch (error) {
    console.error('Error in updateStarRatingUI:', error);
  }
}

// Rate a location with thumbs up/down
function rateLocation(locationId, action) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to rate locations');
    return;
  }
  
  if (locationId.startsWith('temp-')) {
    alert('You cannot rate locations that are saved offline');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  if (!user) {
    console.error('User not available');
    return;
  }
  
  const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}`);
  
  ratingRef.get()
    .then(doc => {
      const batch = db.batch();
      
      if (doc.exists) {
        const currentRating = doc.data().type;
        
        if (currentRating === action) {
          // User is removing their rating
          batch.delete(ratingRef);
          
          // Update location rating count
          const locationRef = locationsRef.doc(locationId);
          batch.update(locationRef, {
            [`${action}s`]: firebase.firestore.FieldValue.increment(-1)
          });
        } else {
          // User is changing their rating
          batch.update(ratingRef, {
            type: action,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          
          // Update location rating counts
          const locationRef = locationsRef.doc(locationId);
          batch.update(locationRef, {
            [`${action}s`]: firebase.firestore.FieldValue.increment(1),
            [`${currentRating}s`]: firebase.firestore.FieldValue.increment(-1)
          });
        }
      } else {
        // New rating
        batch.set(ratingRef, {
          type: action,
          userId: user.uid,
          locationId: locationId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update location rating count
        const locationRef = locationsRef.doc(locationId);
        batch.update(locationRef, {
          [`${action}s`]: firebase.firestore.FieldValue.increment(1)
        });
      }
      
      // Commit the batch
      return batch.commit();
    })
    .then(() => {
      refreshLocationMarker(locationId);
    })
    .catch(error => {
      console.error('Error rating location:', error);
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error rating location. Please try again.', 'error');
      }
    });
}

// Refresh location marker after updates
function refreshLocationMarker(locationId) {
  try {
    locationsRef.doc(locationId).get().then(doc => {
      if (doc.exists) {
        const locationData = doc.data();
        
        // Update marker popup
        const marker = locationMarkers[locationId];
        if (marker) {
          marker.closePopup();
          
          // Remove marker from map
          map.removeLayer(marker);
          
          // Re-add marker with updated data
          addLocationMarker({
            id: locationId,
            ...locationData,
            coordinates: { 
              lat: locationData.coordinates.latitude, 
              lng: locationData.coordinates.longitude 
            }
          });
          
          // Open popup
          locationMarkers[locationId].openPopup();
        }
      }
    }).catch(error => {
      console.error('Error refreshing location marker:', error);
    });
  } catch (error) {
    console.error('Error in refreshLocationMarker:', error);
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

// Clear user-specific markers
function clearUserSpecificMarkers() {
  // This function would clear markers that are specific to the current user
  // For example, markers for locations that the user has created or claimed
  // The implementation depends on your specific requirements
  console.log('Clearing user-specific markers');
}

// Create custom icon for markers
function createCustomIcon(type, color) {
  try {
    // Define colors for different categories
    const colors = {
      user: '#39ff14', // Neon green
      abandoned: '#ff2a6d', // Neon pink
      historical: '#05d9e8', // Neon blue
      'street-art': '#9d4edd', // Neon purple
      viewpoint: '#fee440', // Yellow
      'hidden-gem': '#f15bb5', // Pink
      water: '#05d9e8', // Neon blue
      building: '#ff2a6d', // Neon pink
      power: '#39ff14', // Neon green
      camp: '#9d4edd', // Neon purple
      geocache: '#fee440', // Yellow
      other: '#ffffff' // White
    };
    
    // Get color for this type
    const iconColor = color || colors[type] || colors.other;
    
    // Create icon with CSS-based glow effect
    return L.divIcon({
      className: `custom-marker marker-${type}`,
      html: `<div style="background-color: ${iconColor}; box-shadow: 0 0 10px ${iconColor}, 0 0 5px ${iconColor}; display: flex; justify-content: center; align-items: center; border-radius: 50%; width: 100%; height: 100%; border: 2px solid white;">${type === 'user' ? '📍' : ''}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  } catch (error) {
    console.error('Error creating custom icon:', error);
    // Return a default icon as fallback
    return L.divIcon({
      className: 'custom-marker',
      html: '<div style="background-color: #ffffff; border-radius: 50%; width: 100%; height: 100%; border: 2px solid white;"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  }
}

// Show offline indicator
function showOfflineIndicator() {
  try {
    const existingIndicator = document.querySelector('.offline-indicator');
    if (existingIndicator) {
      document.body.removeChild(existingIndicator);
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'offline-indicator';
    indicator.textContent = 'Location saved offline. Will sync when online.';
    document.body.appendChild(indicator);
    
    // Add active class after a small delay to trigger animation
    setTimeout(() => {
      indicator.classList.add('active');
    }, 10);
    
    // Hide after 5 seconds
    setTimeout(() => {
      indicator.classList.remove('active');
      setTimeout(() => {
        if (document.body.contains(indicator)) {
          document.body.removeChild(indicator);
        }
      }, 500);
    }, 5000);
  } catch (error) {
    console.error('Error showing offline indicator:', error);
  }
}

// Export functions for use in other modules
window.mapModule = {
  initMap,
  getUserLocation,
  loadLocations,
  clearLocationMarkers,
  addLocationMarker,
  map: () => map // Return the map instance as a getter function
};
