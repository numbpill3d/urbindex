// Urbindex - Geocaching Module

// Initialize geocaching functionality
function initGeocaching() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    // Nothing to do here yet, but we could load user's geocache history
  });
  
  document.addEventListener('user-signed-out', () => {
    // Clear any user-specific geocache data
  });
}

// Create a new geocache
async function createGeocache(locationId, data) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to create geocaches');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if location exists
    const locationDoc = await locationsRef.doc(locationId).get();
    
    if (!locationDoc.exists) {
      console.error('Location does not exist');
      return false;
    }
    
    // Create geocache document
    const geocacheData = {
      locationId,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      title: data.title || 'Geocache',
      description: data.description || '',
      hint: data.hint || '',
      difficulty: data.difficulty || 1,
      size: data.size || 'small',
      status: 'active',
      findCount: 0,
      lastFoundAt: null,
      items
