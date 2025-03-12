// Urbindex - Territories and Crews Module

// DOM Elements
const crewsList = document.getElementById('crews-list');
const territoriesList = document.getElementById('territories-list');

// Initialize territories functionality
function initTerritories() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    loadUserCrewInfo(user.uid);
    loadUserTerritories(user.uid);
  });
  
  document.addEventListener('user-signed-out', () => {
    clearCrewInfo();
    clearTerritoriesList();
  });
  
  // Set up crew creation form if it exists
  const crewForm = document.getElementById('crew-form');
  if (crewForm) {
    crewForm.addEventListener('submit', createCrew);
  }
  
  // Set up join crew form if it exists
  const joinCrewForm = document.getElementById('join-crew-form');
  if (joinCrewForm) {
    joinCrewForm.addEventListener('submit', joinCrew);
  }
}

// Load user's crew information
async function loadUserCrewInfo(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  try {
    // Check if user is in a crew
    const crewMemberSnapshot = await crewMembersRef
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (crewMemberSnapshot.empty) {
      // User is not in a crew
      showNoCrew();
      return;
    }
    
    // Get crew member data
    const crewMemberDoc = crewMemberSnapshot.docs[0];
    const crewMemberData = crewMemberDoc.data();
    const crewId = crewMemberData.crewId;
    
    // Get crew data
    const crewDoc = await crewsRef.doc(crewId).get();
    
    if (!crewDoc.exists) {
      console.error('Crew does not exist');
      showNoCrew();
      return;
    }
    
    const crewData = crewDoc.data();
    
    // Display crew info
    displayCrewInfo(crewId, crewData, crewMemberData.role);
    
    // Load crew members
    loadCrewMembers(crewId);
    
    // Load crew territories
    loadCrewTerritories(crewId);
    
    // Update user document with crew ID if not already set
    const userDoc = await usersRef.doc(userId).get();
    if (userDoc.exists && userDoc.data().crewId !== crewId) {
      await usersRef.doc(userId).update({
        crewId: crewId
      });
    }
    
    return {
      crewId,
      ...crewData,
      role: crewMemberData.role
    };
  } catch (error) {
    console.error('Error loading user crew info:', error);
    showNoCrew();
    return null;
  }
}

// Display crew information
function displayCrewInfo(crewId, crewData, userRole) {
  const crewInfoContainer = document.getElementById('crew-info');
  if (!crewInfoContainer) return;
  
  // Show crew info section
  crewInfoContainer.classList.remove('hidden');
  
  // Hide no crew message
  const noCrewMessage = document.getElementById('no-crew-message');
  if (noCrewMessage) {
    noCrewMessage.classList.add('hidden');
  }
  
  // Update crew info
  crewInfoContainer.innerHTML = `
    <div class="crew-header" style="background-color: ${crewData.color || '#9d4edd'}">
      <div class="crew-icon">${crewData.icon || ''}</div>
      <div class="crew-details">
        <h2>${crewData.name}</h2>
        <p>${crewData.description || 'No description'}</p>
        <span class="crew-role">Your Role: ${userRole || 'Member'}</span>
      </div>
    </div>
    <div class="crew-stats">
      <div class="crew-stat">
        <span class="crew-stat-value" id="crew-members-count">0</span>
        <span class="crew-stat-label">Members</span>
      </div>
      <div class="crew-stat">
        <span class="crew-stat-value" id="crew-territories-count">0</span>
        <span class="crew-stat-label">Territories</span>
      </div>
      <div class="crew-stat">
        <span class="crew-stat-value" id="crew-score">0</span>
        <span class="crew-stat-label">Score</span>
      </div>
    </div>
    <div class="crew-actions">
      ${userRole === 'admin' ? `
        <button id="edit-crew-btn" class="neon-button" data-crew-id="${crewId}">Edit Crew</button>
        <button id="invite-member-btn" class="neon-button" data-crew-id="${crewId}">Invite Member</button>
      ` : ''}
      <button id="leave-crew-btn" class="neon-button danger" data-crew-id="${crewId}">Leave Crew</button>
    </div>
    <div class="crew-members">
      <h3>Members</h3>
      <ul id="crew-members-list" class="members-list"></ul>
    </div>
  `;
  
  // Set up event listeners for crew actions
  const editCrewBtn = document.getElementById('edit-crew-btn');
  if (editCrewBtn) {
    editCrewBtn.addEventListener('click', () => openEditCrewModal(crewId));
  }
  
  const inviteMemberBtn = document.getElementById('invite-member-btn');
  if (inviteMemberBtn) {
    inviteMemberBtn.addEventListener('click', () => openInviteMemberModal(crewId));
  }
  
  const leaveCrewBtn = document.getElementById('leave-crew-btn');
  if (leaveCrewBtn) {
    leaveCrewBtn.addEventListener('click', () => leaveCrew(crewId));
  }
}

// Show message when user is not in a crew
function showNoCrew() {
  const crewInfoContainer = document.getElementById('crew-info');
  if (crewInfoContainer) {
    crewInfoContainer.classList.add('hidden');
  }
  
  const noCrewMessage = document.getElementById('no-crew-message');
  if (noCrewMessage) {
    noCrewMessage.classList.remove('hidden');
    noCrewMessage.innerHTML = `
      <p>You are not part of any crew yet.</p>
      <div class="crew-actions">
        <button id="create-crew-btn" class="neon-button">Create a Crew</button>
        <button id="join-crew-btn" class="neon-button">Join a Crew</button>
      </div>
    `;
    
    // Set up event listeners
    const createCrewBtn = document.getElementById('create-crew-btn');
    if (createCrewBtn) {
      createCrewBtn.addEventListener('click', openCreateCrewModal);
    }
    
    const joinCrewBtn = document.getElementById('join-crew-btn');
    if (joinCrewBtn) {
      joinCrewBtn.addEventListener('click', openJoinCrewModal);
    }
  }
}

// Clear crew information
function clearCrewInfo() {
  const crewInfoContainer = document.getElementById('crew-info');
  if (crewInfoContainer) {
    crewInfoContainer.classList.add('hidden');
  }
  
  const noCrewMessage = document.getElementById('no-crew-message');
  if (noCrewMessage) {
    noCrewMessage.classList.add('hidden');
  }
}

// Load crew members
async function loadCrewMembers(crewId) {
  try {
    const snapshot = await crewMembersRef
      .where('crewId', '==', crewId)
      .get();
    
    const membersList = document.getElementById('crew-members-list');
    if (!membersList) return;
    
    // Clear the list
    membersList.innerHTML = '';
    
    if (snapshot.empty) {
      membersList.innerHTML = '<li class="empty-message">No members found</li>';
      return;
    }
    
    // Get user IDs
    const userIds = snapshot.docs.map(doc => doc.data().userId);
    
    // Get user data
    const usersSnapshot = await usersRef
      .where(firebase.firestore.FieldPath.documentId(), 'in', userIds)
      .get();
    
    const users = {};
    usersSnapshot.forEach(doc => {
      users[doc.id] = doc.data();
    });
    
    // Create member items
    snapshot.forEach(doc => {
      const memberData = doc.data();
      const userData = users[memberData.userId] || {};
      
      const listItem = document.createElement('li');
      listItem.className = 'member-item';
      
      listItem.innerHTML = `
        <img src="${userData.photoURL || 'images/default-avatar.png'}" alt="${userData.displayName || 'Unknown User'}" class="member-avatar">
        <div class="member-info">
          <span class="member-name">${userData.displayName || 'Unknown User'}</span>
          <span class="member-role">${memberData.role || 'Member'}</span>
        </div>
      `;
      
      membersList.appendChild(listItem);
    });
    
    // Update member count
    const membersCount = document.getElementById('crew-members-count');
    if (membersCount) {
      membersCount.textContent = snapshot.size;
    }
  } catch (error) {
    console.error('Error loading crew members:', error);
  }
}

// Load crew territories
async function loadCrewTerritories(crewId) {
  try {
    // Get all territories claimed by crew members
    const crewMembersSnapshot = await crewMembersRef
      .where('crewId', '==', crewId)
      .get();
    
    if (crewMembersSnapshot.empty) {
      return;
    }
    
    const memberIds = crewMembersSnapshot.docs.map(doc => doc.data().userId);
    
    // Get territories for these members
    const territoriesSnapshot = await territoriesRef
      .where('userId', 'in', memberIds)
      .get();
    
    // Update territories count
    const territoriesCount = document.getElementById('crew-territories-count');
    if (territoriesCount) {
      territoriesCount.textContent = territoriesSnapshot.size;
    }
    
    // Calculate crew score
    let crewScore = 0;
    territoriesSnapshot.forEach(doc => {
      const territoryData = doc.data();
      crewScore += territoryData.points || 0;
    });
    
    // Add base score (10 points per territory)
    crewScore += territoriesSnapshot.size * 10;
    
    // Update crew score
    const crewScoreElement = document.getElementById('crew-score');
    if (crewScoreElement) {
      crewScoreElement.textContent = crewScore;
    }
    
    // Display territories on map if map module is available
    if (typeof mapModule !== 'undefined' && mapModule.displayCrewTerritories) {
      const territoryIds = territoriesSnapshot.docs.map(doc => doc.data().locationId);
      mapModule.displayCrewTerritories(territoryIds, crewId);
    }
  } catch (error) {
    console.error('Error loading crew territories:', error);
  }
}

// Load user's territories
async function loadUserTerritories(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  try {
    const snapshot = await territoriesRef
      .where('userId', '==', userId)
      .get();
    
    if (!territoriesList) return;
    
    // Clear the list
    territoriesList.innerHTML = '';
    
    if (snapshot.empty) {
      territoriesList.innerHTML = `
        <div class="empty-state">
          <p>You haven't claimed any territories yet.</p>
          <p>Visit locations and claim them to expand your territory!</p>
        </div>
      `;
      return;
    }
    
    // Get location IDs
    const locationIds = snapshot.docs.map(doc => doc.data().locationId);
    
    // Get location data
    const locationsSnapshot = await locationsRef
      .where(firebase.firestore.FieldPath.documentId(), 'in', locationIds)
      .get();
    
    const locations = {};
    locationsSnapshot.forEach(doc => {
      locations[doc.id] = {
        id: doc.id,
        ...doc.data()
      };
    });
    
    // Create territory items
    snapshot.forEach(doc => {
      const territoryData = doc.data();
      const locationData = locations[territoryData.locationId] || {};
      
      const listItem = document.createElement('li');
      listItem.className = 'list-item territory-item';
      
      // Format date
      let claimedDate = 'Unknown date';
      if (territoryData.claimedAt) {
        if (typeof territoryData.claimedAt === 'string') {
          claimedDate = new Date(territoryData.claimedAt).toLocaleDateString();
        } else if (territoryData.claimedAt.toDate) {
          claimedDate = territoryData.claimedAt.toDate().toLocaleDateString();
        }
      }
      
      // Calculate points
      const points = territoryData.points || 0;
      
      listItem.innerHTML = `
        <div class="territory-header">
          <h3>${locationData.name || 'Unknown Location'}</h3>
          <div class="territory-points">${points} points</div>
        </div>
        <p class="territory-description">${locationData.description || 'No description'}</p>
        <div class="territory-meta">
          <span class="territory-date">Claimed: ${claimedDate}</span>
          <button class="view-on-map-btn neon-button" data-id="${territoryData.locationId}">View on Map</button>
        </div>
      `;
      
      // Add click event to show on map
      const viewOnMapBtn = listItem.querySelector('.view-on-map-btn');
      if (viewOnMapBtn && locationData.coordinates) {
        viewOnMapBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          // Show the map view
          document.getElementById('map-view-btn').click();
          
          // Center map on this location
          if (typeof mapModule !== 'undefined' && mapModule.map) {
            const lat = locationData.coordinates.latitude || locationData.coordinates.lat;
            const lng = locationData.coordinates.longitude || locationData.coordinates.lng;
            
            mapModule.map.setView([lat, lng], 16);
            
            // Open the popup if marker exists
            if (mapModule.locationMarkers && mapModule.locationMarkers[territoryData.locationId]) {
              mapModule.locationMarkers[territoryData.locationId].openPopup();
            }
          }
        });
      }
      
      territoriesList.appendChild(listItem);
    });
  } catch (error) {
    console.error('Error loading user territories:', error);
  }
}

// Clear territories list
function clearTerritoriesList() {
  if (territoriesList) {
    territoriesList.innerHTML = '';
  }
}

// Create a new crew
async function createCrew(e) {
  e.preventDefault();
  
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to create a crew');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  // Get form values
  const name = document.getElementById('crew-name').value;
  const description = document.getElementById('crew-description').value;
  const color = document.getElementById('crew-color').value;
  const icon = document.getElementById('crew-icon').value;
  
  try {
    // Create crew document
    const crewRef = await crewsRef.add({
      name,
      description,
      color,
      icon,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      memberCount: 1
    });
    
    // Add user as admin member
    await crewMembersRef.add({
      crewId: crewRef.id,
      userId: user.uid,
      role: 'admin',
      joinedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update user document
    await usersRef.doc(user.uid).update({
      crewId: crewRef.id
    });
    
    console.log('Crew created successfully');
    
    // Close modal if it exists
    const modal = document.getElementById('create-crew-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    
    // Reload crew info
    loadUserCrewInfo(user.uid);
    
    return true;
  } catch (error) {
    console.error('Error creating crew:', error);
    alert('Error creating crew. Please try again.');
    return false;
  }
}

// Join an existing crew
async function joinCrew(e) {
  e.preventDefault();
  
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to join a crew');
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  // Get form values
  const crewId = document.getElementById('crew-id').value;
  
  try {
    // Check if crew exists
    const crewDoc = await crewsRef.doc(crewId).get();
    
    if (!crewDoc.exists) {
      alert('Crew not found. Please check the ID and try again.');
      return false;
    }
    
    // Check if user is already in a crew
    const crewMemberSnapshot = await crewMembersRef
      .where('userId', '==', user.uid)
      .limit(1)
      .get();
    
    if (!crewMemberSnapshot.empty) {
      alert('You are already in a crew. Please leave your current crew first.');
      return false;
    }
    
    // Add user as member
    await crewMembersRef.add({
      crewId,
      userId: user.uid,
      role: 'member',
      joinedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Update user document
    await usersRef.doc(user.uid).update({
      crewId
    });
    
    // Update crew member count
    await crewsRef.doc(crewId).update({
      memberCount: firebase.firestore.FieldValue.increment(1)
    });
    
    console.log('Joined crew successfully');
    
    // Close modal if it exists
    const modal = document.getElementById('join-crew-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    
    // Reload crew info
    loadUserCrewInfo(user.uid);
    
    return true;
  } catch (error) {
    console.error('Error joining crew:', error);
    alert('Error joining crew. Please try again.');
    return false;
  }
}

// Leave a crew
async function leaveCrew(crewId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to leave a crew');
    return;
  }
  
  if (!confirm('Are you sure you want to leave this crew?')) {
    return;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Find user's crew membership
    const crewMemberSnapshot = await crewMembersRef
      .where('crewId', '==', crewId)
      .where('userId', '==', user.uid)
      .limit(1)
      .get();
    
    if (crewMemberSnapshot.empty) {
      console.error('User is not in this crew');
      return false;
    }
    
    const crewMemberDoc = crewMemberSnapshot.docs[0];
    const crewMemberData = crewMemberDoc.data();
    
    // Check if user is the admin and if there are other members
    if (crewMemberData.role === 'admin') {
      const otherMembersSnapshot = await crewMembersRef
        .where('crewId', '==', crewId)
        .where('userId', '!=', user.uid)
        .limit(1)
        .get();
      
      if (!otherMembersSnapshot.empty) {
        // There are other members, ask if user wants to transfer ownership
        if (confirm('You are the crew admin. Do you want to transfer ownership to another member before leaving?')) {
          alert('Please select a new admin from your crew members.');
          return false;
        }
      }
    }
    
    // Delete crew membership
    await crewMemberDoc.ref.delete();
    
    // Update user document
    await usersRef.doc(user.uid).update({
      crewId: null
    });
    
    // Update crew member count
    await crewsRef.doc(crewId).update({
      memberCount: firebase.firestore.FieldValue.increment(-1)
    });
    
    // Check if there are no more members
    const remainingMembersSnapshot = await crewMembersRef
      .where('crewId', '==', crewId)
      .limit(1)
      .get();
    
    if (remainingMembersSnapshot.empty) {
      // No more members, delete the crew
      await crewsRef.doc(crewId).delete();
    }
    
    console.log('Left crew successfully');
    
    // Show no crew message
    showNoCrew();
    
    return true;
  } catch (error) {
    console.error('Error leaving crew:', error);
    alert('Error leaving crew. Please try again.');
    return false;
  }
}

// Open create crew modal
function openCreateCrewModal() {
  const modalHtml = `
    <div id="create-crew-modal" class="modal active">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h2>Create a New Crew</h2>
        <form id="crew-form">
          <div class="form-group">
            <label for="crew-name">Crew Name</label>
            <input type="text" id="crew-name" required>
          </div>
          <div class="form-group">
            <label for="crew-description">Description</label>
            <textarea id="crew-description" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label for="crew-color">Crew Color</label>
            <input type="color" id="crew-color" value="#9d4edd">
          </div>
          <div class="form-group">
            <label for="crew-icon">Crew Icon (Emoji or Symbol)</label>
            <input type="text" id="crew-icon" placeholder="🏴 🔥 ⚡ 🌙 etc.">
          </div>
          <button type="submit" class="neon-button">Create Crew</button>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Set up event listeners
  const modal = document.getElementById('create-crew-modal');
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  });
  
  const crewForm = document.getElementById('crew-form');
  crewForm.addEventListener('submit', (e) => {
    createCrew(e);
    setTimeout(() => modal.remove(), 300);
  });
}

// Open join crew modal
function openJoinCrewModal() {
  const modalHtml = `
    <div id="join-crew-modal" class="modal active">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h2>Join a Crew</h2>
        <form id="join-crew-form">
          <div class="form-group">
            <label for="crew-id">Crew ID</label>
            <input type="text" id="crew-id" required placeholder="Enter the crew ID provided by the crew admin">
          </div>
          <button type="submit" class="neon-button">Join Crew</button>
        </form>
      </div>
    </div>
  `;
  
  // Add modal to body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Set up event listeners
  const modal = document.getElementById('join-crew-modal');
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  });
  
  const joinCrewForm = document.getElementById('join-crew-form');
  joinCrewForm.addEventListener('submit', (e) => {
    joinCrew(e);
    setTimeout(() => modal.remove(), 300);
  });
}

// Open edit crew modal
function openEditCrewModal(crewId) {
  // Get crew data
  crewsRef.doc(crewId).get().then(doc => {
    if (!doc.exists) {
      console.error('Crew not found');
      return;
    }
    
    const crewData = doc.data();
    
    const modalHtml = `
      <div id="edit-crew-modal" class="modal active">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Edit Crew</h2>
          <form id="edit-crew-form">
            <div class="form-group">
              <label for="edit-crew-name">Crew Name</label>
              <input type="text" id="edit-crew-name" value="${crewData.name}" required>
            </div>
            <div class="form-group">
              <label for="edit-crew-description">Description</label>
              <textarea id="edit-crew-description" rows="3">${crewData.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label for="edit-crew-color">Crew Color</label>
              <input type="color" id="edit-crew-color" value="${crewData.color || '#9d4edd'}">
            </div>
            <div class="form-group">
              <label for="edit-crew-icon">Crew Icon (Emoji or Symbol)</label>
              <input type="text" id="edit-crew-icon" value="${crewData.icon || ''}" placeholder="🏴 🔥 ⚡ 🌙 etc.">
            </div>
            <div class="form-group">
              <label>Crew ID (for inviting members)</label>
              <div class="crew-id-display">${crewId}</div>
            </div>
            <button type="submit" class="neon-button">Save Changes</button>
          </form>
        </div>
      </div>
    `;
    
    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
    
    // Set up event listeners
    const modal = document.getElementById('edit-crew-modal');
    const closeBtn = modal.querySelector('.close-modal');
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('active');
      setTimeout(() => modal.remove(), 300);
    });
    
    const editCrewForm = document.getElementById('edit-crew-form');
    editCrewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Get form values
      const name = document.getElementById('edit-crew-name').value;
      const description = document.getElementById('edit-crew-description').value;
      const color = document.getElementById('edit-crew-color').value;
      const icon = document.getElementById('edit-crew-icon').value;
      
      // Update crew
      crewsRef.doc(crewId).update({
        name,
        description,
        color,
        icon,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        console.log('Crew updated successfully');
        
        // Close modal
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 300);
        
        // Reload crew info
        const user = authModule.getCurrentUser();
        if (user) {
          loadUserCrewInfo(user.uid);
        }
      }).catch(error => {
        console.error('Error updating crew:', error);
        alert('Error updating crew. Please try again.');
      });
    });
  }).catch(error => {
    console.error('Error getting crew data:', error);
  });
}

// Open invite member modal
function openInviteMemberModal(crewId) {
  const modalHtml = `
    <div id="invite-member-modal" class="modal active">
      <div class="modal-content">
        <span class="close-modal">&times;</span>
        <h2>Invite Members</h2>
        <p>Share this crew ID with people you want to invite:</p>
        <div class="crew-id-container">
          <code class="crew-id">${crewId}</code>
          <button id="copy-crew-id" class="neon-button">Copy</button>
        </div>
        <p class="invite-instructions">
          They can join your crew by:
          <ol>
            <li>Going to the Crews section</li>
            <li>Clicking "Join a Crew"</li>
            <li>Entering this Crew ID</li>
          </ol>
        </p>
      </div>
    </div>
  `;
  
  // Add modal to body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Set up event listeners
  const modal = document.getElementById('invite-member-modal');
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.addEventListener('click', () => {
    modal.classList.remove('active');
    setTimeout(() => modal.remove(), 300);
  });
  
  const copyBtn = document.getElementById('copy-crew-id');
  copyBtn.addEventListener('click', () => {
    const crewIdElement = document.querySelector('.crew-id');
    
    // Create a temporary textarea element to copy from
    const textarea = document.createElement('textarea');
    textarea.value = crewIdElement.textContent;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Show copied message
    copyBtn.textContent = 'Copie
