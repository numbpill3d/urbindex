// Urbindex - Forum Module

// DOM Elements
let forumContainer;
let forumList;
let forumPostForm;
let forumPostTitle;
let forumPostContent;
let forumCategorySelect;
let forumSearchInput;
let forumSearchBtn;

// Initialize forum
function initForum() {
  // Get DOM elements
  forumContainer = document.getElementById('forum-container');
  forumList = document.getElementById('forum-list');
  forumPostForm = document.getElementById('forum-post-form');
  forumPostTitle = document.getElementById('forum-post-title');
  forumPostContent = document.getElementById('forum-post-content');
  forumCategorySelect = document.getElementById('forum-category');
  forumSearchInput = document.getElementById('forum-search');
  forumSearchBtn = document.getElementById('forum-search-btn');
  
  if (!forumContainer || !forumList) {
    console.error('Forum container or list not found');
    return;
  }
  
  // Set up event listeners
  if (forumPostForm) {
    forumPostForm.addEventListener('submit', createForumPost);
  }
  
  if (forumSearchBtn && forumSearchInput) {
    forumSearchBtn.addEventListener('click', () => {
      const searchTerm = forumSearchInput.value.trim();
      if (searchTerm) {
        searchForumPosts(searchTerm);
      }
    });
  }
  
  // Load forum posts
  loadForumPosts();
  
  console.log('Forum module initialized');
}

// Load forum posts from Firestore
function loadForumPosts(category = null) {
  if (!forumList) return;
  
  // Show loading state
  forumList.innerHTML = '<li class="forum-item loading">Loading forum posts...</li>';
  
  // Create query
  let query = db.collection('forum')
    .orderBy('createdAt', 'desc')
    .limit(20);
  
  // Filter by category if provided
  if (category && category !== 'all') {
    query = query.where('category', '==', category);
  }
  
  // Execute query
  query.get()
    .then(snapshot => {
      // Clear loading state
      forumList.innerHTML = '';
      
      if (snapshot.empty) {
        forumList.innerHTML = '<li class="forum-item empty">No forum posts yet. Be the first to post!</li>';
        return;
      }
      
      // Create document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      snapshot.forEach(doc => {
        const post = doc.data();
        const postElement = createForumPostElement(doc.id, post);
        fragment.appendChild(postElement);
      });
      
      // Append all posts at once
      forumList.appendChild(fragment);
    })
    .catch(error => {
      console.error('Error loading forum posts:', error);
      forumList.innerHTML = '<li class="forum-item error">Error loading forum posts. Please try again.</li>';
    });
}

// Create forum post element
function createForumPostElement(id, post) {
  const postElement = document.createElement('li');
  postElement.className = 'forum-item';
  postElement.dataset.id = id;
  
  // Format date
  let dateDisplay = 'Just now';
  if (post.createdAt) {
    dateDisplay = window.utilsModule?.formatDate?.(post.createdAt, true) || 'Recent';
  }
  
  // Sanitize user input to prevent XSS
  const title = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(post.title || 'Untitled Post')
    : (post.title || 'Untitled Post');
    
  const content = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(post.content || '')
    : (post.content || '');
    
  const authorName = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(post.authorName || 'Anonymous')
    : (post.authorName || 'Anonymous');
  
  // Get category label
  const categoryLabel = getCategoryLabel(post.category);
  
  // Create HTML structure
  postElement.innerHTML = `
    <div class="forum-item-header">
      <h3 class="forum-item-title">${title}</h3>
      <span class="forum-item-category">${categoryLabel}</span>
    </div>
    <div class="forum-item-content">${content}</div>
    <div class="forum-item-meta">
      <div class="forum-item-author">
        <img src="${post.authorPhotoURL || 'images/default-avatar.png'}" alt="Author avatar" class="forum-author-avatar">
        <span class="forum-author-name">${authorName}</span>
      </div>
      <div class="forum-item-stats">
        <span class="forum-item-date">${dateDisplay}</span>
        <span class="forum-item-comments">${post.commentCount || 0} comments</span>
        <span class="forum-item-likes">${post.likeCount || 0} likes</span>
      </div>
    </div>
    <div class="forum-item-actions">
      <button class="forum-action-btn like-btn" data-id="${id}">
        <span class="action-icon">👍</span> Like
      </button>
      <button class="forum-action-btn comment-btn" data-id="${id}">
        <span class="action-icon">💬</span> Comment
      </button>
      <button class="forum-action-btn share-btn" data-id="${id}">
        <span class="action-icon">🔗</span> Share
      </button>
    </div>
    <div class="forum-comments-container" data-id="${id}"></div>
  `;
  
  // Add event listeners
  const likeBtn = postElement.querySelector('.like-btn');
  const commentBtn = postElement.querySelector('.comment-btn');
  const shareBtn = postElement.querySelector('.share-btn');
  
  if (likeBtn) {
    likeBtn.addEventListener('click', () => likeForumPost(id));
  }
  
  if (commentBtn) {
    commentBtn.addEventListener('click', () => toggleComments(id));
  }
  
  if (shareBtn) {
    shareBtn.addEventListener('click', () => shareForumPost(id, title));
  }
  
  return postElement;
}

// Create a new forum post
function createForumPost(event) {
  event.preventDefault();
  
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to create a post');
    return;
  }
  
  const title = forumPostTitle.value.trim();
  const content = forumPostContent.value.trim();
  const category = forumCategorySelect.value;
  
  if (!title || !content) {
    alert('Please enter a title and content for your post');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  
  // Create post object
  const post = {
    title: title,
    content: content,
    category: category,
    authorId: user.uid,
    authorName: user.displayName || 'Anonymous',
    authorPhotoURL: user.photoURL || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    commentCount: 0,
    likeCount: 0
  };
  
  // Add post to Firestore
  db.collection('forum').add(post)
    .then(docRef => {
      console.log('Forum post created with ID:', docRef.id);
      
      // Reset form
      forumPostTitle.value = '';
      forumPostContent.value = '';
      
      // Reload posts
      loadForumPosts();
      
      // Show success message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Post created successfully!', 'success');
      } else {
        alert('Post created successfully!');
      }
    })
    .catch(error => {
      console.error('Error creating forum post:', error);
      
      // Show error message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error creating post. Please try again.', 'error');
      } else {
        alert('Error creating post. Please try again.');
      }
    });
}

// Like a forum post
function likeForumPost(postId) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to like posts');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  const likeRef = db.collection('forum_likes').doc(`${postId}_${user.uid}`);
  
  // Check if user already liked this post
  likeRef.get()
    .then(doc => {
      const batch = db.batch();
      
      if (doc.exists) {
        // User already liked this post, so unlike it
        batch.delete(likeRef);
        
        // Decrement like count
        const postRef = db.collection('forum').doc(postId);
        batch.update(postRef, {
          likeCount: firebase.firestore.FieldValue.increment(-1)
        });
      } else {
        // User hasn't liked this post yet, so like it
        batch.set(likeRef, {
          userId: user.uid,
          postId: postId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Increment like count
        const postRef = db.collection('forum').doc(postId);
        batch.update(postRef, {
          likeCount: firebase.firestore.FieldValue.increment(1)
        });
      }
      
      // Commit the batch
      return batch.commit();
    })
    .then(() => {
      // Reload posts to update UI
      loadForumPosts();
    })
    .catch(error => {
      console.error('Error liking forum post:', error);
    });
}

// Toggle comments section
function toggleComments(postId) {
  const commentsContainer = document.querySelector(`.forum-comments-container[data-id="${postId}"]`);
  
  if (!commentsContainer) return;
  
  // Check if comments are already loaded
  if (commentsContainer.classList.contains('active')) {
    // Hide comments
    commentsContainer.classList.remove('active');
    commentsContainer.innerHTML = '';
  } else {
    // Show comments
    commentsContainer.classList.add('active');
    loadComments(postId, commentsContainer);
  }
}

// Load comments for a post
function loadComments(postId, container) {
  // Show loading state
  container.innerHTML = '<div class="forum-comments-loading">Loading comments...</div>';
  
  // Get comments from Firestore
  db.collection('forum_comments')
    .where('postId', '==', postId)
    .orderBy('createdAt', 'asc')
    .get()
    .then(snapshot => {
      // Create HTML for comments
      let commentsHTML = '';
      
      if (snapshot.empty) {
        commentsHTML = '<div class="forum-no-comments">No comments yet. Be the first to comment!</div>';
      } else {
        commentsHTML = '<div class="forum-comments-list">';
        
        snapshot.forEach(doc => {
          const comment = doc.data();
          
          // Format date
          let dateDisplay = 'Just now';
          if (comment.createdAt) {
            dateDisplay = window.utilsModule?.formatDate?.(comment.createdAt, true) || 'Recent';
          }
          
          // Sanitize user input
          const content = typeof window.utilsModule?.sanitizeHtml === 'function'
            ? window.utilsModule.sanitizeHtml(comment.content || '')
            : (comment.content || '');
            
          const authorName = typeof window.utilsModule?.sanitizeHtml === 'function'
            ? window.utilsModule.sanitizeHtml(comment.authorName || 'Anonymous')
            : (comment.authorName || 'Anonymous');
          
          commentsHTML += `
            <div class="forum-comment" data-id="${doc.id}">
              <div class="forum-comment-author">
                <img src="${comment.authorPhotoURL || 'images/default-avatar.png'}" alt="Author avatar" class="forum-comment-avatar">
                <span class="forum-comment-name">${authorName}</span>
                <span class="forum-comment-date">${dateDisplay}</span>
              </div>
              <div class="forum-comment-content">${content}</div>
            </div>
          `;
        });
        
        commentsHTML += '</div>';
      }
      
      // Add comment form
      commentsHTML += `
        <div class="forum-comment-form">
          <textarea class="forum-comment-input" placeholder="Write a comment..."></textarea>
          <button class="forum-comment-submit neon-button" data-id="${postId}">Post Comment</button>
        </div>
      `;
      
      // Update container
      container.innerHTML = commentsHTML;
      
      // Add event listener to comment form
      const submitBtn = container.querySelector('.forum-comment-submit');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => {
          const input = container.querySelector('.forum-comment-input');
          if (input && input.value.trim()) {
            addComment(postId, input.value.trim(), container);
          }
        });
      }
    })
    .catch(error => {
      console.error('Error loading comments:', error);
      container.innerHTML = '<div class="forum-comments-error">Error loading comments. Please try again.</div>';
    });
}

// Add a comment to a post
function addComment(postId, content, container) {
  if (!window.authModule?.isAuthenticated()) {
    alert('Please sign in to comment');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  
  // Create comment object
  const comment = {
    postId: postId,
    content: content,
    authorId: user.uid,
    authorName: user.displayName || 'Anonymous',
    authorPhotoURL: user.photoURL || null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Add comment to Firestore
  db.collection('forum_comments').add(comment)
    .then(() => {
      // Increment comment count on post
      return db.collection('forum').doc(postId).update({
        commentCount: firebase.firestore.FieldValue.increment(1)
      });
    })
    .then(() => {
      // Reload comments
      loadComments(postId, container);
    })
    .catch(error => {
      console.error('Error adding comment:', error);
      
      // Show error message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error adding comment. Please try again.', 'error');
      } else {
        alert('Error adding comment. Please try again.');
      }
    });
}

// Share a forum post
function shareForumPost(postId, title) {
  // Create share URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?view=forum&post=${postId}`;
  
  // Check if Web Share API is available
  if (navigator.share) {
    navigator.share({
      title: title,
      text: 'Check out this post on Urbindex',
      url: shareUrl
    })
    .catch(error => {
      console.error('Error sharing:', error);
    });
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Link copied to clipboard!', 'success');
        } else {
          alert('Link copied to clipboard!');
        }
      })
      .catch(error => {
        console.error('Error copying to clipboard:', error);
        
        // Manual fallback
        prompt('Copy this link to share the post:', shareUrl);
      });
  }
}

// Search forum posts
function searchForumPosts(searchTerm) {
  if (!forumList) return;
  
  // Show loading state
  forumList.innerHTML = '<li class="forum-item loading">Searching forum posts...</li>';
  
  // This is a simple client-side search
  // For a real app, you would use Firestore queries or a search service like Algolia
  db.collection('forum')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      // Clear loading state
      forumList.innerHTML = '';
      
      if (snapshot.empty) {
        forumList.innerHTML = '<li class="forum-item empty">No forum posts found.</li>';
        return;
      }
      
      // Filter posts that match the search term
      const searchTermLower = searchTerm.toLowerCase();
      const matchingPosts = [];
      
      snapshot.forEach(doc => {
        const post = doc.data();
        
        // Check if title or content contains the search term
        if (
          post.title.toLowerCase().includes(searchTermLower) ||
          post.content.toLowerCase().includes(searchTermLower)
        ) {
          matchingPosts.push({ id: doc.id, ...post });
        }
      });
      
      // Display matching posts
      if (matchingPosts.length === 0) {
        forumList.innerHTML = `<li class="forum-item empty">No posts found matching "${searchTerm}".</li>`;
        return;
      }
      
      // Create document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      matchingPosts.forEach(post => {
        const postElement = createForumPostElement(post.id, post);
        fragment.appendChild(postElement);
      });
      
      // Append all posts at once
      forumList.appendChild(fragment);
    })
    .catch(error => {
      console.error('Error searching forum posts:', error);
      forumList.innerHTML = '<li class="forum-item error">Error searching forum posts. Please try again.</li>';
    });
}

// Get category label
function getCategoryLabel(category) {
  const categories = {
    'general': 'General',
    'locations': 'Locations',
    'tips': 'Tips & Tricks',
    'events': 'Events',
    'crews': 'Crews',
    'help': 'Help & Support',
    'bugs': 'Bugs & Issues',
    'suggestions': 'Suggestions',
    'other': 'Other'
  };
  
  return categories[category] || 'Unknown';
}

// Export functions for use in other modules
window.forumModule = {
  initForum,
  loadForumPosts
};
