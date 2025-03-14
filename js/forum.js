// Urbindex - Forum Module

// Forum state
let currentCategory = 'all';
let posts = [];
let isLoading = false;

// Initialize forum module
function initForum() {
  try {
    // Set up event listeners
    setupEventListeners();
    
    // Load initial posts
    loadForumPosts('all');
    
    console.log('Forum module initialized');
    return Promise.resolve();
  } catch (error) {
    console.error('Error initializing forum module:', error);
    return Promise.reject(error);
  }
}

// Set up event listeners
function setupEventListeners() {
  // New post button
  const newPostBtn = document.getElementById('new-post-btn');
  if (newPostBtn) {
    newPostBtn.addEventListener('click', () => {
      if (!window.authModule?.isAuthenticated()) {
        alert('Please sign in to create a post');
        return;
      }
      
      const postForm = document.getElementById('forum-post-form');
      if (postForm) {
        postForm.classList.remove('hidden');
      }
    });
  }
  
  // Cancel post button
  const cancelPostBtn = document.getElementById('cancel-post-btn');
  if (cancelPostBtn) {
    cancelPostBtn.addEventListener('click', () => {
      const postForm = document.getElementById('forum-post-form');
      if (postForm) {
        postForm.classList.add('hidden');
        postForm.reset();
      }
    });
  }
  
  // Forum post form
  const postForm = document.getElementById('forum-post-form');
  if (postForm) {
    postForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForumPost();
    });
  }
  
  // Forum search
  const searchBtn = document.getElementById('forum-search-btn');
  const searchInput = document.getElementById('forum-search');
  
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        searchForumPosts(searchTerm);
      } else {
        loadForumPosts(currentCategory);
      }
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
          searchForumPosts(searchTerm);
        } else {
          loadForumPosts(currentCategory);
        }
      }
    });
  }
  
  // Forum categories
  const categories = document.querySelectorAll('.forum-category');
  if (categories) {
    categories.forEach(category => {
      category.addEventListener('click', () => {
        // Remove active class from all categories
        categories.forEach(cat => cat.classList.remove('active'));
        
        // Add active class to clicked category
        category.classList.add('active');
        
        // Load posts for this category
        const categoryValue = category.dataset.category;
        currentCategory = categoryValue;
        loadForumPosts(categoryValue);
      });
    });
  }
}

// Load forum posts
function loadForumPosts(category = 'all') {
  if (isLoading) return;
  isLoading = true;
  
  const forumList = document.getElementById('forum-list');
  if (!forumList) return;
  
  // Show loading state
  forumList.innerHTML = '<li class="forum-item loading">Loading posts...</li>';
  
  // Reference to posts collection
  let postsRef = db.collection('forum_posts').orderBy('createdAt', 'desc');
  
  // Filter by category if not 'all'
  if (category !== 'all') {
    postsRef = postsRef.where('category', '==', category);
  }
  
  // Get posts
  postsRef.get()
    .then(snapshot => {
      // Clear loading state
      forumList.innerHTML = '';
      
      if (snapshot.empty) {
        forumList.innerHTML = '<li class="forum-item empty">No posts found</li>';
        return;
      }
      
      // Store posts in memory
      posts = [];
      
      // Create document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      snapshot.forEach(doc => {
        const postData = doc.data();
        const post = {
          id: doc.id,
          ...postData
        };
        
        posts.push(post);
        
        // Create post element
        const postElement = createPostElement(post);
        fragment.appendChild(postElement);
      });
      
      // Append all posts at once
      forumList.appendChild(fragment);
    })
    .catch(error => {
      console.error('Error loading forum posts:', error);
      forumList.innerHTML = '<li class="forum-item error">Error loading posts. Please try again.</li>';
    })
    .finally(() => {
      isLoading = false;
    });
}

// Create post element
function createPostElement(post) {
  const postElement = document.createElement('li');
  postElement.className = 'forum-item';
  postElement.dataset.id = post.id;
  
  // Format date
  let dateDisplay = 'Just now';
  if (post.createdAt) {
    const date = post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
    dateDisplay = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Sanitize user input to prevent XSS
  const title = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(post.title || 'Untitled')
    : (post.title || 'Untitled');
    
  const content = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(post.content || '')
    : (post.content || '');
    
  const author = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(post.authorName || 'Anonymous')
    : (post.authorName || 'Anonymous');
  
  // Get category label
  const categoryLabel = getCategoryLabel(post.category);
  
  // Create post HTML
  postElement.innerHTML = `
    <div class="forum-item-header">
      <h3 class="forum-item-title">${title}</h3>
      <span class="forum-item-category">${categoryLabel}</span>
    </div>
    <div class="forum-item-content">${content}</div>
    <div class="forum-item-footer">
      <div class="forum-item-meta">
        <span class="forum-item-author">Posted by ${author}</span>
        <span class="forum-item-date">${dateDisplay}</span>
      </div>
      <div class="forum-item-actions">
        <button class="forum-item-reply-btn neon-button small" data-id="${post.id}">Reply</button>
        <button class="forum-item-share-btn neon-button small" data-id="${post.id}">Share</button>
      </div>
    </div>
    <div class="forum-item-replies" data-id="${post.id}"></div>
    <div class="forum-item-reply-form hidden" data-id="${post.id}">
      <textarea class="forum-reply-input" placeholder="Write a reply..."></textarea>
      <div class="forum-reply-actions">
        <button class="forum-reply-cancel-btn neon-button small">Cancel</button>
        <button class="forum-reply-submit-btn neon-button small" data-id="${post.id}">Post Reply</button>
      </div>
    </div>
  `;
  
  // Set up event listeners for this post
  setupPostEventListeners(postElement, post);
  
  return postElement;
}

// Set up event listeners for a post
function setupPostEventListeners(postElement, post) {
  // Reply button
  const replyBtn = postElement.querySelector('.forum-item-reply-btn');
  if (replyBtn) {
    replyBtn.addEventListener('click', () => {
      if (!window.authModule?.isAuthenticated()) {
        alert('Please sign in to reply');
        return;
      }
      
      const replyForm = postElement.querySelector('.forum-item-reply-form');
      if (replyForm) {
        replyForm.classList.remove('hidden');
      }
    });
  }
  
  // Cancel reply button
  const cancelReplyBtn = postElement.querySelector('.forum-reply-cancel-btn');
  if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', () => {
      const replyForm = postElement.querySelector('.forum-item-reply-form');
      const replyInput = postElement.querySelector('.forum-reply-input');
      
      if (replyForm) {
        replyForm.classList.add('hidden');
      }
      
      if (replyInput) {
        replyInput.value = '';
      }
    });
  }
  
  // Submit reply button
  const submitReplyBtn = postElement.querySelector('.forum-reply-submit-btn');
  if (submitReplyBtn) {
    submitReplyBtn.addEventListener('click', () => {
      const replyInput = postElement.querySelector('.forum-reply-input');
      if (replyInput) {
        const replyText = replyInput.value.trim();
        if (replyText) {
          submitReply(post.id, replyText);
          replyInput.value = '';
          
          const replyForm = postElement.querySelector('.forum-item-reply-form');
          if (replyForm) {
            replyForm.classList.add('hidden');
          }
        }
      }
    });
  }
  
  // Share button
  const shareBtn = postElement.querySelector('.forum-item-share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      sharePost(post);
    });
  }
  
  // Load replies for this post
  loadReplies(post.id);
}

// Submit a new forum post
function submitForumPost() {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to create a post');
    return;
  }
  
  const titleInput = document.getElementById('forum-post-title');
  const categorySelect = document.getElementById('forum-category');
  const contentInput = document.getElementById('forum-post-content');
  
  if (!titleInput || !categorySelect || !contentInput) {
    console.error('Form elements not found');
    return;
  }
  
  const title = titleInput.value.trim();
  const category = categorySelect.value;
  const content = contentInput.value.trim();
  
  if (!title || !content) {
    alert('Please fill in all required fields');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  
  // Create post object
  const post = {
    title,
    category,
    content,
    authorId: user.uid,
    authorName: user.displayName || 'Anonymous',
    authorPhotoURL: user.photoURL || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    replyCount: 0,
    likeCount: 0
  };
  
  // Add post to Firestore
  db.collection('forum_posts').add(post)
    .then(() => {
      // Reset form
      const postForm = document.getElementById('forum-post-form');
      if (postForm) {
        postForm.reset();
        postForm.classList.add('hidden');
      }
      
      // Reload posts
      loadForumPosts(currentCategory);
      
      // Show success message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Post created successfully', 'success');
      } else {
        alert('Post created successfully');
      }
    })
    .catch(error => {
      console.error('Error creating post:', error);
      
      // Show error message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error creating post. Please try again.', 'error');
      } else {
        alert('Error creating post. Please try again.');
      }
    });
}

// Submit a reply to a post
function submitReply(postId, replyText) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to reply');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  
  // Create reply object
  const reply = {
    postId,
    content: replyText,
    authorId: user.uid,
    authorName: user.displayName || 'Anonymous',
    authorPhotoURL: user.photoURL || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    likeCount: 0
  };
  
  // Add reply to Firestore
  db.collection('forum_replies').add(reply)
    .then(() => {
      // Increment reply count for the post
      db.collection('forum_posts').doc(postId).update({
        replyCount: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Reload replies
      loadReplies(postId);
      
      // Show success message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Reply posted successfully', 'success');
      }
    })
    .catch(error => {
      console.error('Error posting reply:', error);
      
      // Show error message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error posting reply. Please try again.', 'error');
      } else {
        alert('Error posting reply. Please try again.');
      }
    });
}

// Load replies for a post
function loadReplies(postId) {
  const repliesContainer = document.querySelector(`.forum-item-replies[data-id="${postId}"]`);
  if (!repliesContainer) return;
  
  // Show loading state
  repliesContainer.innerHTML = '<div class="forum-reply loading">Loading replies...</div>';
  
  // Get replies
  db.collection('forum_replies')
    .where('postId', '==', postId)
    .orderBy('createdAt', 'asc')
    .get()
    .then(snapshot => {
      // Clear loading state
      repliesContainer.innerHTML = '';
      
      if (snapshot.empty) {
        repliesContainer.innerHTML = '<div class="forum-reply empty">No replies yet</div>';
        return;
      }
      
      // Create document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      snapshot.forEach(doc => {
        const replyData = doc.data();
        const reply = {
          id: doc.id,
          ...replyData
        };
        
        // Create reply element
        const replyElement = createReplyElement(reply);
        fragment.appendChild(replyElement);
      });
      
      // Append all replies at once
      repliesContainer.appendChild(fragment);
    })
    .catch(error => {
      console.error('Error loading replies:', error);
      repliesContainer.innerHTML = '<div class="forum-reply error">Error loading replies</div>';
    });
}

// Create reply element
function createReplyElement(reply) {
  const replyElement = document.createElement('div');
  replyElement.className = 'forum-reply';
  replyElement.dataset.id = reply.id;
  
  // Format date
  let dateDisplay = 'Just now';
  if (reply.createdAt) {
    const date = reply.createdAt.toDate ? reply.createdAt.toDate() : new Date(reply.createdAt);
    dateDisplay = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Sanitize user input to prevent XSS
  const content = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(reply.content || '')
    : (reply.content || '');
    
  const author = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(reply.authorName || 'Anonymous')
    : (reply.authorName || 'Anonymous');
  
  // Create reply HTML
  replyElement.innerHTML = `
    <div class="forum-reply-header">
      <span class="forum-reply-author">${author}</span>
      <span class="forum-reply-date">${dateDisplay}</span>
    </div>
    <div class="forum-reply-content">${content}</div>
    <div class="forum-reply-actions">
      <button class="forum-reply-like-btn" data-id="${reply.id}">
        <span class="like-icon">👍</span>
        <span class="like-count">${reply.likeCount || 0}</span>
      </button>
    </div>
  `;
  
  // Set up event listeners for this reply
  setupReplyEventListeners(replyElement, reply);
  
  return replyElement;
}

// Set up event listeners for a reply
function setupReplyEventListeners(replyElement, reply) {
  // Like button
  const likeBtn = replyElement.querySelector('.forum-reply-like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      if (!window.authModule?.isAuthenticated()) {
        alert('Please sign in to like replies');
        return;
      }
      
      likeReply(reply.id);
    });
  }
}

// Like a reply
function likeReply(replyId) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to like replies');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  
  // Check if user has already liked this reply
  db.collection('forum_likes')
    .where('replyId', '==', replyId)
    .where('userId', '==', user.uid)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        // User has already liked this reply, remove the like
        const likeDoc = snapshot.docs[0];
        
        return db.collection('forum_likes').doc(likeDoc.id).delete()
          .then(() => {
            // Decrement like count
            return db.collection('forum_replies').doc(replyId).update({
              likeCount: firebase.firestore.FieldValue.increment(-1)
            });
          });
      } else {
        // User has not liked this reply yet, add a like
        return db.collection('forum_likes').add({
          replyId,
          userId: user.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
          .then(() => {
            // Increment like count
            return db.collection('forum_replies').doc(replyId).update({
              likeCount: firebase.firestore.FieldValue.increment(1)
            });
          });
      }
    })
    .then(() => {
      // Update like count in UI
      const likeCountElement = document.querySelector(`.forum-reply-like-btn[data-id="${replyId}"] .like-count`);
      if (likeCountElement) {
        const currentCount = parseInt(likeCountElement.textContent);
        likeCountElement.textContent = isNaN(currentCount) ? 1 : currentCount + 1;
      }
    })
    .catch(error => {
      console.error('Error liking reply:', error);
    });
}

// Search forum posts
function searchForumPosts(searchTerm) {
  if (isLoading) return;
  isLoading = true;
  
  const forumList = document.getElementById('forum-list');
  if (!forumList) return;
  
  // Show loading state
  forumList.innerHTML = '<li class="forum-item loading">Searching posts...</li>';
  
  // Perform search (client-side for simplicity)
  // In a real app, you would use a server-side search or Firestore queries
  
  // Get all posts first
  db.collection('forum_posts')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      // Clear loading state
      forumList.innerHTML = '';
      
      if (snapshot.empty) {
        forumList.innerHTML = '<li class="forum-item empty">No posts found</li>';
        return;
      }
      
      // Filter posts by search term
      const filteredPosts = [];
      
      snapshot.forEach(doc => {
        const postData = doc.data();
        const post = {
          id: doc.id,
          ...postData
        };
        
        // Check if post matches search term
        const title = post.title || '';
        const content = post.content || '';
        const author = post.authorName || '';
        
        if (
          title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          author.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          filteredPosts.push(post);
        }
      });
      
      // Store filtered posts in memory
      posts = filteredPosts;
      
      if (filteredPosts.length === 0) {
        forumList.innerHTML = '<li class="forum-item empty">No posts found matching your search</li>';
        return;
      }
      
      // Create document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      filteredPosts.forEach(post => {
        // Create post element
        const postElement = createPostElement(post);
        fragment.appendChild(postElement);
      });
      
      // Append all posts at once
      forumList.appendChild(fragment);
    })
    .catch(error => {
      console.error('Error searching forum posts:', error);
      forumList.innerHTML = '<li class="forum-item error">Error searching posts. Please try again.</li>';
    })
    .finally(() => {
      isLoading = false;
    });
}

// Share a post
function sharePost(post) {
  // Create share URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?view=forum&post=${post.id}`;
  
  // Check if Web Share API is available
  if (navigator.share) {
    navigator.share({
      title: post.title,
      text: `Check out this post on Urbindex: ${post.title}`,
      url: shareUrl
    })
      .then(() => console.log('Post shared successfully'))
      .catch(error => console.error('Error sharing post:', error));
  } else {
    // Fallback to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // Show success message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Link copied to clipboard', 'success');
        } else {
          alert('Link copied to clipboard');
        }
      })
      .catch(error => {
        console.error('Error copying link:', error);
        
        // Show error message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Error copying link. Please try again.', 'error');
        } else {
          alert('Error copying link. Please try again.');
        }
      });
  }
}

// Get category label
function getCategoryLabel(category) {
  switch (category) {
    case 'general':
      return 'General';
    case 'locations':
      return 'Locations';
    case 'tips':
      return 'Tips & Tricks';
    case 'events':
      return 'Events';
    case 'crews':
      return 'Crews';
    case 'help':
      return 'Help & Support';
    case 'bugs':
      return 'Bugs & Issues';
    case 'suggestions':
      return 'Suggestions';
    case 'other':
      return 'Other';
    default:
      return category || 'Unknown';
  }
}

// Export functions for use in other modules
window.forumModule = {
  initForum,
  loadForumPosts,
  searchForumPosts
};
