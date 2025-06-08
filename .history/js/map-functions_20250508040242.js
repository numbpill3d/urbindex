// Display comments in the UI for a location
function displayComments(locationId) {
  try {
    const commentsContainer = document.querySelector(`.comments-container[data-id="${locationId}"]`);
    if (!commentsContainer) {
      return;
    }

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
    console.error('Error in displayComments:', error);
  }
}

// Submit a comment to a location
function submitComment(locationId, text) {
  if (!window.locationsModule?.addComment) {
    console.error('Comments module not available');
    return Promise.reject(new Error('Comments module not available'));
  }

  return window.locationsModule.addComment(locationId, text)
    .then(success => {
      if (success) {
        // Refresh the comments display
        displayComments(locationId);
        return true;
      }
      return false;
    });
}

// Claim territory for a location
function claimTerritory(locationId) {
  // Validate input
  if (!locationId || typeof locationId !== 'string') {
    console.error('Invalid locationId provided to claimTerritory');
    return Promise.reject(new Error('Invalid locationId'));
  }

  // Check authentication
  if (!window.authModule?.isAuthenticated()) {
    const message = 'Please sign in to claim territories';
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast(message, 'warning');
    } else {
      alert(message);
    }
    return Promise.reject(new Error('User not authenticated'));
  }

  // Check if location is offline
  if (locationId.startsWith('temp-')) {
    const message = 'You cannot claim offline locations';
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast(message, 'warning');
    } else {
      alert(message);
    }
    return Promise.reject(new Error('Cannot claim offline location'));
  }

  // Check if territories module is available
  if (!window.locationsModule?.claimLocation) {
    console.error('Territories module not available');
    return Promise.reject(new Error('Territories module not available'));
  }

  // Claim the territory
  return window.locationsModule.claimLocation(locationId)
    .then(success => {
      if (success) {
        // Update the marker on the map
        refreshLocationMarker(locationId);

        // Show success message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Territory claimed successfully!', 'success');
        }
        return true;
      }
      return false;
    })
    .catch(error => {
      console.error('Error claiming territory:', error);
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error claiming territory. Please try again.', 'error');
      }
      throw error; // Re-throw to allow caller to handle
    });
}

// Rate a location with stars (1-5)
function rateLocationWithStars(locationId, rating) {
  // Validate inputs
  if (!locationId || typeof locationId !== 'string') {
    console.error('Invalid locationId provided to rateLocationWithStars');
    return Promise.reject(new Error('Invalid locationId'));
  }

  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    console.error('Invalid rating value. Must be a number between 1 and 5');
    return Promise.reject(new Error('Invalid rating value'));
  }

  // Check authentication
  if (!window.authModule?.isAuthenticated()) {
    const message = 'Please sign in to rate locations';
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast(message, 'warning');
    } else {
      alert(message);
    }
    return Promise.reject(new Error('User not authenticated'));
  }

  // Check if location is offline
  if (locationId.startsWith('temp-')) {
    const message = 'You cannot rate offline locations';
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast(message, 'warning');
    } else {
      alert(message);
    }
    return Promise.reject(new Error('Cannot rate offline location'));
  }

  // Check if ratings module is available
  if (!window.locationsModule?.rateLocationWithStars) {
    console.error('Ratings module not available');
    return Promise.reject(new Error('Ratings module not available'));
  }

  // Rate the location
  return window.locationsModule.rateLocationWithStars(locationId, rating)
    .then(success => {
      if (success) {
        // Update UI
        updateStarRatingUI(locationId, rating);
        return true;
      }
      return false;
    })
    .catch(error => {
      console.error('Error rating location:', error);
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error rating location. Please try again.', 'error');
      }
      throw error; // Re-throw to allow caller to handle
    });
}

// Update star rating UI
function updateStarRatingUI(locationId, rating) {
  try {
    // Update star UI
    const stars = document.querySelectorAll(`.star-rating[data-id="${locationId}"] .star`);
    stars.forEach(star => {
      const starRating = parseInt(star.dataset.rating);
      if (starRating <= rating) {
        star.classList.add('active');
      } else {
        star.classList.remove('active');
      }
    });

    // Check if Firebase is available
    if (!window.firebase || !window.db) {
      console.error('Firebase not available for updateStarRatingUI');
      return;
    }

    // Get the locations collection reference
    const locationsRef = window.db.collection('locations');

    // Get updated location data
    locationsRef.doc(locationId).get().then(doc => {
      if (doc.exists) {
        const locationData = doc.data();

        // Update rating display
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
  // Validate inputs
  if (!locationId || typeof locationId !== 'string') {
    console.error('Invalid locationId provided to rateLocation');
    return Promise.reject(new Error('Invalid locationId'));
  }

  if (!action || (action !== 'upvote' && action !== 'downvote')) {
    console.error('Invalid action provided to rateLocation. Must be "upvote" or "downvote"');
    return Promise.reject(new Error('Invalid action'));
  }

  // Check authentication
  if (!window.authModule?.isAuthenticated()) {
    const message = 'Please sign in to rate locations';
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast(message, 'warning');
    } else {
      alert(message);
    }
    return Promise.reject(new Error('User not authenticated'));
  }

  // Check if location is offline
  if (locationId.startsWith('temp-')) {
    const message = 'You cannot rate locations that are saved offline';
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast(message, 'warning');
    } else {
      alert(message);
    }
    return Promise.reject(new Error('Cannot rate offline location'));
  }

  // Check if Firebase is available
  if (!window.firebase || !window.db) {
    console.error('Firebase not available');
    return Promise.reject(new Error('Firebase not available'));
  }

  const user = window.authModule.getCurrentUser();
  if (!user) {
    console.error('User not available');
    return Promise.reject(new Error('User not available'));
  }

  // Get the collections references
  const ratingsRef = window.db.collection('ratings');
  const locationsRef = window.db.collection('locations');

  const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}`);

  return ratingRef.get()
    .then(doc => {
      const batch = window.db.batch();

      if (doc.exists) {
        const currentRating = doc.data().type;

        if (currentRating === action) {
          // User is removing their rating
          batch.delete(ratingRef);

          // Update location rating count
          const locationRef = locationsRef.doc(locationId);
          batch.update(locationRef, {
            [`${action}s`]: window.firebase.firestore.FieldValue.increment(-1)
          });
        } else {
          // User is changing their rating
          batch.update(ratingRef, {
            type: action,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          });

          // Update location rating counts
          const locationRef = locationsRef.doc(locationId);
          batch.update(locationRef, {
            [`${action}s`]: window.firebase.firestore.FieldValue.increment(1),
            [`${currentRating}s`]: window.firebase.firestore.FieldValue.increment(-1)
          });
        }
      } else {
        // New rating
        batch.set(ratingRef, {
          type: action,
          userId: user.uid,
          locationId: locationId,
          createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        // Update location rating count
        const locationRef = locationsRef.doc(locationId);
        batch.update(locationRef, {
          [`${action}s`]: window.firebase.firestore.FieldValue.increment(1)
        });
      }

      // Commit the batch
      return batch.commit();
    })
    .then(() => {
      // Update the marker on the map
      refreshLocationMarker(locationId);

      // Show success message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast(`Location ${action}d successfully!`, 'success');
      }

      return true;
    })
    .catch(error => {
      console.error('Error rating location:', error);
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error rating location. Please try again.', 'error');
      }
      throw error; // Re-throw to allow caller to handle
    });
}

// Refresh location marker after updates
function refreshLocationMarker(locationId) {
  try {
    // Check if Firebase and map module are available
    if (!window.firebase || !window.db || !window.mapModule) {
      console.error('Required modules not available for refreshLocationMarker');
      return;
    }

    // Get the locations collection reference
    const locationsRef = window.db.collection('locations');

    locationsRef.doc(locationId).get().then(doc => {
      if (doc.exists) {
        const locationData = doc.data();

        // Check if map module is available
        if (!window.mapModule || !window.mapModule.map()) {
          console.error('Map module not available');
          return;
        }

        // Get the map instance
        const map = window.mapModule.map();

        // Get location markers from map module
        const locationMarkers = window.mapModule.getLocationMarkers ?
          window.mapModule.getLocationMarkers() : {};

        // Update marker popup
        const marker = locationMarkers[locationId];
        if (marker) {
          marker.closePopup();

          // Remove marker from map
          map.removeLayer(marker);

          // Re-add marker with updated data
          if (window.mapModule.addLocationMarker) {
            window.mapModule.addLocationMarker({
              id: locationId,
              ...locationData,
              coordinates: {
                lat: locationData.coordinates.latitude,
                lng: locationData.coordinates.longitude
              }
            });

            // Open popup if the marker was added successfully
            const updatedMarkers = window.mapModule.getLocationMarkers ?
              window.mapModule.getLocationMarkers() : {};

            if (updatedMarkers[locationId]) {
              updatedMarkers[locationId].openPopup();
            }
          }
        }
      }
    }).catch(error => {
      console.error('Error refreshing location marker:', error);
    });
  } catch (error) {
    console.error('Error in refreshLocationMarker:', error);
  }
}

// Clear user-specific markers
function clearUserSpecificMarkers() {
  // This function would clear markers that are specific to the current user
  // For example, markers for locations that the user has created or claimed
  // The implementation depends on your specific requirements
  console.log('Clearing user-specific markers');

  // Use the map module's clearLocationMarkers function if available
  if (window.mapModule?.clearLocationMarkers) {
    window.mapModule.clearLocationMarkers();
  }
}

// Show offline indicator
function showOfflineIndicator() {
  try {
    // Check if an indicator already exists and remove it
    const existingIndicator = document.querySelector('.offline-indicator');
    if (existingIndicator?.parentNode) {
      existingIndicator.parentNode.removeChild(existingIndicator);
    }

    // Create a new indicator
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
        if (indicator.parentNode) {
          indicator.parentNode.removeChild(indicator);
        }
      }, 500);
    }, 5000);
  } catch (error) {
    console.error('Error showing offline indicator:', error);
  }
}

// Export additional map functions to extend the map module
// These functions will be available through the window.mapFunctions object
window.mapFunctions = {
  displayComments,
  submitComment,
  claimTerritory,
  rateLocationWithStars,
  updateStarRatingUI,
  rateLocation,
  refreshLocationMarker,
  clearUserSpecificMarkers,
  showOfflineIndicator
};
