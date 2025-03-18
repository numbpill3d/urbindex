// Urbindex - Notifications Module

// DOM Elements
let notificationContainer;
let notificationSettings;

// Default notification settings
const defaultSettings = {
  newLocations: true,
  comments: true,
  mentions: true,
  achievements: true,
  challenges: true,
  followers: true,
  crews: true,
  reminders: true,
  frequency: 'realtime' // realtime, hourly, daily
};

// User's notification settings
let userSettings = { ...defaultSettings };

// Initialize notifications functionality
function initNotifications() {
  // Create notification container if it doesn't exist
  createNotificationContainer();
  
  // Add notification settings to settings page
  addNotificationSettings();
  
  // Load user notification settings
  loadNotificationSettings();
  
  // Set up notification listeners
  setupNotificationListeners();
  
  // Request notification permission if not already granted
  requestNotificationPermission();
}

// Create notification container
function createNotificationContainer() {
  // Check if container already exists
  if (document.getElementById('notification-container')) return;
  
  // Create container
  notificationContainer = document.createElement('div');
  notificationContainer.id = 'notification-container';
  document.body.appendChild(notificationContainer);
}

// Add notification settings to settings page
function addNotificationSettings() {
  const settingsContainer = document.getElementById('settings-container');
  if (!settingsContainer) return;
  
  // Check if notification settings already exist
  if (document.getElementById('notification-settings')) return;
  
  // Create notification settings section
  notificationSettings = document.createElement('div');
  notificationSettings.id = 'notification-settings';
  notificationSettings.className = 'settings-section';
  
  notificationSettings.innerHTML = `
    <h3>Notification Settings</h3>
    <div class="notification-toggles">
      <div class="setting-item">
        <label for="notify-new-locations">New Locations in My Area</label>
        <input type="checkbox" id="notify-new-locations" class="notification-toggle" data-type="newLocations">
      </div>
      <div class="setting-item">
        <label for="notify-comments">Comments on My Locations</label>
        <input type="checkbox" id="notify-comments" class="notification-toggle" data-type="comments">
      </div>
      <div class="setting-item">
        <label for="notify-mentions">Mentions in Forum</label>
        <input type="checkbox" id="notify-mentions" class="notification-toggle" data-type="mentions">
      </div>
      <div class="setting-item">
        <label for="notify-achievements">New Achievements</label>
        <input type="checkbox" id="notify-achievements" class="notification-toggle" data-type="achievements">
      </div>
      <div class="setting-item">
        <label for="notify-challenges">Challenge Updates</label>
        <input type="checkbox" id="notify-challenges" class="notification-toggle" data-type="challenges">
      </div>
      <div class="setting-item">
        <label for="notify-followers">New Followers</label>
        <input type="checkbox" id="notify-followers" class="notification-toggle" data-type="followers">
      </div>
      <div class="setting-item">
        <label for="notify-crews">Crew Activity</label>
        <input type="checkbox" id="notify-crews" class="notification-toggle" data-type="crews">
      </div>
      <div class="setting-item">
        <label for="notify-reminders">Location Reminders</label>
        <input type="checkbox" id="notify-reminders" class="notification-toggle" data-type="reminders">
      </div>
    </div>
    
    <div class="setting-item">
      <label for="notification-frequency">Notification Frequency</label>
      <select id="notification-frequency">
        <option value="realtime">Real-time</option>
        <option value="hourly">Hourly Digest</option>
        <option value="daily">Daily Digest</option>
      </select>
    </div>
    
    <button id="save-notification-settings" class="neon-button">Save Notification Settings</button>
  `;
  
  // Insert before app info
  const appInfo = settingsContainer.querySelector('.app-info');
  if (appInfo) {
    settingsContainer.insertBefore(notificationSettings, appInfo);
  } else {
    settingsContainer.appendChild(notificationSettings);
  }
  
  // Add event listeners
  const saveButton = document.getElementById('save-notification-settings');
  if (saveButton) {
    saveButton.addEventListener('click', saveNotificationSettings);
  }
  
  const frequencySelect = document.getElementById('notification-frequency');
  if (frequencySelect) {
    frequencySelect.addEventListener('change', () => {
      userSettings.frequency = frequencySelect.value;
    });
  }
  
  // Add event listeners to toggles
  const toggles = document.querySelectorAll('.notification-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('change', () => {
      const type = toggle.dataset.type;
      userSettings[type] = toggle.checked;
    });
  });
}

// Load user notification settings
function loadNotificationSettings() {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) {
    // Use default settings for non-authenticated users
    userSettings = { ...defaultSettings };
    updateSettingsUI();
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Get user settings from Firestore
  db.collection('users').doc(user.uid).get()
    .then(doc => {
      if (doc.exists && doc.data().notificationSettings) {
        userSettings = {
          ...defaultSettings,
          ...doc.data().notificationSettings
        };
      } else {
        // Use default settings if not found
        userSettings = { ...defaultSettings };
        
        // Save default settings to Firestore
        db.collection('users').doc(user.uid).update({
          notificationSettings: userSettings
        }).catch(error => {
          console.error('Error saving default notification settings:', error);
        });
      }
      
      // Update UI
      updateSettingsUI();
    })
    .catch(error => {
      console.error('Error loading notification settings:', error);
      
      // Use default settings on error
      userSettings = { ...defaultSettings };
      updateSettingsUI();
    });
}

// Update settings UI based on loaded settings
function updateSettingsUI() {
  // Update toggles
  Object.keys(userSettings).forEach(key => {
    if (key === 'frequency') return;
    
    const toggle = document.querySelector(`.notification-toggle[data-type="${key}"]`);
    if (toggle) {
      toggle.checked = userSettings[key];
    }
  });
  
  // Update frequency select
  const frequencySelect = document.getElementById('notification-frequency');
  if (frequencySelect) {
    frequencySelect.value = userSettings.frequency;
  }
}

// Save notification settings
function saveNotificationSettings() {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Please sign in to save notification settings', 'error');
    } else {
      alert('Please sign in to save notification settings');
    }
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Save settings to Firestore
  db.collection('users').doc(user.uid).update({
    notificationSettings: userSettings,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Notification settings saved', 'success');
    } else {
      alert('Notification settings saved');
    }
  })
  .catch(error => {
    console.error('Error saving notification settings:', error);
    
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Error saving notification settings', 'error');
    } else {
      alert('Error saving notification settings');
    }
  });
}

// Set up notification listeners
function setupNotificationListeners() {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Listen for new notifications
  const unsubscribe = db.collection('users').doc(user.uid)
    .collection('notifications')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Check if notification should be shown based on settings
          if (shouldShowNotification(notification)) {
            // Show notification
            showNotification(notification);
            
            // Send browser notification if enabled
            sendBrowserNotification(notification);
          }
        }
      });
    }, error => {
      console.error('Error listening for notifications:', error);
    });
  
  // Store unsubscribe function for cleanup
  window.notificationsUnsubscribe = unsubscribe;
  
  // Add event listener to clean up when navigating away
  window.addEventListener('beforeunload', () => {
    if (window.notificationsUnsubscribe) {
      window.notificationsUnsubscribe();
    }
  });
}

// Check if notification should be shown based on settings
function shouldShowNotification(notification) {
  // Check if notification type is enabled
  if (!userSettings[notification.type]) return false;
  
  // Check frequency setting
  if (userSettings.frequency === 'realtime') {
    return true;
  } else if (userSettings.frequency === 'hourly') {
    // Only show if it's a new hour since last notification
    const lastNotificationTime = localStorage.getItem('lastNotificationTime');
    if (!lastNotificationTime) return true;
    
    const lastTime = new Date(parseInt(lastNotificationTime));
    const currentTime = new Date();
    
    return currentTime.getHours() !== lastTime.getHours() || 
           currentTime.getDate() !== lastTime.getDate() ||
           currentTime.getMonth() !== lastTime.getMonth() ||
           currentTime.getFullYear() !== lastTime.getFullYear();
  } else if (userSettings.frequency === 'daily') {
    // Only show if it's a new day since last notification
    const lastNotificationTime = localStorage.getItem('lastNotificationTime');
    if (!lastNotificationTime) return true;
    
    const lastTime = new Date(parseInt(lastNotificationTime));
    const currentTime = new Date();
    
    return currentTime.getDate() !== lastTime.getDate() ||
           currentTime.getMonth() !== lastTime.getMonth() ||
           currentTime.getFullYear() !== lastTime.getFullYear();
  }
  
  return true;
}

// Show notification in app
function showNotification(notification) {
  if (!notificationContainer) return;
  
  // Create notification element
  const notificationElement = document.createElement('div');
  notificationElement.className = 'notification';
  notificationElement.dataset.id = notification.id;
  
  // Add notification type class
  notificationElement.classList.add(`notification-${notification.type}`);
  
  // Set notification content
  notificationElement.innerHTML = `
    <div class="notification-icon">${getNotificationIcon(notification.type)}</div>
    <div class="notification-content">
      <div class="notification-title">${notification.title}</div>
      <div class="notification-message">${notification.message}</div>
      <div class="notification-time">${formatNotificationTime(notification.timestamp)}</div>
    </div>
    <button class="notification-close">&times;</button>
  `;
  
  // Add click event to notification
  notificationElement.addEventListener('click', (e) => {
    if (e.target.classList.contains('notification-close')) {
      // Close notification
      closeNotification(notification.id);
    } else {
      // Handle notification click
      handleNotificationClick(notification);
    }
  });
  
  // Add to container
  notificationContainer.prepend(notificationElement);
  
  // Show notification
  setTimeout(() => {
    notificationElement.classList.add('show');
  }, 10);
  
  // Auto-hide notification after 5 seconds
  setTimeout(() => {
    notificationElement.classList.remove('show');
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (notificationContainer.contains(notificationElement)) {
        notificationContainer.removeChild(notificationElement);
      }
    }, 300);
  }, 5000);
  
  // Update last notification time
  localStorage.setItem('lastNotificationTime', Date.now().toString());
}

// Get notification icon based on type
function getNotificationIcon(type) {
  switch (type) {
    case 'newLocations':
      return '<span class="material-icon">location_on</span>';
    case 'comments':
      return '<span class="material-icon">comment</span>';
    case 'mentions':
      return '<span class="material-icon">alternate_email</span>';
    case 'achievements':
      return '<span class="material-icon">emoji_events</span>';
    case 'challenges':
      return '<span class="material-icon">flag</span>';
    case 'followers':
      return '<span class="material-icon">person_add</span>';
    case 'crews':
      return '<span class="material-icon">group</span>';
    case 'reminders':
      return '<span class="material-icon">notifications</span>';
    default:
      return '<span class="material-icon">notifications</span>';
  }
}

// Format notification time
function formatNotificationTime(timestamp) {
  if (!timestamp) return 'Just now';
  
  // Convert Firebase timestamp to Date
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  
  // Calculate time difference in milliseconds
  const diff = now.getTime() - date.getTime();
  
  // Convert to minutes, hours, days
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (minutes < 1) {
    return 'Just now';
  } else if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else {
    // Format as date
    return date.toLocaleDateString();
  }
}

// Close notification
function closeNotification(id) {
  const notification = document.querySelector(`.notification[data-id="${id}"]`);
  if (!notification) return;
  
  // Hide notification
  notification.classList.remove('show');
  
  // Remove from DOM after animation
  setTimeout(() => {
    if (notificationContainer.contains(notification)) {
      notificationContainer.removeChild(notification);
    }
  }, 300);
  
  // Mark as read in Firestore
  markNotificationAsRead(id);
}

// Mark notification as read in Firestore
function markNotificationAsRead(id) {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Update notification in Firestore
  db.collection('users').doc(user.uid)
    .collection('notifications').doc(id)
    .update({
      read: true,
      readAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .catch(error => {
      console.error('Error marking notification as read:', error);
    });
}

// Handle notification click
function handleNotificationClick(notification) {
  // Mark as read
  markNotificationAsRead(notification.id);
  
  // Handle different notification types
  switch (notification.type) {
    case 'newLocations':
      // Navigate to map and show location
      if (notification.data && notification.data.locationId) {
        document.getElementById('map-view-btn').click();
        
        // Show location on map
        if (window.mapModule?.showLocation) {
          window.mapModule.showLocation(notification.data.locationId);
        }
      } else {
        // Just navigate to map
        document.getElementById('map-view-btn').click();
      }
      break;
      
    case 'comments':
      // Navigate to location with comments
      if (notification.data && notification.data.locationId) {
        document.getElementById('map-view-btn').click();
        
        // Show location on map
        if (window.mapModule?.showLocation) {
          window.mapModule.showLocation(notification.data.locationId);
        }
        
        // Open comments section
        if (window.commentsModule?.showComments) {
          window.commentsModule.showComments(notification.data.locationId);
        }
      }
      break;
      
    case 'mentions':
      // Navigate to forum post
      if (notification.data && notification.data.postId) {
        document.getElementById('forum-btn').click();
        
        // Show post
        if (window.forumModule?.showPost) {
          window.forumModule.showPost(notification.data.postId);
        }
      } else {
        // Just navigate to forum
        document.getElementById('forum-btn').click();
      }
      break;
      
    case 'achievements':
      // Navigate to profile achievements
      document.getElementById('profile-btn').click();
      
      // Scroll to achievements section
      setTimeout(() => {
        const achievementsSection = document.querySelector('.achievements-section');
        if (achievementsSection) {
          achievementsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      break;
      
    case 'challenges':
      // Navigate to profile challenges
      document.getElementById('profile-btn').click();
      
      // Scroll to challenges section
      setTimeout(() => {
        const challengesSection = document.querySelector('.challenges-section');
        if (challengesSection) {
          challengesSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      break;
      
    case 'followers':
      // Navigate to profile followers
      document.getElementById('profile-btn').click();
      
      // Scroll to followers section
      setTimeout(() => {
        const followersContainer = document.getElementById('followers-container');
        if (followersContainer) {
          followersContainer.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      break;
      
    case 'crews':
      // Navigate to crews
      const crewsBtn = document.getElementById('crews-btn');
      if (crewsBtn) {
        crewsBtn.click();
      }
      break;
      
    case 'reminders':
      // Navigate to location
      if (notification.data && notification.data.locationId) {
        document.getElementById('map-view-btn').click();
        
        // Show location on map
        if (window.mapModule?.showLocation) {
          window.mapModule.showLocation(notification.data.locationId);
        }
      } else {
        // Just navigate to map
        document.getElementById('map-view-btn').click();
      }
      break;
      
    default:
      // Default action is to do nothing
      break;
  }
}

// Send browser notification
function sendBrowserNotification(notification) {
  // Check if browser notifications are supported
  if (!('Notification' in window)) return;
  
  // Check if permission is granted
  if (Notification.permission !== 'granted') return;
  
  // Create notification
  const browserNotification = new Notification(notification.title, {
    body: notification.message,
    icon: '/images/icons/icon-192x192.png'
  });
  
  // Add click event
  browserNotification.onclick = () => {
    // Focus on window
    window.focus();
    
    // Handle notification click
    handleNotificationClick(notification);
    
    // Close browser notification
    browserNotification.close();
  };
}

// Request notification permission
function requestNotificationPermission() {
  // Check if browser notifications are supported
  if (!('Notification' in window)) return;
  
  // Check if permission is already granted
  if (Notification.permission === 'granted') return;
  
  // Check if permission is denied
  if (Notification.permission === 'denied') return;
  
  // Request permission
  Notification.requestPermission();
}

// Create a new notification
function createNotification(type, title, message, data = {}) {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Create notification object
  const notification = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    data,
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    read: false
  };
  
  // Save to Firestore
  db.collection('users').doc(user.uid)
    .collection('notifications').doc(notification.id)
    .set(notification)
    .catch(error => {
      console.error('Error creating notification:', error);
    });
}

// Set reminder for a location
function setLocationReminder(locationId, locationName, reminderDate) {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Please sign in to set reminders', 'error');
    } else {
      alert('Please sign in to set reminders');
    }
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Create reminder object
  const reminder = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    locationId,
    locationName,
    reminderDate: firebase.firestore.Timestamp.fromDate(reminderDate),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    userId: user.uid
  };
  
  // Save to Firestore
  db.collection('reminders').doc(reminder.id)
    .set(reminder)
    .then(() => {
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast(`Reminder set for ${locationName}`, 'success');
      } else {
        alert(`Reminder set for ${locationName}`);
      }
    })
    .catch(error => {
      console.error('Error setting reminder:', error);
      
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('Error setting reminder', 'error');
      } else {
        alert('Error setting reminder');
      }
    });
}

// Add CSS for notifications
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  /* Notification Container */
  #notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    max-width: 90vw;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    pointer-events: none;
  }
  
  /* Notification */
  .notification {
    background-color: var(--secondary-bg);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    padding: 15px;
    display: flex;
    align-items: flex-start;
    transform: translateX(120%);
    transition: transform 0.3s ease;
    pointer-events: auto;
    border-left: 4px solid var(--neon-blue);
    max-width: 100%;
  }
  
  .notification.show {
    transform: translateX(0);
  }
  
  /* Notification types */
  .notification-newLocations {
    border-left-color: var(--neon-green);
  }
  
  .notification-comments {
    border-left-color: var(--neon-blue);
  }
  
  .notification-mentions {
    border-left-color: var(--neon-pink);
  }
  
  .notification-achievements {
    border-left-color: var(--neon-yellow);
  }
  
  .notification-challenges {
    border-left-color: var(--neon-orange);
  }
  
  .notification-followers {
    border-left-color: var(--neon-purple);
  }
  
  .notification-crews {
    border-left-color: var(--neon-teal);
  }
  
  .notification-reminders {
    border-left-color: var(--neon-red);
  }
  
  /* Notification Icon */
  .notification-icon {
    margin-right: 10px;
    font-size: 24px;
    color: var(--neon-blue);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .notification-newLocations .notification-icon {
    color: var(--neon-green);
  }
  
  .notification-comments .notification-icon {
    color: var(--neon-blue);
  }
  
  .notification-mentions .notification-icon {
    color: var(--neon-pink);
  }
  
  .notification-achievements .notification-icon {
    color: var(--neon-yellow);
  }
  
  .notification-challenges .notification-icon {
    color: var(--neon-orange);
  }
  
  .notification-followers .notification-icon {
    color: var(--neon-purple);
  }
  
  .notification-crews .notification-icon {
    color: var(--neon-teal);
  }
  
  .notification-reminders .notification-icon {
    color: var(--neon-red);
  }
  
  /* Notification Content */
  .notification-content {
    flex: 1;
    overflow: hidden;
  }
  
  .notification-title {
    font-weight: bold;
    margin-bottom: 5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .notification-message {
    font-size: 14px;
    margin-bottom: 5px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  
  .notification-time {
    font-size: 12px;
    color: var(--text-secondary);
  }
  
  /* Notification Close Button */
  .notification-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 18px;
    cursor: pointer;
    padding: 0;
    margin-left: 10px;
    line-height: 1;
  }
  
  .notification-close:hover {
    color: var(--text-primary);
  }
  
  /* Notification Settings */
  #notification-settings {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
  
  .notification-toggles {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  @media (min-width: 768px) {
    .notification-toggles {
      grid-template-columns: 1fr 1fr;
    }
  }
  
  /* Material Icons (placeholder) */
  .material-icon {
    font-family: monospace;
  }
`;

document.head.appendChild(notificationStyles);

// Export functions for use in other modules
window.notificationsModule = {
  initNotifications,
  createNotification,
  setLocationReminder
};
