// Urbindex - Ratings Module

function initRatings() {
  console.log('Ratings module initialized');
}

// Rate location with upvote/downvote
async function voteLocation(locationId, action) {
  if (!window.authModule?.isAuthenticated()) {
    window.offlineModule?.showToast('Please sign in to vote', 'warning');
    return false;
  }
  
  if (!ratingsRef || !locationsRef) {
    console.error('Firebase references not available');
    return false;
  }
  
  const user = window.authModule.getCurrentUser();
  const voteId = `${locationId}_${user.uid}_vote`;
  
  try {
    const voteRef = ratingsRef.doc(voteId);
    const voteDoc = await voteRef.get();
    const locationRef = locationsRef.doc(locationId);
    
    if (voteDoc.exists) {
      const existingVote = voteDoc.data();
      if (existingVote.type === action) return true; // Already voted
      
      // Change vote
      await voteRef.update({ type: action });
      
      // Update location counters
      const increment = firebase.firestore.FieldValue.increment;
      const updates = {};
      
      if (action === 'upvote') {
        updates.upvotes = increment(1);
        updates.downvotes = increment(-1);
      } else {
        updates.upvotes = increment(-1);
        updates.downvotes = increment(1);
      }
      
      await locationRef.update(updates);
    } else {
      // New vote
      await voteRef.set({
        locationId,
        userId: user.uid,
        type: action,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      const increment = firebase.firestore.FieldValue.increment(1);
      const updates = {};
      updates[action === 'upvote' ? 'upvotes' : 'downvotes'] = increment;
      
      await locationRef.update(updates);
    }
    
    return true;
  } catch (error) {
    console.error('Error voting:', error);
    return false;
  }
}

// Rate location with stars (1-5)
async function rateLocation(locationId, rating) {
  if (!window.authModule?.isAuthenticated()) {
    window.offlineModule?.showToast('Please sign in to rate', 'warning');
    return false;
  }
  
  if (rating < 1 || rating > 5) return false;
  
  if (!ratingsRef || !locationsRef) {
    console.error('Firebase references not available');
    return false;
  }
  
  const user = window.authModule.getCurrentUser();
  const ratingId = `${locationId}_${user.uid}_stars`;
  
  try {
    const ratingRef = ratingsRef.doc(ratingId);
    const ratingDoc = await ratingRef.get();
    const locationRef = locationsRef.doc(locationId);
    const locationDoc = await locationRef.get();
    
    if (!locationDoc.exists) return false;
    
    const locationData = locationDoc.data();
    let newRating, newCount;
    
    if (ratingDoc.exists) {
      // Update existing rating
      const oldRating = ratingDoc.data().value;
      const oldTotal = locationData.rating * locationData.ratingCount;
      newCount = locationData.ratingCount;
      newRating = (oldTotal - oldRating + rating) / newCount;
      
      await ratingRef.update({
        value: rating,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // New rating
      const oldTotal = (locationData.rating || 0) * (locationData.ratingCount || 0);
      newCount = (locationData.ratingCount || 0) + 1;
      newRating = (oldTotal + rating) / newCount;
      
      await ratingRef.set({
        locationId,
        userId: user.uid,
        value: rating,
        type: 'stars',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await locationRef.update({
      rating: newRating,
      ratingCount: newCount
    });
    
    return true;
  } catch (error) {
    console.error('Error rating location:', error);
    return false;
  }
}

window.ratingsModule = {
  initRatings,
  voteLocation,
  rateLocation
};