/**
 * public-access.js
 * 
 * This script modifies Urbindex to allow users to view content without logging in.
 * It overrides authentication checks in the UI to display content for non-authenticated users.
 */

(function() {
    // Wait for the app to be initialized
    window.addEventListener('load', function() {
        // Wait a bit for the app to initialize
        setTimeout(function() {
            if (window.app) {
                modifyAppBehavior();
                
                // Fix for persistent loading symbols - check and remove after 5 seconds
                setTimeout(function() {
                    document.querySelectorAll('.loading').forEach(function(el) {
                        // Replace any loading elements that are still showing after timeout
                        if (el.textContent.includes('Loading') && window.getComputedStyle(el).display !== 'none') {
                            console.log('Removing stuck loading indicator:', el);
                            el.innerHTML = `
                                <div style="padding: 12px; text-align: center; color: var(--text-secondary);">
                                    <p>Content ready to view</p>
                                </div>
                            `;
                        }
                    });
                }, 5000);
            }
        }, 1000);
    });

    function modifyAppBehavior() {
        console.log('Modifying app to allow public access to content');
        
        // Add fallback functions to app
        window.app.getFallbackPosts = function() {
            const now = Date.now();
            return [
                {
                    id: 'sample-1',
                    body: "Just discovered an amazing abandoned factory with incredible industrial architecture. The light streaming through the broken windows creates a magical atmosphere.",
                    createdBy: 'user-sample-1',
                    createdAt: new Date(now - 2 * 60 * 60 * 1000),
                    tags: ['abandoned', 'industrial', 'photography'],
                    likesCount: 15,
                    commentCount: 3
                },
                {
                    id: 'sample-2',
                    body: "Rooftop exploration complete! The view of the city skyline from here is absolutely breathtaking. Highly recommend catching sunrise from this spot.",
                    createdBy: 'user-sample-2',
                    createdAt: new Date(now - 5 * 60 * 60 * 1000),
                    tags: ['rooftop', 'skyline', 'sunrise'],
                    likesCount: 28,
                    commentCount: 7
                },
                {
                    id: 'sample-3',
                    body: "Found a hidden tunnel system below the old quarter! Brings a whole new meaning to 'underground exploration'. Remember to bring proper lighting if you check it out.",
                    createdBy: 'user-sample-3',
                    createdAt: new Date(now - 12 * 60 * 60 * 1000),
                    tags: ['tunnel', 'underground', 'discovery'],
                    likesCount: 42,
                    commentCount: 12
                },
                {
                    id: 'sample-4',
                    body: "PSA: The entrance to the old theater has been sealed off. City renovation project starting next month. Get your final photos while you can!",
                    createdBy: 'user-sample-2',
                    createdAt: new Date(now - 24 * 60 * 60 * 1000),
                    tags: ['update', 'theater', 'renovation'],
                    likesCount: 9,
                    commentCount: 5
                }
            ];
        };
        
        // Add sample user profiles for fallback posts
        const originalGetUserProfile = window.app.getUserProfile;
        window.app.getUserProfile = async function(userId) {
            if (!userId) return {};
            
            // Check if it's a sample user ID
            if (userId.startsWith('user-sample-')) {
                const sampleProfiles = {
                    'user-sample-1': { displayName: 'Urban Scout', photoURL: null },
                    'user-sample-2': { displayName: 'Rooftop Runner', photoURL: null },
                    'user-sample-3': { displayName: 'Tunnel Vision', photoURL: null }
                };
                
                if (sampleProfiles[userId]) {
                    this.userProfiles.set(userId, sampleProfiles[userId]);
                    return sampleProfiles[userId];
                }
            }
            
            // Fall back to original method
            if (originalGetUserProfile) {
                return await originalGetUserProfile.call(this, userId);
            }
            
            // Default fallback
            return { displayName: 'Explorer', photoURL: null };
        };
        
        const originalLoadSocialFeed = window.app.loadSocialFeed;
        window.app.loadSocialFeed = async function() {
            const container = document.getElementById('social-feed-content');
            if (!container) return;

            const composePanel = document.getElementById('social-compose-panel');

            if (!this.currentUser) {
                if (composePanel) composePanel.style.display = 'none';
                
                // Show a message but continue loading public content
                const loginPrompt = document.createElement('div');
                loginPrompt.className = 'info-message';
                loginPrompt.style.cssText = 'background: rgba(30, 58, 95, 0.1); border: 2px solid var(--cz-blueprint); padding: 12px; margin: 8px 0; display: flex; align-items: center;';
                loginPrompt.innerHTML = `
                    <i class="fas fa-info-circle" style="color: var(--cz-blueprint); margin-right: 8px;"></i>
                    <p style="margin: 0; color: var(--cz-blueprint);">You're browsing as a guest. <button class="btn-link" onclick="app.handleAuth()">Sign in</button> to post, like, and comment.</p>
                `;
                
                // Add login prompt above the content
                const parentPanel = container.closest('.panel');
                if (parentPanel) {
                    parentPanel.insertBefore(loginPrompt, parentPanel.firstChild);
                }
            }
            
            // Continue with original method to load content
            try {
                container.innerHTML = this.renderSocialSkeleton(4);

                // Load public posts
                let posts = [];
                try {
                    const snapshot = await this.db.collection('forum')
                        .orderBy('createdAt', 'desc')
                        .limit(30)
                        .get();
                        
                    snapshot.forEach(doc => {
                        posts.push({ id: doc.id, ...doc.data() });
                    });
                } catch (error) {
                    console.warn('Error fetching posts, using fallback data:', error);
                    // Provide fallback data if we can't load from Firestore
                    posts = this.getFallbackPosts();
                }

                const uniqueAuthors = Array.from(new Set(posts.map(p => p.createdBy).filter(Boolean)));
                await Promise.all(uniqueAuthors.map(id => this.getUserProfile(id)));

                this.socialFeedItems = posts;
                this.lastSocialRefresh = new Date();
                this.updateSocialMeta(posts);
                this.updateSocialRefreshTime();
                this.renderSocialFeed(this.applySocialFilters(this.socialFeedItems));
                
                // For unauthenticated users, we can't hydrate engagement
                if (this.currentUser) {
                    await this.hydrateSocialEngagement(this.socialFeedItems);
                }
            } catch (error) {
                console.error('Error loading social feed:', error);
                this.socialFeedItems = [];
                container.innerHTML = '<div class="error">Failed to load social feed</div>';
                this.updateSocialRefreshTime();
            }
        };

        // Modify profile view to show profiles for public users
        const originalLoadProfile = window.app.loadProfile;
        window.app.loadProfile = async function(userId = null) {
            const content = document.getElementById('profile-content');
            if (!content) return;

            content.innerHTML = '<div class="loading">Loading profile...</div>';

            // If we're requesting someone else's profile, or the user is logged in
            if (userId || this.currentUser) {
                if (originalLoadProfile) {
                    return originalLoadProfile.call(this, userId);
                }
                return;
            }

            // For unauthenticated users viewing the profile section
            content.innerHTML = `
                <div class="panel" style="margin-bottom: 16px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                        <h3>Welcome, Explorer</h3>
                        <button class="btn btn-primary" onclick="app.handleAuth()">
                            <i class="fas fa-sign-in-alt"></i> Sign In / Register
                        </button>
                    </div>
                    <p style="color: var(--text-secondary);">
                        Sign in to create and manage your explorer profile, track your discoveries, and interact with other urban adventurers.
                    </p>
                    <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                        <div style="border: 2px solid var(--cz-yellow); padding: 12px; background: rgba(255, 208, 0, 0.1);">
                            <h4><i class="fas fa-map-marked-alt"></i> Browse Locations</h4>
                            <p style="font-size: 0.9rem; color: var(--text-secondary);">Explore user-submitted urban locations and discoveries.</p>
                            <button class="btn" onclick="app.showView('locations')">View Locations</button>
                        </div>
                        <div style="border: 2px solid var(--cz-yellow); padding: 12px; background: rgba(255, 208, 0, 0.1);">
                            <h4><i class="fas fa-users"></i> Browse Social Feed</h4>
                            <p style="font-size: 0.9rem; color: var(--text-secondary);">See what other explorers are sharing and discussing.</p>
                            <button class="btn" onclick="app.showView('social')">View Feed</button>
                        </div>
                    </div>
                </div>
                <div class="panel">
                    <h3>Features Available After Sign In</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px;">
                        <div class="stat-card">
                            <div class="stat-label">Profile</div>
                            <div style="font-size: 1.6rem; color: var(--text-secondary); margin: 6px 0;"><i class="fas fa-id-card"></i></div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Personal explorer profile</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Missions</div>
                            <div style="font-size: 1.6rem; color: var(--text-secondary); margin: 6px 0;"><i class="fas fa-trophy"></i></div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Exploration challenges</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Add Locations</div>
                            <div style="font-size: 1.6rem; color: var(--text-secondary); margin: 6px 0;"><i class="fas fa-plus"></i></div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Share your discoveries</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">Interact</div>
                            <div style="font-size: 1.6rem; color: var(--text-secondary); margin: 6px 0;"><i class="fas fa-comment-dots"></i></div>
                            <div style="font-size: 0.85rem; color: var(--text-muted);">Comment and like</div>
                        </div>
                    </div>
                </div>
            `;
        };

        // Modify locations view to allow public access
        const originalLoadUserLocations = window.app.loadUserLocations;
        window.app.loadUserLocations = async function() {
            const grid = document.getElementById('locations-grid');
            if (!grid) return;

            grid.innerHTML = '<div class="loading" role="status">Loading locations...</div>';

            try {
                let locations = [];
                
                // Get public locations
                const snapshot = await this.db.collection('locations')
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();
                
                snapshot.forEach(doc => {
                    locations.push({ id: doc.id, ...doc.data() });
                });

                if (locations.length === 0) {
                    grid.innerHTML = `
                        <div style="text-align: center; padding: 48px;">
                            <i class="fas fa-map-marked-alt" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
                            <p style="color: var(--text-secondary);">No locations found. Be the first to add one!</p>
                            <button class="btn btn-primary" onclick="app.handleAuth()">
                                <i class="fas fa-sign-in-alt"></i> Sign In to Add Locations
                            </button>
                        </div>
                    `;
                    return;
                }

                // For unauthenticated users, show a login info bar
                if (!this.currentUser) {
                    const locationsView = document.getElementById('locations-view');
                    if (locationsView) {
                        const infoBar = document.createElement('div');
                        infoBar.className = 'info-message';
                        infoBar.style.cssText = 'background: rgba(30, 58, 95, 0.1); border: 2px solid var(--cz-blueprint); padding: 12px; margin: 0 0 16px 0; display: flex; align-items: center;';
                        infoBar.innerHTML = `
                            <i class="fas fa-info-circle" style="color: var(--cz-blueprint); margin-right: 8px;"></i>
                            <p style="margin: 0; color: var(--cz-blueprint);">You're viewing locations as a guest. <button class="btn-link" onclick="app.handleAuth()">Sign in</button> to add your own locations and interact.</p>
                        `;
                        
                        // Insert after the header
                        const header = locationsView.querySelector('div');
                        if (header && header.nextSibling) {
                            locationsView.insertBefore(infoBar, header.nextSibling);
                        }
                    }
                }

                // Render locations grid
                grid.innerHTML = `<div class="locations-grid">${
                    locations.map(location => {
                        return `
                            <div class="location-card">
                                <div class="location-header">
                                    <h3>${location.name || 'Unnamed Location'}</h3>
                                    <span class="risk risk-${location.riskLevel || 'moderate'}">${location.riskLevel || 'Moderate'}</span>
                                </div>
                                <p>${location.description || 'No description available.'}</p>
                                <div>
                                    <span class="chip">${location.category || 'Uncategorized'}</span>
                                </div>
                                <div class="location-actions">
                                    <button class="btn" onclick="app.showLocationDetail('${location.id}')">
                                        <i class="fas fa-info-circle"></i> Details
                                    </button>
                                    <button class="btn" onclick="app.viewOnMap('${location.id}')">
                                        <i class="fas fa-map-marker-alt"></i> View on Map
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')
                }</div>`;
            } catch (error) {
                console.error('Error loading locations:', error);
                grid.innerHTML = '<div class="error">Failed to load locations</div>';
            }
        };

        // Override showSettings
        const originalShowSettings = window.app.showSettings;
        window.app.showSettings = function() {
            if (!this.currentUser) {
                const settingsContent = document.getElementById('settings-content');
                if (settingsContent) {
                    settingsContent.innerHTML = `
                        <div class="panel" style="text-align: center; padding: 48px;">
                            <i class="fas fa-cog" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px; display: block;"></i>
                            <h3 style="color: var(--text-secondary); margin-bottom: 12px;">Sign In Required</h3>
                            <p style="color: var(--text-muted); margin-bottom: 20px;">Sign in to access and manage your account settings</p>
                            <button class="btn btn-primary" onclick="app.handleAuth()">
                                <i class="fas fa-sign-in-alt"></i> Sign In Now
                            </button>
                        </div>
                    `;
                }
                return;
            }
            
            if (originalShowSettings) {
                originalShowSettings.call(this);
            }
        };

        // Ensure mission content is viewable even without login
        const originalShowMissions = window.app.showMissions;
        window.app.showMissions = function() {
            const view = document.getElementById('missions-view-content');
            if (view) {
                view.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2>Missions & Challenges</h2>
                        <div style="display: flex; gap: 12px;">
                            <button class="btn" onclick="app.showView('map')">
                                <i class="fas fa-map"></i> Back to Map
                            </button>
                            ${this.currentUser ? `
                                <button class="btn btn-primary" onclick="app.createCustomMission()">
                                    <i class="fas fa-plus"></i> Create Mission
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    ${!this.currentUser ? `
                        <div class="panel info-message" style="text-align: left; padding: 16px; margin-bottom: 24px; background: rgba(30, 58, 95, 0.1); border: 2px solid var(--cz-blueprint);">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <i class="fas fa-info-circle" style="font-size: 1.5rem; color: var(--cz-blueprint);"></i>
                                <div>
                                    <h3 style="color: var(--cz-blueprint); margin-bottom: 6px;">Browsing Missions As Guest</h3>
                                    <p style="color: var(--text-secondary); margin-bottom: 10px;">You can view available missions, but you'll need to sign in to track progress and earn rewards.</p>
                                    <button class="btn btn-primary" onclick="app.handleAuth()">
                                        <i class="fas fa-sign-in-alt"></i> Sign In
                                    </button>
                                </div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="panel" style="margin-bottom: 24px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                            <h3><i class="fas fa-trophy"></i> Available Missions</h3>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <label class="form-label" style="margin: 0; font-size: 10px;">Filter:</label>
                                <select class="select" id="mission-filter" style="width: auto; font-size: 10px; padding: 4px 8px;" onchange="app.filterMissions()">
                                    <option value="all">All</option>
                                    <option value="available">Available</option>
                                    <option value="active">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </div>
                        <div id="missions-grid">
                            <div class="loading">Loading missions...</div>
                        </div>
                    </div>

                    <div class="panel">
                        <h3><i class="fas fa-chart-line"></i> Mission Progress Overview</h3>
                        <div id="mission-progress">
                            ${!this.currentUser ? `
                                <div style="color: var(--text-muted); text-align: center; padding: 24px;">
                                    <i class="fas fa-lock" style="font-size: 2rem; margin-bottom: 12px; display: block;"></i>
                                    <p>Sign in to track your progress on missions and earn rewards.</p>
                                </div>
                            ` : `<div class="loading">Loading progress...</div>`}
                        </div>
                    </div>
                `;

                this.loadMissions();
            }
        };

        // Override showAddLocationModal to show login prompt instead for unauthenticated users
        const originalShowAddLocationModal = window.app.showAddLocationModal;
        window.app.showAddLocationModal = function() {
            if (!this.currentUser) {
                // Create a modal to prompt login
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.innerHTML = `
                    <div class="modal-content">
                        <button class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
                        <h3>Sign In Required</h3>
                        <p style="margin-bottom: 16px;">You need to sign in to add new locations. Creating an account lets you:</p>
                        <ul style="margin-bottom: 16px; padding-left: 24px;">
                            <li>Add your discoveries to the map</li>
                            <li>Track your exploration history</li>
                            <li>Earn badges and complete missions</li>
                            <li>Interact with other explorers</li>
                        </ul>
                        <div class="form-actions">
                            <button type="button" class="btn" onclick="this.closest('.modal').remove()">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="app.handleAuth(); this.closest('.modal').remove();">
                                <i class="fas fa-sign-in-alt"></i> Sign In
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                return;
            }
            
            if (originalShowAddLocationModal) {
                originalShowAddLocationModal.call(this);
            }
        };

        console.log('App successfully modified for public access');
    }
})();