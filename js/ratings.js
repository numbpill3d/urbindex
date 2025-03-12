// Urbindex - Ratings Module

// Initialize ratings functionality
function initRatings() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    // Nothing to do here yet, but we could load user's ratings history
  });
  
  document.addEventListener('user-signed-out', () => {
    // Clear any user-specific rating data
  });
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

// Upvote a location
async function upvoteLocation(locationId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to vote');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if user has already voted on this location
    const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}_vote`);
    const ratingDoc = await ratingRef.get();
    
    const locationRef = locationsRef.doc(locationId);
    const locationDoc = await locationRef.get();
    
    if (!locationDoc.exists) {
      console.error('Location does not exist');
      return false;
    }
    
    const locationData = locationDoc.data();
    
    if (ratingDoc.exists) {
      const voteData = ratingDoc.data();
      
      if (voteData.vote === 'up') {
        // User is removing their upvote
        await ratingRef.delete();
        
        // Update location upvotes count
        await locationRef.update({
          upvotes: firebase.firestore.FieldValue.increment(-1)
        });
        
        console.log('Upvote removed successfully');
        return { action: 'removed' };
      } else if (voteData.vote === 'down') {
        // User is changing from downvote to upvote
        await ratingRef.update({
          vote: 'up',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update location votes counts
        await locationRef.update({
          upvotes: firebase.firestore.FieldValue.increment(1),
          downvotes: firebase.firestore.FieldValue.increment(-1)
        });
        
        console.log('Vote changed from down to up successfully');
        return { action: 'changed' };
      }
    } else {
      // New upvote
      await ratingRef.set({
        locationId,
        userId: user.uid,
        vote: 'up',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update location upvotes count
      await locationRef.update({
        upvotes: firebase.firestore.FieldValue.increment(1)
      });
      
      console.log('Upvote added successfully');
      return { action: 'added' };
    }
  } catch (error) {
    console.error('Error upvoting location:', error);
    return false;
  }
}

// Downvote a location
async function downvoteLocation(locationId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to vote');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if user has already voted on this location
    const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}_vote`);
    const ratingDoc = await ratingRef.get();
    
    const locationRef = locationsRef.doc(locationId);
    const locationDoc = await locationRef.get();
    
    if (!locationDoc.exists) {
      console.error('Location does not exist');
      return false;
    }
    
    const locationData = locationDoc.data();
    
    if (ratingDoc.exists) {
      const voteData = ratingDoc.data();
      
      if (voteData.vote === 'down') {
        // User is removing their downvote
        await ratingRef.delete();
        
        // Update location downvotes count
        await locationRef.update({
          downvotes: firebase.firestore.FieldValue.increment(-1)
        });
        
        console.log('Downvote removed successfully');
        return { action: 'removed' };
      } else if (voteData.vote === 'up') {
        // User is changing from upvote to downvote
        await ratingRef.update({
          vote: 'down',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Update location votes counts
        await locationRef.update({
          upvotes: firebase.firestore.FieldValue.increment(-1),
          downvotes: firebase.firestore.FieldValue.increment(1)
        });
        
        console.log('Vote changed from up to down successfully');
        return { action: 'changed' };
      }
    } else {
      // New downvote
      await ratingRef.set({
        locationId,
        userId: user.uid,
        vote: 'down',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update location downvotes count
      await locationRef.update({
        downvotes: firebase.firestore.FieldValue.increment(1)
      });
      
      console.log('Downvote added successfully');
      return { action: 'added' };
    }
  } catch (error) {
    console.error('Error downvoting location:', error);
    return false;
  }
}

// Get user's vote for a location
async function getUserVote(locationId) {
  if (!authModule.isAuthenticated()) {
    return null;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if user has voted on this location
    const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}_vote`);
    const ratingDoc = await ratingRef.get();
    
    if (ratingDoc.exists) {
      return ratingDoc.data().vote;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user vote:', error);
    return null;
  }
}

// Get user's star rating for a location
async function getUserStarRating(locationId) {
  if (!authModule.isAuthenticated()) {
    return null;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if user has rated this location
    const ratingRef = ratingsRef.doc(`${locationId}_${user.uid}_stars`);
    const ratingDoc = await ratingRef.get();
    
    if (ratingDoc.exists) {
      return ratingDoc.data().value;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user star rating:', error);
    return null;
  }
}

// Render star rating component
function renderStarRating(locationId, container, editable = true) {
  if (!container) return;
  
  // Create star rating container
  const ratingContainer = document.createElement('div');
  ratingContainer.className = 'star-rating';
  
  // Create stars
  for (let i = 1; i <= 5; i++) {
    const star = document.createElement('span');
    star.className = 'star';
    star.innerHTML = '★';
    star.dataset.value = i;
    
    if (editable) {
      star.addEventListener('click', async () => {
        if (!authModule.isAuthenticated()) {
          alert('Please sign in to rate locations');
          return;
        }
        
        const success = await rateLocationWithStars(locationId, i);
        
        if (success) {
          // Update UI
          updateStars(i);
        }
      });
      
      // Hover effects
      star.addEventListener('mouseenter', () => {
        // Highlight stars up to this one
        const stars = ratingContainer.querySelectorAll('.star');
        stars.forEach(s => {
          if (parseInt(s.dataset.value) <= i) {
            s.classList.add('hover');
          } else {
            s.classList.remove('hover');
          }
        });
      });
    }
  }
  
  // Add to container
  container.appendChild(ratingContainer);
  
  // Function to update stars display
  const updateStars = (rating) => {
    const stars = ratingContainer.querySelectorAll('.star');
    stars.forEach(star => {
      star.classList.remove('active', 'hover');
      if (parseInt(star.dataset.value) <= rating) {
        star.classList.add('active');
      }
    });
  };
  
  // Mouse leave event for container
  if (editable) {
    ratingContainer.addEventListener('mouseleave', async () => {
      // Reset to current rating
      const userRating = await getUserStarRating(locationId);
      updateStars(userRating || 0);
    });
  }
  
  // Initial state
  getUserStarRating(locationId).then(rating => {
    if (rating) {
      updateStars(rating);
    }
  });
  
  return ratingContainer;
}

// Render upvote/downvote component
function renderVoteButtons(locationId, container) {
  if (!container) return;
  
  // Create vote container
  const voteContainer = document.createElement('div');
  voteContainer.className = 'rating-container';
  
  // Create upvote button
  const upvoteBtn = document.createElement('button');
  upvoteBtn.className = 'rating-btn upvote';
  upvoteBtn.innerHTML = '👍';
  upvoteBtn.addEventListener('click', async () => {
    if (!authModule.isAuthenticated()) {
      alert('Please sign in to vote');
      return;
    }
    
    const result = await upvoteLocation(locationId);
    
    if (result) {
      // Update UI
      updateVoteButtons();
      
      // Update count
      const locationRef = locationsRef.doc(locationId);
      const locationDoc = await locationRef.get();
      if (locationDoc.exists) {
        const locationData = locationDoc.data();
        upvoteCount.textContent = locationData.upvotes || 0;
        downvoteCount.textContent = locationData.downvotes || 0;
      }
    }
  });
  
  // Create upvote count
  const upvoteCount = document.createElement('span');
  upvoteCount.className = 'rating-count upvote-count';
  upvoteCount.textContent = '0';
  
  // Create downvote button
  const downvoteBtn = document.createElement('button');
  downvoteBtn.className = 'rating-btn downvote';
  downvoteBtn.innerHTML = '👎';
  downvoteBtn.addEventListener('click', async () => {
    if (!authModule.isAuthenticated()) {
      alert('Please sign in to vote');
      return;
    }
    
    const result = await downvoteLocation(locationId);
    
    if (result) {
      // Update UI
      updateVoteButtons();
      
      // Update count
      const locationRef = locationsRef.doc(locationId);
      const locationDoc = await locationRef.get();
      if (locationDoc.exists) {
        const locationData = locationDoc.data();
        upvoteCount.textContent = locationData.upvotes || 0;
        downvoteCount.textContent = locationData.downvotes || 0;
      }
    }
  });
  
  // Create downvote count
  const downvoteCount = document.createElement('span');
  downvoteCount.className = 'rating-count downvote-count';
  downvoteCount.textContent = '0';
  
  // Add to container
  voteContainer.appendChild(upvoteBtn);
  voteContainer.appendChild(upvoteCount);
  voteContainer.appendChild(downvoteBtn);
  voteContainer.appendChild(downvoteCount);
  container.appendChild(voteContainer);
  
  // Function to update vote buttons
  const updateVoteButtons = async () => {
    const userVote = await getUserVote(locationId);
    
    upvoteBtn.classList.remove('active');
    downvoteBtn.classList.remove('active');
    
    if (userVote === 'up') {
      upvoteBtn.classList.add('active');
    } else if (userVote === 'down') {
      downvoteBtn.classList.add('active');
    }
  };
  
  // Initial state
  locationsRef.doc(locationId).get().then(doc => {
    if (doc.exists) {
      const locationData = doc.data();
      upvoteCount.textContent = locationData.upvotes || 0;
      downvoteCount.textContent = locationData.downvotes || 0;
    }
  });
  
  updateVoteButtons();
  
  return voteContainer;
}

// Export functions for use in other modules
window.ratingsModule = {
  initRatings,
  rateLocationWithStars,
  upvoteLocation,
  downvoteLocation,
  getUserVote,
  getUserStarRating,
  renderStarRating,
  renderVoteButtons
};
