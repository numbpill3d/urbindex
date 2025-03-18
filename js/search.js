// Urbindex - Advanced Search Module

// DOM Elements
const spotsSearchInput = document.getElementById('spots-search');
const spotsSearchBtn = document.getElementById('spots-search-btn');
const spotsFilterType = document.getElementById('spots-filter-type');
const spotsFilterVisibility = document.getElementById('spots-filter-visibility');
const spotsFilterRating = document.getElementById('spots-filter-rating');

// Search state
let currentSearchQuery = '';
let currentFilters = {
  type: 'all',
  visibility: 'all',
  rating: 'all',
  sortBy: 'recent',
  features: []
};

// Initialize search functionality
function initSearch() {
  // Set up event listeners
  if (spotsSearchBtn) {
    spotsSearchBtn.addEventListener('click', () => {
      performSearch();
    });
  }
  
  if (spotsSearchInput) {
    spotsSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });
  }
  
  // Set up filter event listeners
  if (spotsFilterType) {
    spotsFilterType.addEventListener('change', () => {
      currentFilters.type = spotsFilterType.value;
      applyFilters();
    });
  }
  
  if (spotsFilterVisibility) {
    spotsFilterVisibility.addEventListener('change', () => {
      currentFilters.visibility = spotsFilterVisibility.value;
      applyFilters();
    });
  }
  
  if (spotsFilterRating) {
    spotsFilterRating.addEventListener('change', () => {
      currentFilters.rating = spotsFilterRating.value;
      applyFilters();
    });
  }
  
  // Set up advanced search UI
  setupAdvancedSearchUI();
}

// Set up advanced search UI
function setupAdvancedSearchUI() {
  // Create advanced search button
  const searchContainer = document.getElementById('spots-search-container');
  if (searchContainer) {
    const advancedSearchBtn = document.createElement('button');
    advancedSearchBtn.id = 'advanced-search-btn';
    advancedSearchBtn.textContent = 'Advanced';
    advancedSearchBtn.className = 'neon-button small';
    
    searchContainer.appendChild(advancedSearchBtn);
    
    // Add event listener
    advancedSearchBtn.addEventListener('click', showAdvancedSearchModal);
  }
  
  // Create sort options
  const spotsControls = document.querySelector('.spots-controls');
  if (spotsControls) {
    const sortContainer = document.createElement('div');
    sortContainer.className = 'spots-sort';
    
    sortContainer.innerHTML = `
      <label for="spots-sort-by">Sort By:</label>
      <select id="spots-sort-by" class="spots-filter" aria-label="Sort by">
        <option value="recent">Most Recent</option>
        <option value="rating">Highest Rated</option>
        <option value="popularity">Most Popular</option>
        <option value="name">Name (A-Z)</option>
      </select>
    `;
    
    spotsControls.appendChild(sortContainer);
    
    // Add event listener
    const sortSelect = document.getElementById('spots-sort-by');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        currentFilters.sortBy = sortSelect.value;
        applyFilters();
      });
    }
  }
}

// Show advanced search modal
function showAdvancedSearchModal() {
  // Create modal for advanced search
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'advanced-search-modal';
  
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>Advanced Search</h2>
      
      <form id="advanced-search-form">
        <div class="form-group">
          <label for="advanced-search-keyword">Keyword</label>
          <input type="text" id="advanced-search-keyword" placeholder="Search by name, description, or notes" value="${currentSearchQuery}">
        </div>
        
        <div class="form-group">
          <label>Categories</label>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="category-abandoned" name="categories" value="abandoned" ${currentFilters.type === 'abandoned' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-abandoned">Abandoned</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-historical" name="categories" value="historical" ${currentFilters.type === 'historical' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-historical">Historical</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-street-art" name="categories" value="street-art" ${currentFilters.type === 'street-art' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-street-art">Street Art</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-viewpoint" name="categories" value="viewpoint" ${currentFilters.type === 'viewpoint' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-viewpoint">Viewpoint</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-hidden-gem" name="categories" value="hidden-gem" ${currentFilters.type === 'hidden-gem' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-hidden-gem">Hidden Gem</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-water-fountain" name="categories" value="water-fountain" ${currentFilters.type === 'water-fountain' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-water-fountain">Water Fountain</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-community-space" name="categories" value="community-space" ${currentFilters.type === 'community-space' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-community-space">Community Space</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-public-lobby" name="categories" value="public-lobby" ${currentFilters.type === 'public-lobby' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-public-lobby">Public Lobby</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-abandoned-house" name="categories" value="abandoned-house" ${currentFilters.type === 'abandoned-house' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-abandoned-house">Abandoned House</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="category-secret-trail" name="categories" value="secret-trail" ${currentFilters.type === 'secret-trail' || currentFilters.type === 'all' ? 'checked' : ''}>
              <label for="category-secret-trail">Secret Trail</label>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label>Features</label>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="feature-shelter" name="features" value="shelter" ${currentFilters.features.includes('shelter') ? 'checked' : ''}>
              <label for="feature-shelter">Shelter</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="feature-water" name="features" value="water" ${currentFilters.features.includes('water') ? 'checked' : ''}>
              <label for="feature-water">Water Source</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="feature-power" name="features" value="power" ${currentFilters.features.includes('power') ? 'checked' : ''}>
              <label for="feature-power">Power Outlet</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="feature-seating" name="features" value="seating" ${currentFilters.features.includes('seating') ? 'checked' : ''}>
              <label for="feature-seating">Seating</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="feature-restroom" name="features" value="restroom" ${currentFilters.features.includes('restroom') ? 'checked' : ''}>
              <label for="feature-restroom">Restroom</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="feature-cell-signal" name="features" value="cell-signal" ${currentFilters.features.includes('cell-signal') ? 'checked' : ''}>
              <label for="feature-cell-signal">Cell Signal</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="feature-wifi" name="features" value="wifi" ${currentFilters.features.includes('wifi') ? 'checked' : ''}>
              <label for="feature-wifi">WiFi</label>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="advanced-search-safety">Minimum Safety Rating</label>
          <select id="advanced-search-safety">
            <option value="0">Any</option>
            <option value="3">3+ (Somewhat Safe)</option>
            <option value="5">5+ (Moderately Safe)</option>
            <option value="7">7+ (Very Safe)</option>
            <option value="9">9+ (Extremely Safe)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="advanced-search-accessibility">Accessibility</label>
          <select id="advanced-search-accessibility">
            <option value="all">Any</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="difficult">Difficult</option>
            <option value="very-difficult">Very Difficult</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="advanced-search-popularity">Popularity</label>
          <select id="advanced-search-popularity">
            <option value="all">Any</option>
            <option value="lowkey">Lowkey</option>
            <option value="moderate">Moderate</option>
            <option value="hot">Hot</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="advanced-search-added-by">Added By</label>
          <select id="advanced-search-added-by">
            <option value="all">Anyone</option>
            <option value="me">Me</option>
            <option value="following">People I Follow</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="advanced-search-date-range">Date Added</label>
          <select id="advanced-search-date-range">
            <option value="all">Any Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>
        
        <div class="form-actions">
          <button type="button" id="reset-search-btn" class="neon-button">Reset</button>
          <button type="submit" class="neon-button">Search</button>
        </div>
      </form>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Show modal
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
  
  // Set up event listeners
  const closeBtn = modal.querySelector('.close-modal');
  const resetBtn = modal.querySelector('#reset-search-btn');
  const form = modal.querySelector('#advanced-search-form');
  
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  });
  
  resetBtn.addEventListener('click', () => {
    // Reset form
    form.reset();
    
    // Check all category checkboxes
    const categoryCheckboxes = form.querySelectorAll('input[name="categories"]');
    categoryCheckboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
  });
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Get form values
    const keyword = document.getElementById('advanced-search-keyword').value.trim();
    
    // Get selected categories
    const categoryCheckboxes = form.querySelectorAll('input[name="categories"]:checked');
    const categories = Array.from(categoryCheckboxes).map(checkbox => checkbox.value);
    
    // Get selected features
    const featureCheckboxes = form.querySelectorAll('input[name="features"]:checked');
    const features = Array.from(featureCheckboxes).map(checkbox => checkbox.value);
    
    // Get other filter values
    const safetyRating = document.getElementById('advanced-search-safety').value;
    const accessibility = document.getElementById('advanced-search-accessibility').value;
    const popularity = document.getElementById('advanced-search-popularity').value;
    const addedBy = document.getElementById('advanced-search-added-by').value;
    const dateRange = document.getElementById('advanced-search-date-range').value;
    
    // Update search state
    currentSearchQuery = keyword;
    
    // Update filters
    if (categories.length === 0 || categories.length === form.querySelectorAll('input[name="categories"]').length) {
      currentFilters.type = 'all';
    } else if (categories.length === 1) {
      currentFilters.type = categories[0];
    } else {
      currentFilters.type = 'custom';
      currentFilters.categories = categories;
    }
    
    currentFilters.features = features;
    currentFilters.safetyRating = safetyRating;
    currentFilters.accessibility = accessibility;
    currentFilters.popularity = popularity;
    currentFilters.addedBy = addedBy;
    currentFilters.dateRange = dateRange;
    
    // Close modal
    modal.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
    
    // Perform search
    performAdvancedSearch();
  });
}

// Perform basic search
function performSearch() {
  if (!spotsSearchInput) return;
  
  const query = spotsSearchInput.value.trim();
  currentSearchQuery = query;
  
  // If query is empty, just apply filters
  if (!query) {
    applyFilters();
    return;
  }
  
  // Show loading state
  showSearchLoading();
  
  // Perform search
  searchLocations(query, currentFilters)
    .then(results => {
      displaySearchResults(results);
    })
    .catch(error => {
      console.error('Error performing search:', error);
      showSearchError();
    });
}

// Perform advanced search
function performAdvancedSearch() {
  // Show loading state
  showSearchLoading();
  
  // Perform search
  searchLocations(currentSearchQuery, currentFilters)
    .then(results => {
      displaySearchResults(results);
    })
    .catch(error => {
      console.error('Error performing advanced search:', error);
      showSearchError();
    });
}

// Apply filters
function applyFilters() {
  // If there's a search query, perform search with updated filters
  if (currentSearchQuery) {
    performSearch();
    return;
  }
  
  // Otherwise, just filter the current view
  filterLocations(currentFilters);
}

// Search locations
async function searchLocations(query, filters) {
  try {
    // Start with a base query
    let locationsQuery = db.collection('locations');
    
    // Apply visibility filter
    if (filters.visibility === 'public') {
      locationsQuery = locationsQuery.where('visibility', '==', 'public');
    } else if (filters.visibility === 'private' && authModule.isAuthenticated()) {
      locationsQuery = locationsQuery.where('createdBy', '==', authModule.getCurrentUser().uid)
                                    .where('visibility', '==', 'private');
    }
    
    // Apply type filter
    if (filters.type !== 'all' && filters.type !== 'custom') {
      locationsQuery = locationsQuery.where('category', '==', filters.type);
    }
    
    // Apply added by filter
    if (filters.addedBy === 'me' && authModule.isAuthenticated()) {
      locationsQuery = locationsQuery.where('createdBy', '==', authModule.getCurrentUser().uid);
    } else if (filters.addedBy === 'following' && authModule.isAuthenticated()) {
      // Get following list
      const followingSnapshot = await db.collection('following')
        .where('followerId', '==', authModule.getCurrentUser().uid)
        .get();
      
      const followingIds = [];
      followingSnapshot.forEach(doc => {
        followingIds.push(doc.data().followingId);
      });
      
      // If not following anyone, return empty results
      if (followingIds.length === 0) {
        return [];
      }
      
      // Firebase doesn't support array-contains-any with other where clauses
      // So we'll need to filter these results in memory
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        locationsQuery = locationsQuery.where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(startDate));
      }
    }
    
    // Apply sort
    switch (filters.sortBy) {
      case 'recent':
        locationsQuery = locationsQuery.orderBy('createdAt', 'desc');
        break;
      case 'rating':
        locationsQuery = locationsQuery.orderBy('rating', 'desc');
        break;
      case 'popularity':
        locationsQuery = locationsQuery.orderBy('viewCount', 'desc');
        break;
      case 'name':
        locationsQuery = locationsQuery.orderBy('name');
        break;
    }
    
    // Execute query
    const snapshot = await locationsQuery.get();
    
    // Process results
    const results = [];
    snapshot.forEach(doc => {
      const locationData = doc.data();
      
      // Apply custom type filter
      if (filters.type === 'custom' && filters.categories && !filters.categories.includes(locationData.category)) {
        return;
      }
      
      // Apply safety rating filter
      if (filters.safetyRating && parseInt(filters.safetyRating) > 0) {
        const safetyRating = locationData.safetyRating || 0;
        if (safetyRating < parseInt(filters.safetyRating)) {
          return;
        }
      }
      
      // Apply accessibility filter
      if (filters.accessibility !== 'all' && locationData.accessibility !== filters.accessibility) {
        return;
      }
      
      // Apply popularity filter
      if (filters.popularity !== 'all' && locationData.popularity !== filters.popularity) {
        return;
      }
      
      // Apply features filter
      if (filters.features && filters.features.length > 0) {
        const locationFeatures = locationData.features || [];
        
        // Check if location has all selected features
        const hasAllFeatures = filters.features.every(feature => {
          if (feature === 'wifi') {
            return locationData.wifi === true;
          }
          return locationFeatures.includes(feature);
        });
        
        if (!hasAllFeatures) {
          return;
        }
      }
      
      // Apply following filter
      if (filters.addedBy === 'following' && authModule.isAuthenticated()) {
        const followingIds = [];
        followingSnapshot.forEach(doc => {
          followingIds.push(doc.data().followingId);
        });
        
        if (!followingIds.includes(locationData.createdBy)) {
          return;
        }
      }
      
      // Apply keyword search
      if (query) {
        const name = locationData.name || '';
        const description = locationData.description || '';
        const notes = locationData.notes || '';
        const address = locationData.address || '';
        
        const searchText = `${name} ${description} ${notes} ${address}`.toLowerCase();
        const keywords = query.toLowerCase().split(' ');
        
        // Check if all keywords are present
        const hasAllKeywords = keywords.every(keyword => searchText.includes(keyword));
        
        if (!hasAllKeywords) {
          return;
        }
      }
      
      // Add to results
      results.push({
        id: doc.id,
        ...locationData
      });
    });
    
    return results;
  } catch (error) {
    console.error('Error searching locations:', error);
    throw error;
  }
}

// Filter locations
function filterLocations(filters) {
  // This function is called by the spots module to filter the current view
  if (window.spotsModule?.filterSpots) {
    window.spotsModule.filterSpots(filters);
  }
}

// Display search results
function displaySearchResults(results) {
  // This function is called by the spots module to display search results
  if (window.spotsModule?.displaySearchResults) {
    window.spotsModule.displaySearchResults(results);
  }
}

// Show search loading state
function showSearchLoading() {
  const spotsContainer = document.getElementById('spots-container');
  if (!spotsContainer) return;
  
  spotsContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner"></div>
      <p>Searching...</p>
    </div>
  `;
}

// Show search error
function showSearchError() {
  const spotsContainer = document.getElementById('spots-container');
  if (!spotsContainer) return;
  
  spotsContainer.innerHTML = `
    <div class="error-state">
      <p>Error performing search. Please try again.</p>
      <button id="retry-search" class="neon-button">Retry</button>
    </div>
  `;
  
  const retryBtn = document.getElementById('retry-search');
  if (retryBtn) {
    retryBtn.addEventListener('click', performSearch);
  }
}

// Export functions for use in other modules
window.searchModule = {
  initSearch,
  performSearch,
  performAdvancedSearch,
  applyFilters,
  searchLocations,
  filterLocations,
  displaySearchResults
};
