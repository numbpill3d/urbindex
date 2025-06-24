// Urbindex - Forum Module

// Initialize forum functionality
function initForum() {
  console.log('Initializing forum module');
  
  // Set up event listeners
  setupForumEventListeners();
  
  // Load initial forum posts
  loadForumPosts();
}

// Set up forum event listeners
function setupForumEventListeners() {
  const newPostForm = document.getElementById('new-post-form');
  if (newPostForm) {
    newPostForm.addEventListener('submit', handleNewPost);
  }
  
  const forumCategories = document.querySelectorAll('.forum-category');
  forumCategories.forEach(category => {
    category.addEventListener('click', () => {
      // Remove active class from all categories
      forumCategories.forEach(cat => cat.classList.remove('active'));
      // Add active class to clicked category
      category.classList.add('active');
      
      // Load posts for this category
      const categoryValue = category.dataset.category;
      loadForumPosts(categoryValue);
    });
  });
}

// Handle new post submission
async function handleNewPost(e) {
  e.preventDefault();
  
  if (!window.authModule?.isAuthenticated()) {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Please sign in to create posts', 'warning');
    }
    return;
  }
  
  const form = e.target;
  const formData = new FormData(form);
  const user = window.authModule.getCurrentUser();
  
  const postData = {
    title: formData.get('title'),
    content: formData.get('content'),
    category: 'general',
    createdBy: user.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userDisplayName: user.displayName || 'Anonymous',
    userPhotoURL: user.photoURL || null,
    upvotes: 0,
    downvotes: 0,
    replies: 0
  };
  
  try {
    const docRef = await db.collection('forum').add(postData);
    console.log('Forum post created:', docRef.id);
    
    // Reset form
    form.reset();
    
    // Reload posts
    loadForumPosts();
    
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Post created successfully!', 'success');
    }
  } catch (error) {
    console.error('Error creating post:', error);
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Error creating post. Please try again.', 'error');
    }
  }
}

// Load forum posts
async function loadForumPosts(category = null) {
  try {
    let query = db.collection('forum').orderBy('createdAt', 'desc').limit(20);
    
    if (category && category !== 'general') {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    const forumList = document.querySelector('.forum-list ul');
    
    if (!forumList) return;
    
    // Clear existing posts
    forumList.innerHTML = '';
    
    if (snapshot.empty) {
      forumList.innerHTML = '<li class="empty-state">No posts found. Be the first to post!</li>';
      return;
    }
    
    snapshot.forEach(doc => {
      const postData = doc.data();
      const postElement = createForumPostElement(doc.id, postData);
      forumList.appendChild(postElement);
    });
    
  } catch (error) {
    console.error('Error loading forum posts:', error);
    const forumList = document.querySelector('.forum-list ul');
    if (forumList) {
      forumList.innerHTML = '<li class="error-state">Error loading posts. Please try again.</li>';
    }
  }
}

// Create forum post element
function createForumPostElement(id, postData) {
  const li = document.createElement('li');
  li.className = 'forum-post';
  li.dataset.id = id;
  
  const dateDisplay = postData.createdAt ? 
    (postData.createdAt.toDate ? postData.createdAt.toDate().toLocaleDateString() : 'Recent') : 
    'Unknown date';
  
  li.innerHTML = `
    <div class="forum-post-header">
      <div class="forum-post-user">
        ${postData.userPhotoURL ? 
          `<img src="${postData.userPhotoURL}" alt="${postData.userDisplayName}" class="user-avatar-small">` : 
          '<div class="user-avatar-placeholder"></div>'
        }
        <span class="user-name">${postData.userDisplayName || 'Anonymous'}</span>
      </div>
      <span class="forum-post-date">${dateDisplay}</span>
    </div>
    <h3 class="forum-post-title">${postData.title}</h3>
    <p class="forum-post-content">${postData.content}</p>
    <div class="forum-post-actions">
      <button class="forum-action-btn upvote-btn" data-id="${id}">
        <i class="fas fa-arrow-up"></i> ${postData.upvotes || 0}
      </button>
      <button class="forum-action-btn downvote-btn" data-id="${id}">
        <i class="fas fa-arrow-down"></i> ${postData.downvotes || 0}
      </button>
      <button class="forum-action-btn reply-btn" data-id="${id}">
        <i class="fas fa-reply"></i> ${postData.replies || 0}
      </button>
    </div>
  `;
  
  // Add event listeners for actions
  const upvoteBtn = li.querySelector('.upvote-btn');
  const downvoteBtn = li.querySelector('.downvote-btn');
  
  if (upvoteBtn) {
    upvoteBtn.addEventListener('click', () => voteOnPost(id, 'upvote'));
  }
  
  if (downvoteBtn) {
    downvoteBtn.addEventListener('click', () => voteOnPost(id, 'downvote'));
  }
  
  return li;
}

// Vote on a forum post
async function voteOnPost(postId, voteType) {
  if (!window.authModule?.isAuthenticated()) {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Please sign in to vote', 'warning');
    }
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  
  try {
    const postRef = db.collection('forum').doc(postId);
    const postDoc = await postRef.get();
    
    if (!postDoc.exists) return;
    
    const postData = postDoc.data();
    const updateData = {};
    
    if (voteType === 'upvote') {
      updateData.upvotes = (postData.upvotes || 0) + 1;
    } else {
      updateData.downvotes = (postData.downvotes || 0) + 1;
    }
    
    await postRef.update(updateData);
    
    // Reload posts to show updated counts
    loadForumPosts();
    
  } catch (error) {
    console.error('Error voting on post:', error);
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Error voting. Please try again.', 'error');
    }
  }
}

// Export functions
window.forumModule = {
  initForum,
  loadForumPosts
};