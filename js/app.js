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
  return new Promise((resolve, reject) => {
    try {
      // Initialize authentication
      if (typeof authModule !== 'undefined' && authModule.initAuth) {
        authModule.initAuth();
      }
      
      // Initialize map
      if (typeof mapModule !== 'undefined' && mapModule.initMap) {
        mapModule.initMap();
      }
      
      // Initialize locations
      if (typeof locationsModule !== 'undefined' && locationsModule.initLocations) {
        locationsModule.initLocations();
      }
      
      // Initialize leaderboard
      if (typeof leaderboardModule !== 'undefined' && leaderboardModule.initLeaderboard) {
        leaderboardModule.initLeaderboard();
      }
      
      // Initialize territories
      if (typeof territoriesModule !== 'undefined' && territoriesModule.initTerritories) {
        territoriesModule.initTerritories();
      }
      
      // Initialize comments
      if (typeof commentsModule !== 'undefined' && commentsModule.initComments) {
        commentsModule.initComments();
      }
      
      // Initialize ratings
      if (typeof ratingsModule !== 'undefined' && ratingsModule.initRatings) {
        ratingsModule.initRatings();
      }
      
      // Initialize offline functionality
      if (typeof offlineModule !== 'undefined' && offlineModule.initOffline) {
        offlineModule.initOffline();
      }
      
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
document.addEventListener('DOMContentLoaded', initApp);
