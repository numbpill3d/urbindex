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
}

// Switch between views
function switchView(targetViewId) {
  // Hide all views
  viewContainers.forEach(container => {
    container.classList.remove('active');
  });
  
  // Show target view
  const targetView = document.getElementById(targetViewId);
  if (targetView) {
    targetView.classList.add('active');
    
    // Update history state for back button handling
    const viewName = targetViewId.replace('-container', '');
    history.pushState({ view: viewName }, '', `?view=${viewName}`);
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
      // Define modules to initialize
      const modules = [
        { name: 'auth', init: authModule?.initAuth },
        { name: 'map', init: mapModule?.initMap },
        { name: 'locations', init: locationsModule?.initLocations },
        { name: 'leaderboard', init: leaderboardModule?.initLeaderboard },
        { name: 'territories', init: territoriesModule?.initTerritories },
        { name: 'comments', init: commentsModule?.initComments },
        { name: 'ratings', init: ratingsModule?.initRatings },
        { name: 'geocaching', init: geocachingModule?.initGeocaching },
        { name: 'offline', init: offlineModule?.initOffline }
      ];
      
      // Initialize modules sequentially
      for (const module of modules) {
        if (typeof module.init === 'function') {
          try {
            console.log(`Initializing ${module.name} module...`);
            await Promise.resolve(module.init());
            console.log(`${module.name} module initialized successfully`);
          } catch (moduleError) {
            console.error(`Error initializing ${module.name} module:`, moduleError);
            // Continue with other modules even if one fails
          }
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
    }
  }
  
  // Handle share parameters
  if (urlParams.has('share')) {
    const title = urlParams.get('title');
    const text = urlParams.get('text');
    const url = urlParams.get('url');
    
    handleSharedContent(title, text, url);
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

// Initialize particle effects for ASCII title
function initParticleEffects() {
  const titleContainer = document.querySelector('.ascii-title-container');
  if (!titleContainer) return;
  
  setInterval(() => {
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
    
    setTimeout(() => {
      if (titleContainer.contains(particle)) {
        titleContainer.removeChild(particle);
      }
    }, 1500);
  }, 300);
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

// Send chat message
function sendChatMessage(message) {
  if (!message || !authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  db.collection('chat').add({
    text: message,
    userId: user.uid,
    userName: user.displayName || 'Anonymous',
    userPhotoURL: user.photoURL || null,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .catch(error => {
    console.error('Error sending message:', error);
  });
}

// Listen for new chat messages
function listenForChatMessages() {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  db.collection('chat')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      chatMessages.innerHTML = '';
      
      const messages = [];
      snapshot.forEach(doc => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      
      messages.reverse().forEach(message => {
        const messageEl = document.createElement('div');
        messageEl.className = 'chat-message';
        
        let timeString = 'Just now';
        if (message.timestamp && message.timestamp.toDate) {
          const date = message.timestamp.toDate();
          timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        messageEl.innerHTML = `
          <span class="chat-user">${message.userName}:</span>
          <span class="chat-text">${message.text}</span>
          <span class="chat-time">${timeString}</span>
        `;
        
        chatMessages.appendChild(messageEl);
      });
      
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Initialize activity feed
function initActivityFeed() {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  db.collection('locations')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .onSnapshot(snapshot => {
      feedList.innerHTML = '';
      
      if (snapshot.empty) {
        feedList.innerHTML = '<li class="feed-item">No recent activity</li>';
        return;
      }
      
      snapshot.forEach(doc => {
        const locationData = doc.data();
        addActivityFeedItem(doc.id, locationData);
      });
    });
}

// Add an item to the activity feed
function addActivityFeedItem(id, locationData) {
  const feedList = document.getElementById('activity-feed-list');
  if (!feedList) return;
  
  const feedItem = document.createElement('li');
  feedItem.className = 'feed-item';
  
  let dateDisplay = 'Just now';
  if (locationData.createdAt) {
    dateDisplay = utilsModule.formatDate(locationData.createdAt, true);
  }
  
  const riskLevel = locationData.riskLevel || 'unknown';
  const riskIndicator = `<span class="risk-indicator risk-${riskLevel}">${utilsModule.getRiskLabel(riskLevel)}</span>`;
  
  feedItem.innerHTML = `
    <div class="feed-item-header">
      <h4>${locationData.name}</h4>
      ${riskIndicator}
    </div>
    <p class="feed-item-description">${locationData.description || 'No description'}</p>
    <div class="feed-item-meta">
      <span class="feed-item-date">${dateDisplay}</span>
      <button class="view-on-map-btn" data-id="${id}">View</button>
    </div>
  `;
  
  const viewBtn = feedItem.querySelector('.view-on-map-btn');
  viewBtn.addEventListener('click', () => {
    if (mapModule && mapModule.map && locationData.coordinates) {
      const lat = locationData.coordinates.latitude;
      const lng = locationData.coordinates.longitude;
      
      mapModule.map.setView([lat, lng], 16);
      
      if (mapModule.locationMarkers && mapModule.locationMarkers[id]) {
        mapModule.locationMarkers[id].openPopup();
      }
    }
  });
  
  feedList.appendChild(feedItem);
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

// Initialize user profile page
function initUserProfilePage() {
  // Check if profile container exists
  const profileContainer = document.getElementById('profile-container');
  if (!profileContainer) return;
  
  // Add more customization options
  const customizationSection = profileContainer.querySelector('.profile-customization');
  if (customizationSection) {
    // Add additional customization options if they don't exist
    if (!document.getElementById('user-banner')) {
      const bannerGroup = document.createElement('div');
      bannerGroup.className = 'form-group';
      bannerGroup.innerHTML = `
        <label for="user-banner">Profile Banner</label>
        <select id="user-banner">
          <option value="cyberpunk">Cyberpunk City</option>
          <option value="neon">Neon Lights</option>
          <option value="retro">Retro Wave</option>
          <option value="minimal">Minimal Dark</option>
          <option value="glitch">Digital Glitch</option>
        </select>
      `;
      customizationSection.insertBefore(bannerGroup, document.getElementById('save-profile-btn'));
    }
    
    if (!document.getElementById('user-accent-color')) {
      const accentColorGroup = document.createElement('div');
      accentColorGroup.className = 'form-group';
      accentColorGroup.innerHTML = `
        <label for="user-accent-color">Accent Color</label>
        <select id="user-accent-color">
          <option value="neon-blue">Neon Blue</option>
          <option value="neon-pink">Neon Pink</option>
          <option value="neon-green">Neon Green</option>
          <option value="neon-purple">Neon Purple</option>
          <option value="neon-yellow">Neon Yellow</option>
        </select>
      `;
      customizationSection.insertBefore(accentColorGroup, document.getElementById('save-profile-btn'));
    }
    
    if (!document.getElementById('user-font')) {
      const fontGroup = document.createElement('div');
      fontGroup.className = 'form-group';
      fontGroup.innerHTML = `
        <label for="user-font">Font Style</label>
        <select id="user-font">
          <option value="rajdhani">Rajdhani</option>
          <option value="orbitron">Orbitron</option>
          <option value="share-tech-mono">Share Tech Mono</option>
          <option value="press-start-2p">Press Start 2P</option>
        </select>
      `;
      customizationSection.insertBefore(fontGroup, document.getElementById('save-profile-btn'));
    }
    
    if (!document.getElementById('user-badges')) {
      const badgesGroup = document.createElement('div');
      badgesGroup.className = 'form-group';
      badgesGroup.innerHTML = `
        <label>Display Badges</label>
        <div class="badges-container">
          <div class="badge-item">
            <input type="checkbox" id="badge-explorer" checked>
            <label for="badge-explorer" class="badge-label">Explorer</label>
          </div>
          <div class="badge-item">
            <input type="checkbox" id="badge-contributor" checked>
            <label for="badge-contributor" class="badge-label">Contributor</label>
          </div>
          <div class="badge-item">
            <input type="checkbox" id="badge-pioneer" checked>
            <label for="badge-pioneer" class="badge-label">Pioneer</label>
          </div>
        </div>
      `;
      customizationSection.insertBefore(badgesGroup, document.getElementById('save-profile-btn'));
    }
    
    // Update save button event listener
    const saveBtn = document.getElementById('save-profile-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveUserProfile);
    }
  }
  
  // Load user profile data
  loadUserProfile();
}

// Load user profile data
function loadUserProfile() {
  if (!authModule.isAuthenticated()) return;
  
  const user = authModule.getCurrentUser();
  
  // Get user profile from Firestore
  db.collection('users').doc(user.uid).get()
    .then(doc => {
      if (doc.exists) {
        const userData = doc.data();
        
        // Set profile values
        document.getElementById('profile-name').textContent = userData.displayName || user.displayName || 'Anonymous';
        document.getElementById('profile-avatar').src = userData.photoURL || user.photoURL || 'images/default-avatar.png';
        
        if (userData.joinDate) {
          document.getElementById('join-date').textContent = new Date(userData.joinDate.toDate()).toLocaleDateString();
        }
        
        // Set form values
        document.getElementById('display-name').value = userData.displayName || user.displayName || '';
        document.getElementById('user-bio').value = userData.bio || '';
        
        if (userData.theme) {
          document.getElementById('user-theme').value = userData.theme;
        }
        
        if (userData.banner) {
          document.getElementById('user-banner').value = userData.banner;
        }
        
        if (userData.accentColor) {
          document.getElementById('user-accent-color').value = userData.accentColor;
        }
        
        if (userData.font) {
          document.getElementById('user-font').value = userData.font;
        }
        
        // Set badges
        if (userData.badges) {
          document.getElementById('badge-explorer').checked = userData.badges.includes('explorer');
          document.getElementById('badge-contributor').checked = userData.badges.includes('contributor');
          document.getElementById('badge-pioneer').checked = userData.badges.includes('pioneer');
        }
        
        // Update stats
        document.getElementById('stat-explored').textContent = userData.exploredCount || 0;
        document.getElementById('stat-shared').textContent = userData.sharedCount || 0;
        document.getElementById('stat-rating').textContent = userData.rating || 0;
        document.getElementById('location-count').textContent = userData.locationCount || 0;
      }
    })
    .catch(error => {
      console.error('Error loading user profile:', error);
    });
}

// Save user profile
function saveUserProfile() {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to save your profile');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  // Get form values
  const displayName = document.getElementById('display-name').value.trim();
  const bio = document.getElementById('user-bio').value.trim();
  const theme = document.getElementById('user-theme').value;
  const banner = document.getElementById('user-banner').value;
  const accentColor = document.getElementById('user-accent-color').value;
  const font = document.getElementById('user-font').value;
  
  // Get badges
  const badges = [];
  if (document.getElementById('badge-explorer').checked) badges.push('explorer');
  if (document.getElementById('badge-contributor').checked) badges.push('contributor');
  if (document.getElementById('badge-pioneer').checked) badges.push('pioneer');
  
  // Update user profile in Firestore
  db.collection('users').doc(user.uid).set({
    displayName: displayName,
    bio: bio,
    theme: theme,
    banner: banner,
    accentColor: accentColor,
    font: font,
    badges: badges,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true })
    .then(() => {
      // Update display name in Firebase Auth if changed
      if (displayName !== user.displayName) {
        user.updateProfile({
          displayName: displayName
        });
      }
      
      // Show success message
      alert('Profile saved successfully');
      
      // Reload profile data
      loadUserProfile();
    })
    .catch(error => {
      console.error('Error saving profile:', error);
      alert('Error saving profile. Please try again.');
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
  
  // Initialize user profile page
  initUserProfilePage();
});
