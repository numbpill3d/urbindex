// Urbindex - Main Application Module

// DOM Elements
const splashScreen = document.getElementById('splash-screen');
const appContainer = document.getElementById('app');
const navButtons = document.querySelectorAll('.nav-btn');
const viewContainers = document.querySelectorAll('.view');
const modalCloseButtons = document.querySelectorAll('.close-modal');

// Enhanced app state
let isInitialized = false;
let isOnline = navigator.onLine;
let deferredPrompt = null;
let registeredServiceWorker = null;

// Initialize the application with improved PWA support
function initApp() {
  // Show splash screen
  showSplashScreen();
  
  // Set up event listeners
  setupEventListeners();
  
  // Register service worker for PWA support
  registerServiceWorker();
  
  // Check network status
  checkNetworkStatus();
  
  // Initialize modules
  initializeModules()
    .then(() => {
      // Hide splash screen and show app with minimum time for branding
      setTimeout(() => {
        hideSplashScreen();
        isInitialized = true;
        
        // Check if app was launched from installed PWA
        checkInstalledPwaStatus();
        
        // Load any shared content if launched via share target
        checkForSharedContent();
      }, 2000); // Minimum 2 seconds to show splash screen
    })
    .catch(error => {
      console.error('Error initializing app:', error);
      showInitializationError();
    });
  
  // Check for "Add to Home Screen" eligibility on different platforms
  checkInstallPromptEligibility();
}

// Register service worker for PWA capabilities
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        registeredServiceWorker = registration;
        
        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              showUpdateAvailableNotification();
            }
          });
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
      
    // Listen for controller change (service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('New Service Worker activated');
    });
  }
}

// Check if network is available
function checkNetworkStatus() {
  // Update initial online status
  isOnline = navigator.onLine;
  
  // Add event listeners for online/offline events
  window.addEventListener('online', handleOnlineStatusChange);
  window.addEventListener('offline', handleOnlineStatusChange);
  
  // Show offline notification if offline on startup
  if (!isOnline) {
    showOfflineNotification();
  }
}

// Handle online/offline status changes
function handleOnlineStatusChange(event) {
  isOnline = navigator.onLine;
  
  if (isOnline) {
    console.log('App is online');
    document.body.classList.remove('offline-mode');
    
    // Show online notification
    if (isInitialized) {
      showToast('You are back online!', 'success');
      
      // Sync offline data if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-locations')
            .then(() => console.log('Sync registered for offline data'))
            .catch(err => console.error('Sync registration failed:', err));
        });
      }
    }
  } else {
    console.log('App is offline');
    document.body.classList.add('offline-mode');
    
    // Show offline notification
    if (isInitialized) {
      showToast('You are offline. Some features may be limited.', 'warning');
    }
  }
}

// Check if app was launched from installed PWA
function checkInstalledPwaStatus() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        window.navigator.standalone === true;
  
  if (isStandalone) {
    // App is running as installed PWA
    document.body.classList.add('pwa-mode');
    
    // You can enable/disable certain features based on PWA mode
    console.log('Running as installed PWA');
    
    // Optimize for installed experience
    enablePwaOptimizations();
  }
}

// Enable optimizations for installed PWA experience
function enablePwaOptimizations() {
  // Add PWA-specific UI adjustments
  const header = document.querySelector('header');
  if (header) {
    header.classList.add('pwa-header');
  }
  
  // Add swipe navigation for PWA
  setupSwipeNavigation();
}

// Setup swipe navigation for mobile PWA
function setupSwipeNavigation() {
  let touchStartX = 0;
  let touchEndX = 0;
  
  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
  }, false);
  
  document.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, false);
  
  function handleSwipe() {
    const swipeThreshold = 100;
    
    if (touchEndX - touchStartX > swipeThreshold) {
      // Swipe right - go back
      handleBackNavigation();
    } else if (touchStartX - touchEndX > swipeThreshold) {
      // Swipe left - go forward
      handleForwardNavigation();
    }
  }
  
  function handleBackNavigation() {
    // Custom back navigation logic
    if (window.history.state?.view) {
      // Determine the previous view based on navigation order
      const views = ['map', 'forum', 'spots', 'profile', 'settings'];
      const currentViewIndex = views.indexOf(window.history.state.view);
      
      if (currentViewIndex > 0) {
        const prevView = views[currentViewIndex - 1];
        const prevViewBtn = document.getElementById(`${prevView}-btn`);
        if (prevViewBtn) {
          prevViewBtn.click();
        }
      }
    }
  }
  
  function handleForwardNavigation() {
    // Custom forward navigation logic
    if (window.history.state?.view) {
      // Determine the next view based on navigation order
      const views = ['map', 'forum', 'spots', 'profile', 'settings'];
      const currentViewIndex = views.indexOf(window.history.state.view);
      
      if (currentViewIndex < views.length - 1) {
        const nextView = views[currentViewIndex + 1];
        const nextViewBtn = document.getElementById(`${nextView}-btn`);
        if (nextViewBtn) {
          nextViewBtn.click();
        }
      }
    }
  }
}

// Check for shared content when launched via share target
function checkForSharedContent() {
  const urlParams = new URLSearchParams(window.location.search);
  
  if (urlParams.has('share')) {
    const title = urlParams.get('title');
    const text = urlParams.get('text');
    const url = urlParams.get('url');
    
    if (title || text || url) {
      // Process shared content
      processSharedContent(title, text, url);
    }
  }
}

// Process content shared to the app
function processSharedContent(title, text, url) {
  console.log('Processing shared content:', { title, text, url });
  
  // Show a notification about the shared content
  showToast('New content shared with Urbindex', 'info');
  
  // Create a modal to handle the shared content
  const sharedContentModal = document.createElement('div');
  sharedContentModal.className = 'modal active';
  sharedContentModal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>Shared Content</h3>
      
      <div class="shared-content-container">
        ${title ? `<div class="shared-title">${title}</div>` : ''}
        ${text ? `<div class="shared-text">${text}</div>` : ''}
        ${url ? `<div class="shared-url"><a href="${url}" target="_blank">${url}</a></div>` : ''}
      </div>
      
      <div class="form-actions">
        <button id="share-as-post-btn" class="neon-button">Share as Post</button>
        <button id="share-as-location-btn" class="neon-button">Add as Location</button>
        <button id="dismiss-share-btn" class="neon-button">Dismiss</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(sharedContentModal);
  
  // Set up event listeners
  const closeBtn = sharedContentModal.querySelector('.close-modal');
  const dismissBtn = sharedContentModal.querySelector('#dismiss-share-btn');
  const shareAsPostBtn = sharedContentModal.querySelector('#share-as-post-btn');
  const shareAsLocationBtn = sharedContentModal.querySelector('#share-as-location-btn');
  
  const closeModal = () => {
    sharedContentModal.classList.remove('active');
    setTimeout(() => {
      if (sharedContentModal.parentNode) {
        sharedContentModal.parentNode.removeChild(sharedContentModal);
      }
      
      // Clean up the URL
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }, 300);
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);
  
  // Handle "Share as Post" button
  if (shareAsPostBtn) {
    shareAsPostBtn.addEventListener('click', () => {
      // Navigate to forum and prepare a new post
      const forumBtn = document.getElementById('forum-btn');
      if (forumBtn) {
        forumBtn.click();
        
        // Wait for forum to load
        setTimeout(() => {
          const newPostBtn = document.getElementById('new-post-btn');
          if (newPostBtn) newPostBtn.click();
          
          // Fill in the form with shared content
          const titleInput = document.querySelector('#forum-post-form input[name="title"]');
          const contentInput = document.querySelector('#forum-post-form textarea[name="content"]');
          
          if (titleInput && title) titleInput.value = title;
          if (contentInput) {
            let content = '';
            if (text) content += text + '\n\n';
            if (url) content += url;
            contentInput.value = content;
          }
        }, 500);
      }
      
      closeModal();
    });
  }
  
  // Handle "Add as Location" button
  if (shareAsLocationBtn) {
    shareAsLocationBtn.addEventListener('click', () => {
      // Extract coordinates from text or URL if possible
      const coordsRegex = /(-?\d+\.\d+),\s*(-?\d+\.\d+)/;
      let coords = null;
      
      if (text && coordsRegex.test(text)) {
        const matches = text.match(coordsRegex);
        coords = { lat: parseFloat(matches[1]), lng: parseFloat(matches[2]) };
      } else if (url && coordsRegex.test(url)) {
        const matches = url.match(coordsRegex);
        coords = { lat: parseFloat(matches[1]), lng: parseFloat(matches[2]) };
      }
      
      // Navigate to map
      const mapBtn = document.getElementById('map-btn');
      if (mapBtn) mapBtn.click();
      
      if (coords) {
        // Wait for map to load
        setTimeout(() => {
          if (window.mapModule?.map()) {
            window.mapModule.map().setView([coords.lat, coords.lng], 16);
            openAddLocationModal(coords);
          }
        }, 500);
      } else {
        // Get current location instead
        setTimeout(() => {
          const addLocationBtn = document.getElementById('add-location-btn');
          if (addLocationBtn) addLocationBtn.click();
        }, 500);
      }
      
      closeModal();
    });
  }
}

// Check for install prompt eligibility across platforms
function checkInstallPromptEligibility() {
  // Check for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // For iOS devices
  if (isIOS && !window.navigator.standalone) {
    // Check if we've shown the prompt before
    const hasShownIOSPrompt = localStorage.getItem('a2hsPromptShown');
    
    if (!hasShownIOSPrompt) {
      // Show iOS install prompt after a delay for better UX
      setTimeout(() => {
        showIOSInstallPrompt();
      }, 20000); // 20 seconds delay
    }
  }
  
  // For other browsers that support the beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default prompt
    e.preventDefault();
    
    // Store the event for later use
    deferredPrompt = e;
    
    // Check if we've shown the prompt recently
    const lastPromptTime = localStorage.getItem('installPromptLastShown');
    const now = Date.now();
    
    // Only show prompt if we haven't shown it in the last 3 days
    if (!lastPromptTime || (now - parseInt(lastPromptTime, 10)) > 3 * 24 * 60 * 60 * 1000) {
      // Show the custom install prompt element after a delay
      setTimeout(() => {
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) {
          installPrompt.classList.add('visible');
          setupInstallPromptListeners();
        } else {
          // Fall back to the older prompt method if the new UI element isn't present
          showInstallPrompt();
        }
      }, 30000); // 30 seconds delay for better engagement
    }
  });
  
  // Set up listeners for our custom install prompt UI
  function setupInstallPromptListeners() {
    const installButton = document.getElementById('install-button');
    const dismissButton = document.getElementById('dismiss-install');
    
    if (installButton) {
      installButton.addEventListener('click', () => {
        if (!deferredPrompt) return;
        
        // Hide the prompt
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) installPrompt.classList.remove('visible');
        
        // Show the installation prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            // Maybe show a thank you message
            showToast('Thanks for installing Urbindex!', 'success');
          } else {
            console.log('User dismissed the install prompt');
          }
          
          // Clear the deferred prompt
          deferredPrompt = null;
          
          // Remember that we've shown the prompt
          localStorage.setItem('installPromptLastShown', Date.now().toString());
        });
      });
    }
    
    if (dismissButton) {
      dismissButton.addEventListener('click', () => {
        // Hide the prompt
        const installPrompt = document.getElementById('install-prompt');
        if (installPrompt) installPrompt.classList.remove('visible');
        
        // Remember that we've shown the prompt
        localStorage.setItem('installPromptLastShown', Date.now().toString());
      });
    }
  }
  
  // Listen for app installation
  window.addEventListener('appinstalled', () => {
    // Log app installation
    console.log('PWA was installed');
    
    // Clear deferred prompt
    deferredPrompt = null;
    
    // Update UI to reflect installed state
    document.body.classList.add('pwa-installed');
    
    // Thank the user
    showToast('Thanks for installing Urbindex!', 'success');
  });
}

// Show installation prompt for modern browsers (fallback method)
function showInstallPrompt() {
  if (!deferredPrompt) return;
  
  // Create a custom install prompt with enhanced styling
  const promptContainer = document.createElement('div');
  promptContainer.className = 'install-prompt';
  promptContainer.innerHTML = `
    <div class="install-prompt-content">
      <div class="install-prompt-header">
        <h3>Install Urbindex</h3>
        <button class="close-prompt">&times;</button>
      </div>
      <p>Install this app on your device for the best experience:</p>
      <div class="install-benefits">
        <div class="benefit-item">
          <i class="fas fa-wifi-slash"></i>
          <span>Access offline</span>
        </div>
        <div class="benefit-item">
          <i class="fas fa-bolt"></i>
          <span>Faster loading times</span>
        </div>
        <div class="benefit-item">
          <i class="fas fa-expand"></i>
          <span>Full-screen experience</span>
        </div>
        <div class="benefit-item">
          <i class="fas fa-home"></i>
          <span>Home screen icon</span>
        </div>
      </div>
      <div class="install-actions">
        <button id="install-btn" class="neon-button">Install Now</button>
        <button id="install-later-btn" class="text-button">Maybe Later</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(promptContainer);
  
  // Animate in
  setTimeout(() => {
    promptContainer.classList.add('show');
  }, 100);
  
  // Set up event listeners
  const closeBtn = promptContainer.querySelector('.close-prompt');
  const installBtn = promptContainer.querySelector('#install-btn');
  const laterBtn = promptContainer.querySelector('#install-later-btn');
  
  const closePrompt = () => {
    promptContainer.classList.remove('show');
    setTimeout(() => {
      if (promptContainer.parentNode) {
        promptContainer.parentNode.removeChild(promptContainer);
      }
    }, 300);
    
    // Remember that we've shown the prompt
    localStorage.setItem('installPromptLastShown', Date.now().toString());
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closePrompt);
  if (laterBtn) laterBtn.addEventListener('click', closePrompt);
  
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      // Show the installation prompt
      deferredPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          showToast('Thanks for installing Urbindex!', 'success');
        } else {
          console.log('User dismissed the install prompt');
        }
        
        // Clear the deferred prompt
        deferredPrompt = null;
      });
      
      closePrompt();
    });
  }
}

// Show iOS specific install instructions with improved UX
function showIOSInstallPrompt() {
  const prompt = document.createElement('div');
  prompt.className = 'a2hs-prompt';
  prompt.innerHTML = `
    <div class="a2hs-content">
      <div class="a2hs-header">
        <h3>Install Urbindex</h3>
        <button class="a2hs-close">&times;</button>
      </div>
      <p>Install this app on your home screen for the best experience:</p>
      <div class="a2hs-instructions">
        <div class="a2hs-step">
          <div class="step-number">1</div>
          <div class="step-text">Tap <i class="fas fa-share"></i> Share</div>
        </div>
        <div class="a2hs-step">
          <div class="step-number">2</div>
          <div class="step-text">Scroll and tap "Add to Home Screen"</div>
        </div>
      </div>
      <img src="/images/icons/ios-install-guide.png" alt="Installation guide" class="install-guide-img">
      <button class="neon-button a2hs-ok">Got it</button>
    </div>
  `;
  
  document.body.appendChild(prompt);
  
  // Show with animation
  setTimeout(() => {
    prompt.classList.add('show');
  }, 100);
  
  // Add close button events
  const closeBtn = prompt.querySelector('.a2hs-close');
  const okBtn = prompt.querySelector('.a2hs-ok');
  
  const closePrompt = () => {
    prompt.classList.remove('show');
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.parentNode.removeChild(prompt);
      }
    }, 300);
    
    // Remember that we've shown the prompt
    localStorage.setItem('a2hsPromptShown', 'true');
    // Set an expiration date - show again after 30 days
    const expirationDate = Date.now() + (30 * 24 * 60 * 60 * 1000);
    localStorage.setItem('a2hsPromptExpires', expirationDate.toString());
  };
  
  if (closeBtn) closeBtn.addEventListener('click', closePrompt);
  if (okBtn) okBtn.addEventListener('click', closePrompt);
}

// Show notification for available updates with enhanced UX
function showUpdateAvailableNotification() {
  // Create update notification
  const updateNotification = document.createElement('div');
  updateNotification.className = 'update-notification';
  updateNotification.innerHTML = `
    <div class="update-notification-content">
      <div class="update-icon">
        <i class="fas fa-sync-alt fa-spin"></i>
      </div>
      <div class="update-text">
        <h4>Update Available</h4>
        <p>A new version of Urbindex is available</p>
      </div>
      <div class="update-actions">
        <button id="update-now-btn" class="neon-button small">Update Now</button>
        <button id="update-later-btn" class="text-button">Later</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(updateNotification);
  
  // Animate in
  setTimeout(() => {
    updateNotification.classList.add('show');
  }, 100);
  
  // Set up event listeners
  const updateNowBtn = updateNotification.querySelector('#update-now-btn');
  const updateLaterBtn = updateNotification.querySelector('#update-later-btn');
  
  const closeNotification = () => {
    updateNotification.classList.remove('show');
    setTimeout(() => {
      if (updateNotification.parentNode) {
        updateNotification.parentNode.removeChild(updateNotification);
      }
    }, 300);
  };
  
  if (updateNowBtn) {
    updateNowBtn.addEventListener('click', () => {
      // Show loading indicator
      updateNowBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Updating...';
      updateNowBtn.disabled = true;
      
      // Try to update the service worker
      if (registeredServiceWorker) {
        registeredServiceWorker.update()
          .then(() => {
            // Reload the page to get the new version
            window.location.reload();
          })
          .catch(err => {
            console.error('Failed to update service worker:', err);
            // Still try to reload the page as fallback
            window.location.reload();
          });
      } else {
        // Just reload the page if no service worker is registered
        window.location.reload();
      }
      
      closeNotification();
    });
  }
  
  if (updateLaterBtn) {
    updateLaterBtn.addEventListener('click', closeNotification);
  }
}

// Show offline notification with enhanced UX
function showOfflineNotification() {
  // Add offline class to body
  document.body.classList.add('offline-mode');
  
  // Create offline indicator if it doesn't exist
  if (!document.querySelector('.offline-indicator')) {
    const offlineIndicator = document.createElement('div');
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.innerHTML = `
      <i class="fas fa-wifi"></i> You're offline
    `;
    document.body.appendChild(offlineIndicator);
  }
  
  // Show notification once app is initialized
  if (isInitialized) {
    showToast('You are offline. Some features may be limited.', 'warning', {
      duration: 7000,
      actionText: 'Details',
      action: () => {
        showOfflineDetailsModal();
      }
    });
  }
  
  // Disable network-dependent features
  const disabledButtons = [
    '.chat-send-btn',
    '#forum-search-btn',
    '#spots-search-btn'
  ];
  
  disabledButtons.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.disabled = true;
      el.title = 'Not available offline';
      el.style.opacity = '0.5';
    });
  });
}

// Show detailed offline mode information
function showOfflineDetailsModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h3>Offline Mode</h3>
      <p>You are currently offline. While offline, you can still:</p>
      <ul class="offline-features-list">
        <li><i class="fas fa-map-marked-alt"></i> View previously visited map areas</li>
        <li><i class="fas fa-bookmark"></i> Access your saved locations</li>
        <li><i class="fas fa-list"></i> View previously loaded content</li>
        <li><i class="fas fa-pencil-alt"></i> Create new content (will sync when online)</li>
      </ul>
      <p>These features require internet connection:</p>
      <ul class="offline-limitations-list">
        <li><i class="fas fa-comment"></i> Live chat</li>
        <li><i class="fas fa-search"></i> Search functionality</li>
        <li><i class="fas fa-cloud-upload-alt"></i> Uploading media</li>
        <li><i class="fas fa-bell"></i> Real-time notifications</li>
      </ul>
      <p>Your data will be automatically synced when you're back online.</p>
      <button class="neon-button modal-close-btn">Got it</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Show modal
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  // Add close button event
  const closeButtons = modal.querySelectorAll('.close-modal, .modal-close-btn');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    });
  });
  
  // Close when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      setTimeout(() => {
        if (modal.parentNode) {
          modal.parentNode.removeChild(modal);
        }
      }, 300);
    }
  });
}

// Generic toast notification function
function showToast(message, type = 'info', options = {}) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'info-circle';
  switch (type) {
    case 'success': iconClass = 'check-circle'; break;
    case 'warning': iconClass = 'exclamation-triangle'; break;
    case 'error': iconClass = 'times-circle'; break;
  }
  
  toast.innerHTML = `
    <div class="toast-content">
      <i class="fas fa-${iconClass} toast-icon"></i>
      <div class="toast-message">${message}</div>
      ${options.actionText ? `<button class="toast-action">${options.actionText}</button>` : ''}
      <button class="toast-close">&times;</button>
    </div>
  `;
  
  // Add to document
  const toastContainer = document.querySelector('.toast-container') || createToastContainer();
  toastContainer.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Set up action button
  if (options.actionText && options.action) {
    const actionBtn = toast.querySelector('.toast-action');
    if (actionBtn) {
      actionBtn.addEventListener('click', () => {
        options.action();
        closeToast();
      });
    }
  }
  
  // Set up close button
  const closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeToast);
  }
  
  // Close after timeout
  const timeout = setTimeout(closeToast, options.duration || 5000);
  
  function closeToast() {
    clearTimeout(timeout);
    toast.classList.remove('show');
    
    // Remove after animation
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // Remove container if empty
      if (toastContainer.children.length === 0) {
        toastContainer.parentNode.removeChild(toastContainer);
      }
    }, 300);
  }
  
  // Create toast container if it doesn't exist
  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }
  
  // Return toast element for potential manipulation
  return toast;
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
      const targetView = button.getAttribute('data-view');
      const targetViewId = `${targetView}-container`;
      switchView(targetViewId);
      
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

// Enhanced switchView function with better error handling
function switchView(targetViewId) {
  console.log("Switching to view:", targetViewId);
  
  // Get all view containers
  const viewContainers = document.querySelectorAll('.view');
  
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
      history.pushState({ view: 'map' }, '', "?view=map");
      
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
  if (event.state?.view) {
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
  if (url?.includes('location=')) {
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
  
  // Fix navigation buttons
  initNavigation();
}

// Add navigation initialization function
function initNavigation() {
  // Get all navigation buttons
  const navButtons = document.querySelectorAll('.nav-btn, .nav-link');
  
  // Add click event listeners to each button
  navButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get the target section from the button's data attribute or href
      const target = this.dataset.target || this.getAttribute('href').replace('#', '');
      
      // Handle different navigation targets
      switch(target) {
        case 'map':
          showSection('map-section');
          break;
        case 'forum':
          showSection('forum-section');
          if (typeof initForumUI === 'function') initForumUI();
          break;
        case 'spots':
          showSection('spots-section');
          if (typeof initSpotsUI === 'function') initSpotsUI();
          break;
        case 'profile':
          showSection('profile-section');
          if (typeof loadUserProfile === 'function') loadUserProfile();
          break;
        case 'leaderboard':
          showSection('leaderboard-section');
          if (typeof initLeaderboard === 'function') initLeaderboard();
          break;
        default:
          console.log('Unknown section:', target);
      }
    });
  });
}

// Function to show a specific section and hide others
function showSection(sectionId) {
  // Hide all sections
  const sections = document.querySelectorAll('.main-section');
  sections.forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the requested section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.style.display = 'block';
    
    // Update active state in navigation
    const navButtons = document.querySelectorAll('.nav-btn, .nav-link');
    navButtons.forEach(button => {
      button.classList.remove('active');
      
      const buttonTarget = button.dataset.target || 
                          (button.getAttribute('href') && button.getAttribute('href').replace('#', ''));
      
      if (sectionId.includes(buttonTarget)) {
        button.classList.add('active');
      }
    });
    
    // Dispatch event for section change
    window.dispatchEvent(new CustomEvent('section-changed', { 
      detail: { section: sectionId } 
    }));
  }
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
          if (message.timestamp?.toDate) {
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
            
            if (window.locationMarkers?.[id]) {
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

// Add CSS for PWA UI elements with enhanced styling
const pwaCssStyles = document.createElement('style');
pwaCssStyles.textContent = `
  /* Add to Home Screen prompt for iOS */
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
  
  .a2hs-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .a2hs-close {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  
  .a2hs-close:hover {
    color: var(--danger);
  }
  
  .a2hs-instructions {
    margin: 15px 0;
    padding: 15px;
    background-color: rgba(255, 255, 255, 0.05);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
  }
  
  .a2hs-step {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }
  
  .a2hs-step:last-child {
    margin-bottom: 0;
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background-color: var(--neon-blue);
    color: var(--primary-bg);
    border-radius: 50%;
    margin-right: 15px;
    font-weight: bold;
  }
  
  .step-text {
    flex: 1;
  }
  
  .install-guide-img {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 15px auto;
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
  }
  
  .a2hs-ok {
    display: block;
    margin: 20px auto 0;
  }
  
  /* Install prompt for modern browsers */
  .install-prompt {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(12, 12, 24, 0.9);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }
  
  .install-prompt.show {
    opacity: 1;
    visibility: visible;
  }
  
  .install-prompt-content {
    background-color: var(--secondary-bg);
    border-radius: var(--border-radius-lg);
    padding: 30px;
    max-width: 500px;
    width: 90%;
    box-shadow: var(--shadow-hard);
    border: 1px solid var(--neon-blue);
    position: relative;
    animation: fadeInUp 0.5s ease;
  }
  
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .install-prompt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
  }
  
  .close-prompt {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 24px;
    cursor: pointer;
    transition: color 0.2s ease;
  }
  
  .close-prompt:hover {
    color: var(--danger);
  }
  
  .install-benefits {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin: 20px 0;
  }
  
  .benefit-item {
    display: flex;
    align-items: center;
    padding: 10px;
    background-color: var(--tertiary-bg);
    border-radius: var(--border-radius-sm);
    border: 1px solid var(--border-color);
  }
  
  .benefit-item i {
    color: var(--neon-blue);
    font-size: 20px;
    margin-right: 10px;
    width: 24px;
    text-align: center;
  }
  
  .install-actions {
    display: flex;
    justify-content: space-between;
    margin-top: 25px;
  }
  
  .install-actions button {
    padding: 10px 20px;
  }
  
  /* Update notification */
  .update-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: var(--secondary-bg);
    border: 1px solid var(--neon-blue);
    border-radius: var(--border-radius);
    padding: 15px;
    box-shadow: var(--shadow-hard);
    z-index: 1000;
    width: 300px;
    max-width: 90%;
    transform: translateX(120%);
    transition: transform 0.3s ease;
  }
  
  .update-notification.show {
    transform: translateX(0);
  }
  
  .update-notification-content {
    display: flex;
    align-items: center;
  }
  
  .update-icon {
    background-color: var(--tertiary-bg);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 15px;
    color: var(--neon-blue);
    font-size: 18px;
  }
  
  .update-text {
    flex: 1;
  }
  
  .update-text h4 {
    margin: 0 0 5px;
    font-size: 16px;
  }
  
  .update-text p {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  .update-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
    gap: 10px;
  }
  
  /* Offline indicator */
  .offline-indicator {
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 8px 16px;
    background-color: rgba(255, 58, 125, 0.9);
    color: white;
    border-radius: 8px;
    font-family: var(--font-secondary);
    font-size: 14px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: pulse 2s infinite alternate;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .offline-features-list, .offline-limitations-list {
    margin: 15px 0;
    padding: 0;
    list-style: none;
  }
  
  .offline-features-list li, .offline-limitations-list li {
    padding: 8px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .offline-features-list i {
    color: var(--success);
  }
  
  .offline-limitations-list i {
    color: var(--text-muted);
  }
`;

document.head.appendChild(a2hsStyle);

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

// Handle offline mode more gracefully
window.addEventListener('online', function() {
  document.body.classList.remove('offline-mode');
  
  // Re-enable network-dependent features
  const disabledButtons = [
    '.chat-send-btn',
    '#forum-search-btn',
    '#spots-search-btn'
  ];
  
  disabledButtons.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.disabled = false;
      el.title = '';
      el.style.opacity = '1';
    });
  });
  
  // Show online notification
  showNotification('You are back online', 'success');
});

window.addEventListener('offline', function() {
  document.body.classList.add('offline-mode');
  
  // Disable network-dependent features
  const disabledButtons = [
    '.chat-send-btn',
    '#forum-search-btn',
    '#spots-search-btn'
  ];
  
  disabledButtons.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      el.disabled = true;
      el.title = 'Not available offline';
      el.style.opacity = '0.5';
    });
  });
  
  // Show offline notification
  showNotification('You are offline. Some features may be limited.', 'warning');
});

// Helper function to show notifications
function showNotification(message, type = 'info') {
  // Check if notification container exists, create if not
  let notifContainer = document.querySelector('.notification-container');
  if (!notifContainer) {
    notifContainer = document.createElement('div');
    notifContainer.className = 'notification-container';
    document.body.appendChild(notifContainer);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                     type === 'warning' ? 'fa-exclamation-triangle' : 
                     type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
      <span>${message}</span>
    </div>
    <button class="notification-close"><i class="fas fa-times"></i></button>
  `;
  
  // Add to container
  notifContainer.appendChild(notification);
  
  // Add close button functionality
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.classList.add('notification-hiding');
    setTimeout(() => {
      notification.remove();
    }, 300);
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.classList.add('notification-hiding');
      setTimeout(() => {
        if (notification.parentNode) notification.remove();
      }, 300);
    }
  }, 5000);
  
  // Show with animation
  setTimeout(() => {
    notification.classList.add('notification-visible');
  }, 10);
}

// Debug function to check DOM structure
function debugDOMStructure() {
  console.log("=== DOM STRUCTURE DEBUG ===");
  
  // Check navigation buttons
  const navButtons = document.querySelectorAll('.nav-btn');
  console.log(`Found ${navButtons.length} navigation buttons:`);
  navButtons.forEach(btn => {
    console.log(`Button: ${btn.textContent.trim()}, data-view: ${btn.dataset.view}, id: ${btn.id}`);
  });
  
  // Check view containers
  const viewContainers = document.querySelectorAll('.view');
  console.log(`Found ${viewContainers.length} view containers:`);
  viewContainers.forEach(container => {
    console.log(`Container: ${container.id}, display: ${getComputedStyle(container).display}, classes: ${container.className}`);
  });
  
  // Check if main element exists
  const main = document.querySelector('main');
  console.log(`Main element exists: ${Boolean(main)}`);
  
  console.log("=== END DOM STRUCTURE DEBUG ===");
}

// Run debug on page load
window.addEventListener('load', function() {
  setTimeout(debugDOMStructure, 1000); // Delay to ensure everything is loaded
});
