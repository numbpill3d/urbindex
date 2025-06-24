// Urbindex - Offline Module

// Initialize offline functionality
function initOffline() {
  // Check initial online status
  updateOnlineStatus();
  
  // Listen for online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Set up periodic sync when online
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      // Register background sync
      if ('sync' in registration) {
        registration.sync.register('sync-locations');
      }
    });
  }
}

// Handle online event
function handleOnline() {
  console.log('App is online');
  updateOnlineStatus();
  
  // Show toast notification
  showToast('You are back online!', 'success');
  
  // Sync offline data
  syncOfflineData();
}

// Handle offline event
function handleOffline() {
  console.log('App is offline');
  updateOnlineStatus();
  
  // Show toast notification
  showToast('You are offline. Some features may be limited.', 'warning');
}

// Update online status indicator
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  document.body.classList.toggle('offline-mode', !isOnline);
  
  // Update offline indicator
  let offlineIndicator = document.querySelector('.offline-indicator');
  
  if (!isOnline && !offlineIndicator) {
    offlineIndicator = document.createElement('div');
    offlineIndicator.className = 'offline-indicator';
    offlineIndicator.innerHTML = '<i class="fas fa-wifi"></i> You\'re offline';
    document.body.appendChild(offlineIndicator);
  } else if (isOnline && offlineIndicator) {
    offlineIndicator.remove();
  }
}

// Sync offline data when back online
async function syncOfflineData() {
  if (!navigator.onLine) return;
  
  try {
    // Sync locations
    if (window.locationsModule?.syncOfflineLocations) {
      await window.locationsModule.syncOfflineLocations();
    }
    
    console.log('Offline data synced successfully');
  } catch (error) {
    console.error('Error syncing offline data:', error);
  }
}

// Show toast notification
function showToast(message, type = 'info', options = {}) {
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
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      if (toastContainer.children.length === 0) {
        toastContainer.parentNode.removeChild(toastContainer);
      }
    }, 300);
  }
  
  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }
  
  return toast;
}

// Export functions
window.offlineModule = {
  initOffline,
  showToast,
  syncOfflineData
};