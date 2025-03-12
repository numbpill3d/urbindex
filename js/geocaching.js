// Urbindex - Geocaching Module

// Initialize geocaching functionality
function initGeocaching() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    // Nothing to do here yet, but we could load user's geocache history
  });
  
  document.addEventListener('user-signed-out', () => {
    // Clear any user-specific geocache data
  });
}

// Create a new geocache
async function createGeocache(locationId, data) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to create geocaches');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if location exists
    const locationDoc = await locationsRef.doc(locationId).get();
    
    if (!locationDoc.exists) {
      console.error('Location does not exist');
      return false;
    }
    
    // Create geocache document
    const geocacheData = {
      locationId,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      title: data.title || 'Geocache',
      description: data.description || '',
      hint: data.hint || '',
      difficulty: data.difficulty || 1,
      size: data.size || 'small',
      status: 'active',
      findCount: 0,
      lastFoundAt: null,
      items: data.items || []
    };
    
    const geocacheRef = await geocachesRef.add(geocacheData);
    
    // Update location to mark it as a geocache
    await locationsRef.doc(locationId).update({
      locationType: 'geocache',
      geocacheId: geocacheRef.id
    });
    
    console.log('Geocache created successfully');
    return geocacheRef.id;
  } catch (error) {
    console.error('Error creating geocache:', error);
    return false;
  }
}

// Get geocache details
async function getGeocache(geocacheId) {
  try {
    const geocacheDoc = await geocachesRef.doc(geocacheId).get();
    
    if (!geocacheDoc.exists) {
      console.error('Geocache does not exist');
      return null;
    }
    
    return {
      id: geocacheDoc.id,
      ...geocacheDoc.data()
    };
  } catch (error) {
    console.error('Error getting geocache:', error);
    return null;
  }
}

// Find a geocache (mark as found by user)
async function findGeocache(geocacheId, logData) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to log geocache finds');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Check if geocache exists
    const geocacheDoc = await geocachesRef.doc(geocacheId).get();
    
    if (!geocacheDoc.exists) {
      console.error('Geocache does not exist');
      return false;
    }
    
    // Check if user has already found this geocache
    const findLogRef = db.collection('geocacheFinds')
      .doc(`${geocacheId}_${user.uid}`);
    
    const findLogDoc = await findLogRef.get();
    
    if (findLogDoc.exists) {
      // User has already found this geocache, update the log
      await findLogRef.update({
        logText: logData.logText || 'Found it again!',
        itemsTaken: logData.itemsTaken || [],
        itemsLeft: logData.itemsLeft || [],
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      // New find
      await findLogRef.set({
        geocacheId,
        userId: user.uid,
        userDisplayName: user.displayName || 'Anonymous',
        userPhotoURL: user.photoURL || null,
        logText: logData.logText || 'Found it!',
        itemsTaken: logData.itemsTaken || [],
        itemsLeft: logData.itemsLeft || [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update geocache find count
      await geocachesRef.doc(geocacheId).update({
        findCount: firebase.firestore.FieldValue.increment(1),
        lastFoundAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Update user's find count
      await usersRef.doc(user.uid).update({
        geocacheFinds: firebase.firestore.FieldValue.increment(1)
      });
    }
    
    // Update geocache items
    if (logData.itemsTaken && logData.itemsTaken.length > 0) {
      // Remove taken items
      await updateGeocacheItems(geocacheId, logData.itemsTaken, 'remove');
    }
    
    if (logData.itemsLeft && logData.itemsLeft.length > 0) {
      // Add new items
      await updateGeocacheItems(geocacheId, logData.itemsLeft, 'add');
    }
    
    console.log('Geocache find logged successfully');
    return true;
  } catch (error) {
    console.error('Error logging geocache find:', error);
    return false;
  }
}

// Update geocache items
async function updateGeocacheItems(geocacheId, items, action) {
  try {
    const geocacheDoc = await geocachesRef.doc(geocacheId).get();
    
    if (!geocacheDoc.exists) {
      console.error('Geocache does not exist');
      return false;
    }
    
    const geocacheData = geocacheDoc.data();
    let currentItems = geocacheData.items || [];
    
    if (action === 'remove') {
      // Remove items
      currentItems = currentItems.filter(item => !items.includes(item));
    } else if (action === 'add') {
      // Add items
      currentItems = [...currentItems, ...items];
    }
    
    // Update geocache
    await geocachesRef.doc(geocacheId).update({
      items: currentItems
    });
    
    console.log('Geocache items updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating geocache items:', error);
    return false;
  }
}

// Get geocache find logs
async function getGeocacheFindLogs(geocacheId) {
  try {
    const snapshot = await db.collection('geocacheFinds')
      .where('geocacheId', '==', geocacheId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const logs = [];
    snapshot.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return logs;
  } catch (error) {
    console.error('Error getting geocache find logs:', error);
    return [];
  }
}

// Get user's geocache finds
async function getUserGeocacheFinds(userId) {
  if (!userId) {
    const user = authModule.getCurrentUser();
    if (!user) {
      console.error('No user ID provided and no user signed in');
      return [];
    }
    userId = user.uid;
  }
  
  try {
    const snapshot = await db.collection('geocacheFinds')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const finds = [];
    snapshot.forEach(doc => {
      finds.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return finds;
  } catch (error) {
    console.error('Error getting user geocache finds:', error);
    return [];
  }
}

// Render geocache details
function renderGeocacheDetails(geocacheId, container) {
  if (!container) return;
  
  // Clear container
  container.innerHTML = '<h3>Geocache Details</h3>';
  
  // Load geocache details
  getGeocache(geocacheId).then(geocache => {
    if (!geocache) {
      container.innerHTML += '<p>Geocache not found</p>';
      return;
    }
    
    // Format date
    let createdDate = 'Unknown date';
    if (geocache.createdAt) {
      if (typeof geocache.createdAt === 'string') {
        createdDate = new Date(geocache.createdAt).toLocaleDateString();
      } else if (geocache.createdAt.toDate) {
        createdDate = geocache.createdAt.toDate().toLocaleDateString();
      }
    }
    
    // Create details section
    const detailsSection = document.createElement('div');
    detailsSection.className = 'geocache-details';
    detailsSection.innerHTML = `
      <div class="geocache-header">
        <h4>${geocache.title}</h4>
        <div class="geocache-meta">
          <span class="geocache-difficulty">Difficulty: ${'★'.repeat(geocache.difficulty)}</span>
          <span class="geocache-size">Size: ${geocache.size}</span>
        </div>
      </div>
      <p class="geocache-description">${geocache.description}</p>
      <div class="geocache-hint">
        <h5>Hint (click to reveal)</h5>
        <p class="hint-text hidden">${geocache.hint}</p>
      </div>
      <div class="geocache-stats">
        <span>Found ${geocache.findCount} times</span>
        <span>Created on ${createdDate}</span>
      </div>
    `;
    
    // Add hint reveal functionality
    const hintTitle = detailsSection.querySelector('.geocache-hint h5');
    const hintText = detailsSection.querySelector('.hint-text');
    
    hintTitle.addEventListener('click', () => {
      hintText.classList.toggle('hidden');
    });
    
    container.appendChild(detailsSection);
    
    // Create find log form for authenticated users
    if (authModule.isAuthenticated()) {
      const findLogForm = document.createElement('form');
      findLogForm.className = 'find-log-form';
      findLogForm.innerHTML = `
        <h4>Log Your Find</h4>
        <div class="form-group">
          <label for="log-text-${geocacheId}">Your Log</label>
          <textarea id="log-text-${geocacheId}" placeholder="Share your experience..." rows="2" required></textarea>
        </div>
        <div class="form-group">
          <label>Items in Cache:</label>
          <ul class="geocache-items">
            ${geocache.items.map(item => `
              <li>
                <span>${item}</span>
                <input type="checkbox" class="item-take" data-item="${item}">
                <label>Take</label>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="form-group">
          <label for="items-left-${geocacheId}">Items to Leave:</label>
          <input type="text" id="items-left-${geocacheId}" placeholder="Separate items with commas">
        </div>
        <button type="submit" class="neon-button">Log Find</button>
      `;
      
      findLogForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Get form values
        const logText = document.getElementById(`log-text-${geocacheId}`).value;
        
        // Get items taken
        const itemsTaken = [];
        findLogForm.querySelectorAll('.item-take:checked').forEach(checkbox => {
          itemsTaken.push(checkbox.dataset.item);
        });
        
        // Get items left
        const itemsLeftInput = document.getElementById(`items-left-${geocacheId}`).value;
        const itemsLeft = itemsLeftInput.split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);
        
        // Log find
        const success = await findGeocache(geocacheId, {
          logText,
          itemsTaken,
          itemsLeft
        });
        
        if (success) {
          // Reload geocache details
          renderGeocacheDetails(geocacheId, container);
        }
      });
      
      container.appendChild(findLogForm);
    }
    
    // Load and display find logs
    getGeocacheFindLogs(geocacheId).then(logs => {
      const logsSection = document.createElement('div');
      logsSection.className = 'geocache-logs';
      logsSection.innerHTML = '<h4>Recent Logs</h4>';
      
      if (logs.length === 0) {
        logsSection.innerHTML += '<p>No logs yet. Be the first to find this geocache!</p>';
      } else {
        const logsList = document.createElement('ul');
        logsList.className = 'logs-list';
        
        logs.forEach(log => {
          // Format date
          let logDate = 'Unknown date';
          if (log.createdAt) {
            if (typeof log.createdAt === 'string') {
              logDate = new Date(log.createdAt).toLocaleDateString();
            } else if (log.createdAt.toDate) {
              logDate = log.createdAt.toDate().toLocaleDateString();
            }
          }
          
          const logItem = document.createElement('li');
          logItem.className = 'log-item';
          logItem.innerHTML = `
            <div class="log-header">
              <div class="log-user">
                ${log.userPhotoURL ? `<img src="${log.userPhotoURL}" alt="${log.userDisplayName}" class="log-avatar">` : ''}
                <span>${log.userDisplayName}</span>
              </div>
              <div class="log-date">${logDate}</div>
            </div>
            <p class="log-text">${log.logText}</p>
            ${log.itemsTaken && log.itemsTaken.length > 0 ? `
              <div class="log-items">
                <span class="items-taken">Took: ${log.itemsTaken.join(', ')}</span>
              </div>
            ` : ''}
            ${log.itemsLeft && log.itemsLeft.length > 0 ? `
              <div class="log-items">
                <span class="items-left">Left: ${log.itemsLeft.join(', ')}</span>
              </div>
            ` : ''}
          `;
          
          logsList.appendChild(logItem);
        });
        
        logsSection.appendChild(logsList);
      }
      
      container.appendChild(logsSection);
    });
  });
}

// Export functions for use in other modules
window.geocachingModule = {
  initGeocaching,
  createGeocache,
  getGeocache,
  findGeocache,
  updateGeocacheItems,
  getGeocacheFindLogs,
  getUserGeocacheFinds,
  renderGeocacheDetails
};
