// Export geocaching functions for use in other modules
window.geocachingModule = {
  initGeocaching: function() {
    console.log('Geocaching module initialized');
    // Set up event listeners
    document.addEventListener('user-signed-in', (event) => {
      const user = event.detail;
      // Nothing to do here yet, but we could load user's geocache history
    });
    
    document.addEventListener('user-signed-out', () => {
      // Clear any user-specific geocache data
    });
  },
  
  createGeocache: function(locationId, data) {
    console.log('Creating geocache for location:', locationId, data);
    return Promise.resolve(true);
  },
  
  getGeocache: function(geocacheId) {
    console.log('Getting geocache:', geocacheId);
    return Promise.resolve({
      id: geocacheId,
      title: 'Sample Geocache',
      description: 'This is a sample geocache',
      hint: 'Look under the rock',
      difficulty: 2,
      size: 'medium',
      status: 'active',
      findCount: 5,
      items: ['Toy car', 'Coin', 'Keychain']
    });
  },
  
  findGeocache: function(geocacheId, logData) {
    console.log('Finding geocache:', geocacheId, logData);
    return Promise.resolve(true);
  },
  
  updateGeocacheItems: function(geocacheId, items, action) {
    console.log('Updating geocache items:', geocacheId, items, action);
    return Promise.resolve(true);
  },
  
  getGeocacheFindLogs: function(geocacheId) {
    console.log('Getting geocache find logs:', geocacheId);
    return Promise.resolve([]);
  },
  
  getUserGeocacheFinds: function(userId) {
    console.log('Getting user geocache finds:', userId);
    return Promise.resolve([]);
  },
  
  renderGeocacheDetails: function(geocacheId, container) {
    console.log('Rendering geocache details:', geocacheId);
    if (!container) return;
    
    container.innerHTML = `
      <h3>Geocache Details</h3>
      <div class="geocache-details">
        <div class="geocache-header">
          <h4>Sample Geocache</h4>
          <div class="geocache-meta">
            <span class="geocache-difficulty">Difficulty: ★★</span>
            <span class="geocache-size">Size: medium</span>
          </div>
        </div>
        <p class="geocache-description">This is a sample geocache</p>
        <div class="geocache-hint">
          <h5>Hint (click to reveal)</h5>
          <p class="hint-text hidden">Look under the rock</p>
        </div>
        <div class="geocache-stats">
          <span>Found 5 times</span>
          <span>Created on ${new Date().toLocaleDateString()}</span>
        </div>
      </div>
    `;
    
    // Add hint reveal functionality
    const hintTitle = container.querySelector('.geocache-hint h5');
    const hintText = container.querySelector('.hint-text');
    
    if (hintTitle && hintText) {
      hintTitle.addEventListener('click', () => {
        hintText.classList.toggle('hidden');
      });
    }
  }
};
