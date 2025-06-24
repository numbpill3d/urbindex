// Real Data Integration for Urbindex

// Load real announcements from Firebase
function loadRealAnnouncements() {
    const announcementsList = document.getElementById('announcements-list');
    if (!announcementsList || !db) return;

    db.collection('announcements')
        .orderBy('createdAt', 'desc')
        .limit(3)
        .onSnapshot(snapshot => {
            announcementsList.innerHTML = '';
            
            if (snapshot.empty) {
                announcementsList.innerHTML = '<div class="no-data">No announcements available</div>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('div');
                item.className = 'announcement-item';
                
                const date = data.createdAt ? data.createdAt.toDate() : new Date();
                const timeAgo = getTimeAgo(date);
                
                item.innerHTML = `
                    <div class="announcement-header">
                        <span class="announcement-badge ${data.type || 'new'}">${data.type || 'NEW'}</span>
                        <span class="announcement-date">${timeAgo}</span>
                    </div>
                    <h4>${data.title || 'Announcement'}</h4>
                    <p>${data.content || 'No content available'}</p>
                `;
                
                announcementsList.appendChild(item);
            });
        }, error => {
            console.error('Error loading announcements:', error);
            announcementsList.innerHTML = '<div class="error-message">Failed to load announcements</div>';
        });
}

// Load real activity feed from locations
function loadRealActivityFeed() {
    const feedList = document.getElementById('activity-feed-list');
    if (!feedList || !db) return;

    db.collection('locations')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            feedList.innerHTML = '';
            
            if (snapshot.empty) {
                feedList.innerHTML = '<li class="no-data">No recent activity</li>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('li');
                item.className = 'feed-item';
                
                const date = data.createdAt ? data.createdAt.toDate() : new Date();
                const timeAgo = getTimeAgo(date);
                
                item.innerHTML = `
                    <div class="feed-item-header">
                        <span class="feed-user">${data.createdBy || 'Anonymous'}</span>
                        <span class="feed-time">${timeAgo}</span>
                    </div>
                    <div class="feed-content">Added new location: <strong>${data.name || 'Unnamed Location'}</strong></div>
                    <div class="feed-meta">
                        <span class="risk-indicator risk-${data.riskLevel || 'unknown'}">${getRiskLabel(data.riskLevel)}</span>
                        <button class="feed-action-btn" onclick="viewLocation('${doc.id}')">View</button>
                    </div>
                `;
                
                feedList.appendChild(item);
            });
        }, error => {
            console.error('Error loading activity feed:', error);
            feedList.innerHTML = '<li class="error-message">Failed to load activity</li>';
        });
}

// Load real online users
function loadRealOnlineUsers() {
    const onlineUsersList = document.getElementById('online-users-list');
    if (!onlineUsersList || !db) return;

    db.collection('users')
        .where('online', '==', true)
        .where('lastSeen', '>', new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
        .onSnapshot(snapshot => {
            const users = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                users.push(data.displayName || 'Anonymous Explorer');
            });
            
            if (users.length === 0) {
                onlineUsersList.textContent = 'No users currently online';
            } else {
                onlineUsersList.textContent = users.map(user => `🟢 ${user}`).join(' • ');
            }
        }, error => {
            console.error('Error loading online users:', error);
            onlineUsersList.textContent = 'Unable to load online users';
        });
}

// Load real forum posts
function loadRealForumPosts() {
    const forumPostsList = document.getElementById('forum-posts-list');
    if (!forumPostsList || !db) return;

    db.collection('forumPosts')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .onSnapshot(snapshot => {
            forumPostsList.innerHTML = '';
            
            if (snapshot.empty) {
                forumPostsList.innerHTML = '<li class="no-data">No forum posts available</li>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('li');
                item.className = 'forum-item';
                
                const date = data.createdAt ? data.createdAt.toDate() : new Date();
                const timeAgo = getTimeAgo(date);
                
                item.innerHTML = `
                    <div class="forum-post-header">
                        <h4 class="forum-post-title">${data.title || 'Untitled Post'}</h4>
                        <span class="forum-post-category">${data.category || 'General'}</span>
                    </div>
                    <div class="forum-post-meta">
                        <span class="forum-post-author">${data.author || 'Anonymous'}</span>
                        <span class="forum-post-time">${timeAgo}</span>
                        <span class="forum-post-replies">${data.replyCount || 0} replies</span>
                    </div>
                    <p class="forum-post-preview">${(data.content || 'No content available').substring(0, 150)}...</p>
                `;
                
                forumPostsList.appendChild(item);
            });
        }, error => {
            console.error('Error loading forum posts:', error);
            forumPostsList.innerHTML = '<li class="error-message">Failed to load forum posts</li>';
        });
}

// Load real user locations
function loadRealUserLocations() {
    const locationsList = document.getElementById('my-locations-list');
    if (!locationsList || !db || !window.authModule?.getCurrentUser()) return;

    const user = window.authModule.getCurrentUser();
    
    db.collection('locations')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            locationsList.innerHTML = '';
            
            if (snapshot.empty) {
                locationsList.innerHTML = '<li class="no-data">No locations added yet</li>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const item = document.createElement('li');
                item.className = 'location-item';
                
                const date = data.createdAt ? data.createdAt.toDate() : new Date();
                const timeAgo = getTimeAgo(date);
                
                item.innerHTML = `
                    <div class="location-header">
                        <h4 class="location-name">${data.name || 'Unnamed Location'}</h4>
                        <span class="risk-indicator risk-${data.riskLevel || 'unknown'}">${getRiskLabel(data.riskLevel)}</span>
                    </div>
                    <p class="location-description">${data.description || 'No description available'}</p>
                    <div class="location-meta">
                        <span class="location-date">Added ${timeAgo}</span>
                        <span class="location-rating">${getStarRating(data.rating || 0)}</span>
                        <div class="location-actions">
                            <button class="location-action-btn" onclick="viewLocation('${doc.id}')">View</button>
                            <button class="location-action-btn" onclick="editLocation('${doc.id}')">Edit</button>
                        </div>
                    </div>
                `;
                
                locationsList.appendChild(item);
            });
        }, error => {
            console.error('Error loading user locations:', error);
            locationsList.innerHTML = '<li class="error-message">Failed to load locations</li>';
        });
}

// Load real user profile data
function loadRealUserProfile() {
    if (!window.authModule?.getCurrentUser() || !db) return;

    const user = window.authModule.getCurrentUser();
    
    // Load user document
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            
            // Update profile elements
            const profileName = document.getElementById('profile-name');
            const userName = document.getElementById('user-name');
            const locationsCount = document.getElementById('locations-count');
            const territoriesCount = document.getElementById('territories-count');
            const userScore = document.getElementById('user-score');
            
            if (profileName) profileName.textContent = userData.displayName || user.displayName || 'Explorer';
            if (userName) userName.textContent = userData.displayName || user.displayName || 'Explorer';
            if (locationsCount) locationsCount.textContent = userData.locationsCount || 0;
            if (territoriesCount) territoriesCount.textContent = userData.territoriesCount || 0;
            if (userScore) userScore.textContent = userData.score || 0;
        }
    }).catch(error => {
        console.error('Error loading user profile:', error);
    });
}

// Utility functions
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

function getRiskLabel(riskLevel) {
    const labels = {
        low: 'Low Risk',
        moderate: 'Moderate Risk',
        high: 'High Risk',
        extreme: 'Extreme Risk'
    };
    return labels[riskLevel] || 'Unknown Risk';
}

function getStarRating(rating) {
    const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    return stars;
}

function viewLocation(locationId) {
    // Switch to map view and show location
    const mapBtn = document.querySelector('[data-view="map"]');
    if (mapBtn) mapBtn.click();
    
    // Load location details and show on map
    if (window.mapModule?.showLocation) {
        window.mapModule.showLocation(locationId);
    }
}

function editLocation(locationId) {
    // Open location modal for editing
    const modal = document.getElementById('location-modal');
    if (modal && window.locationsModule?.editLocation) {
        window.locationsModule.editLocation(locationId);
    }
}

// Initialize real data loading
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to be ready
    if (typeof firebase !== 'undefined' && db) {
        loadRealAnnouncements();
        loadRealActivityFeed();
        loadRealOnlineUsers();
        loadRealForumPosts();
        
        // Load user-specific data when authenticated
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                loadRealUserLocations();
                loadRealUserProfile();
            }
        });
    } else {
        console.warn('Firebase not available, using placeholder data');
    }
});

// Export functions for use in other modules
window.realDataModule = {
    loadRealAnnouncements,
    loadRealActivityFeed,
    loadRealOnlineUsers,
    loadRealForumPosts,
    loadRealUserLocations,
    loadRealUserProfile
};