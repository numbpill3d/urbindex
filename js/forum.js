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
