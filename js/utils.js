// Urbindex - Utility Functions Module

// Format date from Firestore timestamp or ISO string
function formatDate(dateValue, includeTime = false) {
  if (!dateValue) {
    return 'Unknown date';
  }
  
  let date;
  
  if (typeof dateValue === 'string') {
    // ISO string
    date = new Date(dateValue);
  } else if (dateValue.toDate) {
    // Firestore Timestamp
    date = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    // JavaScript Date object
    date = dateValue;
  } else {
    return 'Unknown date';
  }
  
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  if (includeTime) {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString();
  }
}

// Get human-readable category label
function getCategoryLabel(category) {
  const labels = {
    abandoned: 'Abandoned',
    historical: 'Historical',
    'street-art': 'Street Art',
    viewpoint: 'Viewpoint',
    'hidden-gem': 'Hidden Gem',
    other: 'Other'
  };
  
  return labels[category] || 'Other';
}

// Get human-readable risk level label
function getRiskLabel(riskLevel) {
  const labels = {
    safe: 'Safe',
    questionable: 'Questionable',
    unknown: 'Unknown',
    hot: 'Hot',
    'high-risk': 'High Risk'
  };
  
  return labels[riskLevel] || 'Unknown';
}

// Get human-readable location type label
function getLocationTypeLabel(locationType) {
  const labels = {
    default: 'Default',
    water: 'Water Source',
    building: 'Abandoned Building',
    power: 'Power Outlet',
    camp: 'Camp Spot',
    geocache: 'Geocache'
  };
  
  return labels[locationType] || 'Default';
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Throttle function to limit how often a function can be called
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Generate a random ID
function generateId(length = 10) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Calculate distance between two coordinates in kilometers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const distance = R * c; // Distance in km
  return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// Sanitize HTML to prevent XSS attacks
function sanitizeHtml(html) {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

// Export functions for use in other modules
window.utilsModule = {
  formatDate,
  getCategoryLabel,
  getRiskLabel,
  getLocationTypeLabel,
  debounce,
  throttle,
  generateId,
  calculateDistance,
  sanitizeHtml
};
