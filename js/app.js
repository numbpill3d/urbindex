// Urbindex - Main Application Module

// DOM Elements
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app');
const navButtons = document.querySelectorAll('.nav-btn');
const viewContainers = document.querySelectorAll('.view');
const modalCloseButtons = document.querySelectorAll('.close-modal');

// App state
let isInitialized = false;

// Initialize the application
function initApp() {
  // Show splash screen
  showSplashScreen();
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize modules
  initializeModules()
    .then(() => {
      // Hide splash screen and show app
      setTimeout(() => {
        hideSplashScreen();
        isInitialized = true;
      }, 2000); // Minimum 2 seconds to show splash screen
    })
    .catch(error => {
      console.error('Error initializing app:', error);
      showInitializationError();
    });
  
  // Check for "Add to Home Screen" eligibility on iOS
  checkAddToHomeScreen();
}

// Show splash screen
function showSplashScreen() {
  splashScreen.classList.add('active');
  appContainer.classList.add('hidden');
}

// Hide splash screen
function hideSplashScreen() {
  splashScreen.classList.remove('active');
  appContainer.classList.remove('hidden');
  
  // Trigger animation for app container
  setTimeout(() => {
    appContainer.classList.add('fade-in');
  }, 100);
}

// Set up event listeners
function setupEventListeners() {
  // Navigation buttons
  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetView = button.id.replace('-btn', '-container');
      switchView(targetView);
      
      // Update active button
      navButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
    });
  });
  
  // Modal close buttons
  modalCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal');
      if (modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  // Close modal when clicking outside content
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  // Handle back button on mobile
  window.addEventListener('popstate', handleBackButton);
  
  // Set up forum-specific event listeners
  setupForumEventListeners();
  
  // Set up avatar upload event listener
  setupAvatarUpload();
}

// Set up forum-specific event listeners
function setupForumEventListeners() {
  const newPostBtn = document.getElementById('new-post-btn');
  const cancelPostBtn = document.getElementById('cancel-post-btn');
  const forumPostForm = document.getElementById('forum-post-form');
  const forumCategories = document.querySelectorAll('.forum-category');
  
  if (newPostBtn) {
    newPostBtn.addEventListener('click', () => {
      if (!window.authModule?.isAuthenticated()) {
        alert('Please sign in to create a post');
        return;
      }
      
      if (forumPostForm) {
        forumPostForm.classList.remove('hidden');
      }
    });
  }
  
  if (cancelPostBtn) {
    cancelPostBtn.addEventListener('click', () => {
      if (forumPostForm) {
        forumPostForm.classList.add('hidden');
        forumPostForm.reset();
      }
    });
  }
  
  if (forumCategories) {
    forumCategories.forEach(category => {
      category.addEventListener('click', () => {
        // Remove active class from all categories
        forumCategories.forEach(cat => cat.classList.remove('active'));
        
        // Add active class to clicked category
        category.classList.add('active');
        
        // Load forum posts for this category
        const categoryValue = category.dataset.category;
        if (window.forumModule?.loadForumPosts) {
          window.forumModule.loadForumPosts(categoryValue);
        }
      });
    });
  }
}

// Set up avatar upload event listener
function setupAvatarUpload() {
  const avatarUpload = document.getElementById('avatar-upload');
  if (avatarUpload) {
    avatarUpload.addEventListener('change', (e) => {
      if (!window.authModule?.isAuthenticated()) {
        alert('Please sign in to change your avatar');
        return;
      }
      
      const file = e.target.files[0];
      if (!file) return;
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
      }
      
      // Upload to Firebase Storage
      const user = window.authModule.getCurrentUser();
      const storageRef = firebase.storage().ref();
      const avatarRef = storageRef.child(`avatars/${user.uid}`);
      
      // Show loading state
      const profileAvatar = document.getElementById('profile-avatar');
      const userAvatar = document.getElementById('user-avatar');
      if (profileAvatar) {
        profileAvatar.style.opacity = '0.5';
      }
      
      // Upload file
      avatarRef.put(file).then(snapshot => {
        return snapshot.ref.getDownloadURL();
      }).then(downloadURL => {
        // Update user profile
        return user.updateProfile({
          photoURL: downloadURL
        }).then(() => {
          // Update Firestore user document
          return db.collection('users').doc(user.uid).update({
            photoURL: downloadURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
      }).then(() => {
        // Update UI
        if (profileAvatar) {
          profileAvatar.src = user.photoURL;
          profileAvatar.style.opacity = '1';
        }
        if (userAvatar) {
          userAvatar.src = user.photoURL;
        }
        
        // Show success message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Avatar updated successfully', 'success');
        } else {
          alert('Avatar updated successfully');
        }
      }).catch(error => {
        console.error('Error uploading avatar:', error);
        
        // Reset opacity
        if (profileAvatar) {
          profileAvatar.style.opacity = '1';
        }
        
        // Show error message
        if (window.offlineModule?.showToast) {
          window.offlineModule.showToast('Error updating avatar. Please try again.', 'error');
        } else {
          alert('Error updating avatar. Please try again.');
        }
      });
    });
  }
}

// Switch between views
function switchView(targetViewId) {
  // Hide all views - both static and dynamically created
  document.querySelectorAll('.view').forEach(container => {
    container.classList.remove('active');
  });
  
  // Show target view
  const targetView = document.getElementById(targetViewId);
  if (targetView) {
    targetView.classList.add('active');
    
    // Special handling for map view to ensure map is properly initialized
    if (targetViewId === 'map-container' && window.mapModule?.map) {
      // Force a resize event to make sure the map renders correctly
      setTimeout(() => {
        if (window.mapModule.map()) {
          window.mapModule.map().invalidateSize();
        }
      }, 100);
    }
    
    // Update history state for back button handling
    const viewName = targetViewId.replace('-container', '');
    history.pushState({ view: viewName }, '', `?view=${viewName}`);
  } else {
    // If target view doesn't exist, default to map view
    const mapView = document.getElementById('map-container');
    if (mapView) {
      mapView.classList.add('active');
      history.pushState({ view: 'map' }, '', `?view=map`);
      
      // Force a resize event to make sure the map renders correctly
      setTimeout(() => {
        if (window.mapModule?.map && window.mapModule.map()) {
          window.mapModule.map().invalidateSize();
        }
      }, 100);
    }
  }
}

// Handle back button
function handleBackButton(event) {
  // If we have state, use it to determine which view to show
  if (event.state && event.state.view) {
    const targetViewId = `${event.state.view}-container`;
    
    // Update active button
    navButtons.forEach(btn => {
      btn.classList.toggle('active', btn.id === `${event.state.view}-btn`);
    });
    
    // Switch to the view
    switchView(targetViewId);
  } else {
    // Default to map view
    document.getElementById('map-view-btn').click();
  }
}

// Initialize all modules
function initializeModules() {
  return new Promise(async (resolve, reject) => {
    try {
      // Define modules to initialize with proper error handling for undefined modules
      const modules = [
        { name: 'auth', init: window.authModule?.initAuth },
        { name: 'map', init: window.mapModule?.initMap },
        { name: 'locations', init: window.locationsModule?.initLocations },
        { name: 'spots', init: window.spotsModule?.initSpots },
        { name: 'forum', init: window.forumModule?.initForum },
        { name: 'territories', init: window.territoriesModule?.initTerritories },
        { name: 'comments', init: window.commentsModule?.initComments },
        { name: 'ratings', init: window.ratingsModule?.initRatings },
        { name: 'geocaching', init: window.geocachingModule?.initGeocaching },
        { name: 'achievements', init: window.achievementsModule?.initAchievements },
        { name: 'challenges', init: window.challengesModule?.initChallenges },
        { name: 'profile', init: window.profileModule?.initProfile },
        { name: 'search', init: window.searchModule?.initSearch },
        { name: 'media', init: window.mediaModule?.initMedia },
        { name: 'notifications', init: window.notificationsModule?.initNotifications },
        { name: 'social', init: window.socialModule?.initSocial },
        { name: 'offline', init: window.offlineModule?.initOffline }
      ];

      // Add auth state change listener to add placeholder forum posts when user is authenticated
      if (window.authModule) {
        firebase.auth().onAuthStateChanged(user => {
          if (user && window.forumInitModule?.addPlaceholderPosts) {
            // Add placeholder forum posts if user is authenticated
            window.forumInitModule.addPlaceholderPosts()
              .then(() => console.log('Placeholder forum posts initialized'))
              .catch(error => console.warn('Error initializing placeholder forum posts:', error));
          }
        });
      }
      
      // Initialize modules sequentially with better error handling
      for (const module of modules) {
        if (typeof module.init === 'function') {
          try {
            console.log(`Initializing ${module.name} module...`);
            await Promise.resolve(module.init());
            console.log(`${module.name} module initialized successfully`);
          } catch (moduleError) {
            console.error(`Error initializing ${module.name} module:`, moduleError);
            // Log detailed error information for debugging
            if (moduleError.stack) {
              console.error(`Stack trace: ${moduleError.stack}`);
            }
            // Continue with other modules even if one fails
          }
        } else if (module.init !== undefined) {
          console.warn(`Module ${module.name} has an invalid initializer`);
        } else {
          console.warn(`Module ${module.name} is not available`);
        }
      }
      
      // Initialize UI features that don't require authentication
      initUIFeatures();
      
      // Check URL parameters for initial view
      checkUrlParameters();
      
      resolve();
    } catch (error) {
      console.error('Error initializing modules:', error);
      reject(error);
    }
  });
}

// Check URL parameters for initial view
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  
  if (viewParam) {
    const targetButton = document.getElementById(`${viewParam}-btn`);
    if (targetButton) {
      targetButton.click();
    } else {
      // If the view parameter doesn't match any button, default to map view
      document.getElementById('map-view-btn').click();
    }
  } else {
    // If no view parameter, ensure map view is active
    document.getElementById('map-view-btn').click();
  }
  
  // Handle share parameters
  if (urlParams.has('share')) {
    const title = urlParams.get('title');
    const text = urlParams.get('text');
    const url = urlParams.get('url');
    
    handleSharedContent(title, text, url);
  }
  
  // Handle forum post parameter
  if (viewParam === 'forum' && urlParams.has('post')) {
    const postId = urlParams.get('post');
    if (postId && window.forumModule) {
      // Load the specific post
      setTimeout(() => {
        const postElement = document.querySelector(`.forum-item[data-id="${postId}"]`);
        if (postElement) {
          postElement.scrollIntoView({ behavior: 'smooth' });
          postElement.classList.add('highlighted');
          
          // Remove highlight after a few seconds
          setTimeout(() => {
            postElement.classList.remove('highlighted');
          }, 3000);
        }
      }, 1000); // Give time for forum posts to load
    }
  }
}

// Handle shared content
function handleSharedContent(title, text, url) {
  // This would process content shared to the app
  console.log('Shared content:', { title, text, url });
  
  // For example, if the URL is a location, we could parse it and show that location
  if (url && url.includes('location=')) {
    const locationId = url.split('location=')[1].split('&')[0];
    if (locationId) {
      // Show map view
      document.getElementById('map-view-btn').click();
      
      // Find and show the location
      // This would depend on your implementation
    }
  }
}

// Show initialization error
function showInitializationError() {
  splashScreen.innerHTML = `
    <div class="splash-content error">
      <h1 class="neon-text">URBINDEX</h1>
      <p class="error-message">Failed to initialize the app.</p>
      <button id="retry-init" class="neon-button">Retry</button>
    </div>
  `;
  
  document.getElementById('retry-init').addEventListener('click', () => {
    window.location.reload();
  });
}

// Check for "Add to Home Screen" eligibility on iOS
function checkAddToHomeScreen() {
  // Check if the app is running in standalone mode (already installed)
  const isStandalone = window.navigator.standalone === true;
  
  // Check if it's iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS && !isStandalone) {
    // Show "Add to Home Screen" prompt after a delay
    setTimeout(() => {
      showAddToHomeScreenPrompt();
    }, 30000); // 30 seconds delay
  }
}

// Initialize UI features that don't require authentication
function initUIFeatures() {
  // Initialize particle effects for ASCII title
  initParticleEffects();
  
  // Initialize chat UI (even if not logged in)
  initChatUI();
  
  // Initialize activity feed
  initActivityFeed();
  
  // Initialize online users marquee
  initOnlineUsersMarquee();
  
  // Initialize crew UI elements
  initCrewUI();
}

// Initialize particle effects for ASCII title with memory leak prevention
function initParticleEffects() {
  const titleContainer = document.querySelector('.ascii-title-container');
  if (!titleContainer) return;
  
  // Store interval ID for cleanup
  const particleInterval = setInterval(() => {
    // Limit the number of particles to prevent performance issues
    const existingParticles = titleContainer.querySelectorAll('.particle');
    if (existingParticles.length > 50) {
      // Remove oldest particle if we have too many
      if (existingParticles[0] && titleContainer.contains(existingParticles[0])) {
        titleContainer.removeChild(existingParticles[0]);
      }
    }
    
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    const x = Math.random() * titleContainer.offsetWidth;
    const y = Math.random() * titleContainer.offsetHeight;
    const size = Math.random() * 5 + 2;
    const colors = ['#05d9e8', '#ff2a6d', '#39ff14', '#9d4edd'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    
    titleContainer.appendChild(particle);
    
    // Set a timeout to remove this particle
    setTimeout(() => {
      if (titleContainer.contains(particle)) {
        titleContainer.removeChild(particle);
      }
    }, 1500);
  }, 300);
  
  // Store the interval ID on the window object for potential cleanup
  window.particleEffectsInterval = particleInterval;
  
  // Add event listener to clean up when navigating away
  window.addEventListener('beforeunload', () => {
    if (window.particleEffectsInterval) {
      clearInterval(window.particleEffectsInterval);
    }
  });
}

// Initialize chat UI
function initChatUI() {
  const chatInput = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send-btn');
  
  if (!chatInput || !chatSendBtn) return;
  
  chatSendBtn.addEventListener('click', () => {
    if (!authModule.isAuthenticated()) {
      alert('Please sign in to send messages');
      return;
    }
    
    const message = chatInput.value.trim();
    if (message) {
      sendChatMessage(message);
      chatInput.value = '';
    }
  });
  
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (!authModule.isAuthenticated()) {
        alert('Please sign in to send messages');
        return;
      }
      
      const message = chatInput.value.trim();
      if (message) {
        sendChatMessage(message);
        chatInput.value = '';
      }
    }
  });
  
  // Listen for chat messages
  listenForChatMessages();
}

// Send chat message with improved error handling and sanitization
function sendChatMessage(message) {
  if (!message || !window.authModule?.isAuthenticated()) {
    console.warn('Cannot send message: empty message or user not authenticated');
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  if (!user) {
    console.error('Cannot send message: user object is null');
    return;
  }
  
  // Sanitize message to prevent XSS attacks
  const sanitizedMessage = typeof window.utilsModule?.sanitizeHtml === 'function' 
    ? window.utilsModule.sanitizeHtml(message)
    : message;
  
  db.collection('chat').add({
    text: sanitizedMessage,
    userId: user.uid,
    userName: user.displayName || 'Anonymous',
    userPhotoURL: user.photoURL || null,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    console.log('Message sent successfully');
  })
  .catch(error => {
    console.error('Error sending message:', error);
    // Show error to user
    if (typeof window.offlineModule?.showToast === 'function') {
      window.offlineModule.showToast('Failed to send message. Please try again.', 'error');
    }
  });
}

// Listen for new chat messages with improved error handling and performance
function listenForChatMessages() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  // Store the unsubscribe function for cleanup
  let unsubscribe;
  
  try {
    unsubscribe = db.collection('chat')
      .orderBy('timestamp', 'desc')
      .limit(20)
      .onSnapshot(snapshot => {
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        const messages = [];
        snapshot.forEach(doc => {
          messages.push({ id: doc.id, ...doc.data() });
        });
        
        // Clear existing messages
        chatMessages.innerHTML = '';
        
        messages.reverse().forEach(message => {
          const messageEl = document.createElement('div');
          messageEl.className = 'chat-message';
          
          let timeString = 'Just now';
          if (message.timestamp && message.timestamp.toDate) {
            const date = message.timestamp.toDate();
            timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          
          // Sanitize user input to prevent XSS
          const userName = typeof window.utilsModule?.sanitizeHtml === 'function' 
            ? window.utilsModule.sanitizeHtml(message.userName || 'Anonymous')
            : (message.userName || 'Anonymous');
            
          const messageText = typeof window.utilsModule?.sanitizeHtml === 'function'
            ? window.utilsModule.sanitizeHtml(message.text || '')
            : (message.text || '');
          
          messageEl.innerHTML = `
            <span class="chat-user">${userName}:</span>
            <span class="chat-text">${messageText}</span>
            <span class="chat-time">${timeString}</span>
          `;
          
          fragment.appendChild(messageEl);
        });
        
        // Append all messages at once for better performance
        chatMessages.appendChild(fragment);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, error => {
        console.error('Error listening for chat messages:', error);
      });
      
    // Store unsubscribe function for cleanup
    window.chatUnsubscribe = unsubscribe;
    
    // Add event listener to clean up when navigating away
    window.addEventListener('beforeunload', () => {
      if (window.chatUnsubscribe) {
        window.chatUnsubscribe();
      }
    });
  } catch (error) {
    console.error('Error setting up chat listener:', error);
  }
}

// Initialize activity feed with improved error handling and performance
function initActivityFeed() {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  // Store the unsubscribe function for cleanup
  let unsubscribe;
  
  try {
    unsubscribe = db.collection('locations')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .onSnapshot(snapshot => {
        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Clear existing items
        feedList.innerHTML = '';
        
        if (snapshot.empty) {
          const emptyItem = document.createElement('li');
          emptyItem.className = 'feed-item';
          emptyItem.textContent = 'No recent activity';
          fragment.appendChild(emptyItem);
        } else {
          snapshot.forEach(doc => {
            const locationData = doc.data();
            const feedItem = createActivityFeedItem(doc.id, locationData);
            if (feedItem) {
              fragment.appendChild(feedItem);
            }
          });
        }
        
        // Append all items at once for better performance
        feedList.appendChild(fragment);
      }, error => {
        console.error('Error listening for activity feed:', error);
        feedList.innerHTML = '<li class="feed-item error">Error loading activity feed</li>';
      });
      
    // Store unsubscribe function for cleanup
    window.activityFeedUnsubscribe = unsubscribe;
    
    // Add event listener to clean up when navigating away
    window.addEventListener('beforeunload', () => {
      if (window.activityFeedUnsubscribe) {
        window.activityFeedUnsubscribe();
      }
    });
  } catch (error) {
    console.error('Error setting up activity feed:', error);
    feedList.innerHTML = '<li class="feed-item error">Error loading activity feed</li>';
  }
}

// Create activity feed item (separated from add function for better organization)
function createActivityFeedItem(id, locationData) {
  if (!locationData) return null;
  
  const feedItem = document.createElement('li');
  feedItem.className = 'feed-item';
  
  let dateDisplay = 'Just now';
  if (locationData.createdAt) {
    dateDisplay = window.utilsModule?.formatDate?.(locationData.createdAt, true) || 'Recent';
  }
  
  const riskLevel = locationData.riskLevel || 'unknown';
  const riskLabel = window.utilsModule?.getRiskLabel?.(riskLevel) || riskLevel;
  const riskIndicator = `<span class="risk-indicator risk-${riskLevel}">${riskLabel}</span>`;
  
  // Sanitize user input to prevent XSS
  const name = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(locationData.name || 'Unnamed Location')
    : (locationData.name || 'Unnamed Location');
    
  const description = typeof window.utilsModule?.sanitizeHtml === 'function'
    ? window.utilsModule.sanitizeHtml(locationData.description || 'No description')
    : (locationData.description || 'No description');
  
  feedItem.innerHTML = `
    <div class="feed-item-header">
      <h4>${name}</h4>
      ${riskIndicator}
    </div>
    <p class="feed-item-description">${description}</p>
    <div class="feed-item-meta">
      <span class="feed-item-date">${dateDisplay}</span>
      <button class="view-on-map-btn" data-id="${id}">View</button>
    </div>
  `;
  
  const viewBtn = feedItem.querySelector('.view-on-map-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      if (window.mapModule?.map && locationData.coordinates) {
        const lat = locationData.coordinates.latitude;
        const lng = locationData.coordinates.longitude;
        
        // Switch to map view
        document.getElementById('map-view-btn').click();
        
        // Set map view and open popup
        setTimeout(() => {
          if (window.mapModule.map()) {
            window.mapModule.map().setView([lat, lng], 16);
            
            if (window.locationMarkers && window.locationMarkers[id]) {
              window.locationMarkers[id].openPopup();
            }
          }
        }, 100);
      }
    });
  }
  
  return feedItem;
}

// Add activity feed item (now just appends the created item)
function addActivityFeedItem(id, locationData) {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  const feedItem = createActivityFeedItem(id, locationData);
  if (feedItem) {
    feedList.appendChild(feedItem);
  }
}

// Initialize online users marquee
function initOnlineUsersMarquee() {
  const onlineUsersList = document.getElementById('online-users-list');
  if (!onlineUsersList) return;
  
  // Set initial text
  onlineUsersList.textContent = 'Connecting...';
  
  // Listen for online users
  db.collection('users')
    .where('online', '==', true)
    .onSnapshot(snapshot => {
      const users = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        users.push(userData.displayName || 'Anonymous Explorer');
      });
      
      if (users.length === 0) {
        onlineUsersList.textContent = 'No users online';
      } else {
        onlineUsersList.textContent = users.join(', ');
      }
    });
}

// Initialize crew UI elements
function initCrewUI() {
  // Add crew button to navigation if it doesn't exist
  const nav = document.querySelector('nav');
  if (nav && !document.getElementById('crews-btn')) {
    const crewsBtn = document.createElement('button');
    crewsBtn.id = 'crews-btn';
    crewsBtn.className = 'nav-btn';
    crewsBtn.textContent = 'Crews';
    
    // Insert before settings button
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
      nav.insertBefore(crewsBtn, settingsBtn);
    } else {
      nav.appendChild(crewsBtn);
    }
    
    // Add event listener
    crewsBtn.addEventListener('click', () => {
      switchView('crews-container');
      
      // Update active button
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      crewsBtn.classList.add('active');
    });
  }
  
  // Create crews view container if it doesn't exist
  if (!document.getElementById('crews-container')) {
    const main = document.querySelector('main');
    if (main) {
      const crewsContainer = document.createElement('div');
      crewsContainer.id = 'crews-container';
      crewsContainer.className = 'view';
      // Explicitly ensure it's not active by default
      crewsContainer.classList.remove('active');
      
      crewsContainer.innerHTML = `
        <h2>Crews</h2>
        <div id="no-crew-message">
          <p>You are not part of any crew yet.</p>
          <div class="crew-actions">
            <button id="create-crew-btn" class="neon-button">Create a Crew</button>
            <button id="join-crew-btn" class="neon-button">Join a Crew</button>
          </div>
        </div>
        <div id="crew-info" class="hidden">
          <!-- Crew info will be populated dynamically -->
        </div>
        <div class="territories-section">
          <h3>My Territories</h3>
          <ul id="territories-list" class="territories-list"></ul>
        </div>
      `;
      
      main.appendChild(crewsContainer);
    }
  }
}

// Show "Add to Home Screen" prompt
function showAddToHomeScreenPrompt() {
  const prompt = document.createElement('div');
  prompt.className = 'a2hs-prompt';
  prompt.innerHTML = `
    <div class="a2hs-content">
      <h3>Install Urbindex</h3>
      <p>Install this app on your home screen for the best experience.</p>
      <div class="a2hs-instructions">
        <p>1. Tap <span class="icon">⎙</span> Share</p>
        <p>2. Scroll and tap "Add to Home Screen"</p>
      </div>
      <button class="neon-button a2hs-close">Got it</button>
    </div>
  `;
  
  document.body.appendChild(prompt);
  
  // Show with animation
  setTimeout(() => {
    prompt.classList.add('show');
  }, 100);
  
  // Add close button event
  prompt.querySelector('.a2hs-close').addEventListener('click', () => {
    prompt.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(prompt);
    }, 300);
    
    // Remember that we've shown the prompt
    localStorage.setItem('a2hsPromptShown', 'true');
  });
}

// Add CSS for "Add to Home Screen" prompt
const a2hsStyle = document.createElement('style');
a2hsStyle.textContent = `
  .a2hs-prompt {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background-color: var(--secondary-bg);
    border-top: 2px solid var(--neon-blue);
    padding: 20px;
    box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    transform: translateY(100%);
    transition: transform 0.3s ease;
  }
  
  .a2hs-prompt.show {
    transform: translateY(0);
  }
  
  .a2hs-content {
    max-width: 500px;
    margin: 0 auto;
  }
  
  .a2hs-instructions {
    margin: 15px 0;
    padding: 10px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: var(--border-radius);
  }
  
  .a2hs-instructions p {
    margin: 5px 0;
  }
  
  .a2hs-instructions .icon {
    display: inline-block;
    margin: 0 5px;
    color: var(--neon-blue);
  }
`;

document.head.appendChild(a2hsStyle);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});
