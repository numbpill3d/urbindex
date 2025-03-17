// Urbindex - Forum Initialization Module

// Function to add placeholder intro posts to the forum
function addPlaceholderPosts() {
  // Check if we've already added placeholder posts
  const placeholdersAddedKey = 'urbindex_placeholder_posts_added';
  if (localStorage.getItem(placeholdersAddedKey) === 'true') {
    console.log('Placeholder posts already added');
    return Promise.resolve();
  }

  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) {
    console.warn('User must be authenticated to add placeholder posts');
    return Promise.reject(new Error('User not authenticated'));
  }

  const user = window.authModule.getCurrentUser();
  if (!user) {
    console.warn('Current user not available');
    return Promise.reject(new Error('Current user not available'));
  }

  console.log('Adding placeholder forum posts...');

  // Placeholder posts data
  const placeholderPosts = [
    {
      title: "Welcome to Urbindex!",
      category: "general",
      content: `
        <p>Hello explorers!</p>
        <p>Welcome to Urbindex, the community-driven urban exploration mapping tool. This platform is designed to help urban explorers discover, document, and share interesting locations in their cities.</p>
        <p>Some key features of Urbindex:</p>
        <ul>
          <li>Interactive map with various location types</li>
          <li>Community forum for sharing tips and experiences</li>
          <li>Crew territories to claim and defend areas</li>
          <li>Geocaching system for hidden treasures</li>
          <li>Radar to find nearby explorers</li>
        </ul>
        <p>Feel free to introduce yourself and share your urban exploration interests!</p>
      `,
      authorId: user.uid,
      authorName: user.displayName || 'Admin',
      authorPhotoURL: user.photoURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      replyCount: 0,
      likeCount: 0
    },
    {
      title: "Urban Exploration Safety Tips",
      category: "tips",
      content: `
        <p>Safety should always be your top priority when exploring urban environments. Here are some essential tips:</p>
        <ol>
          <li><strong>Never explore alone</strong> - Always bring at least one trusted companion.</li>
          <li><strong>Tell someone where you're going</strong> - Share your plans with someone who isn't joining you.</li>
          <li><strong>Bring proper equipment</strong> - Flashlights, first aid kit, water, and proper footwear are essential.</li>
          <li><strong>Research locations beforehand</strong> - Know what you're getting into and potential hazards.</li>
          <li><strong>Respect private property</strong> - If a sign says "No Trespassing," respect it.</li>
          <li><strong>Leave no trace</strong> - Take only photographs, leave only footprints.</li>
          <li><strong>Watch for structural hazards</strong> - Rotting floors, unstable structures, exposed nails, etc.</li>
          <li><strong>Be aware of air quality</strong> - Asbestos, mold, and other contaminants can be present in abandoned buildings.</li>
        </ol>
        <p>What other safety tips would you add to this list? Share your experiences and advice below!</p>
      `,
      authorId: user.uid,
      authorName: user.displayName || 'Admin',
      authorPhotoURL: user.photoURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      replyCount: 0,
      likeCount: 0
    },
    {
      title: "How to Use the Crew Territories Feature",
      category: "crews",
      content: `
        <p>The Crew Territories feature allows groups of explorers to claim and defend areas on the map. Here's how it works:</p>
        <h3>Creating a Crew</h3>
        <p>1. Go to the Crews tab in the navigation menu<br>
           2. Click "Create a Crew"<br>
           3. Fill in your crew details and invite members</p>
        
        <h3>Claiming Territory</h3>
        <p>1. Find an unclaimed location on the map<br>
           2. Click on the location and select "Claim for Crew"<br>
           3. Your crew will now control this location</p>
        
        <h3>Territory Benefits</h3>
        <p>- Exclusive access to certain features in your territory<br>
           - Bonus points for activities within your territory<br>
           - Recognition on the leaderboard</p>
        
        <p>Has your crew claimed any territories yet? Share your experiences below!</p>
      `,
      authorId: user.uid,
      authorName: user.displayName || 'Admin',
      authorPhotoURL: user.photoURL || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      replyCount: 0,
      likeCount: 0
    }
  ];

  // Add posts to Firestore
  const batch = db.batch();
  const postsRef = db.collection('forum_posts');
  
  placeholderPosts.forEach(post => {
    const docRef = postsRef.doc();
    batch.set(docRef, post);
  });

  return batch.commit()
    .then(() => {
      console.log('Placeholder posts added successfully');
      localStorage.setItem(placeholdersAddedKey, 'true');
      return Promise.resolve();
    })
    .catch(error => {
      console.error('Error adding placeholder posts:', error);
      return Promise.reject(error);
    });
}

// Export functions for use in other modules
window.forumInitModule = {
  addPlaceholderPosts
};
