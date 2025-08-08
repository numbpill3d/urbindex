// Urbindex - Optimized Application Core
class UrbindexApp {
    constructor() {
        this.map = null;
        this.currentUser = null;
        this.markers = new Map();
        this.isOnline = navigator.onLine;
        this.cache = new Map();
        
        this.init();
    }

    async init() {
        try {
            await this.initFirebase();
            this.initMap();
            this.initUI();
            this.initAuth();
            this.setupEventListeners();
            this.loadInitialData();
            
            console.log('Urbindex initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Urbindex:', error);
            this.showError('Failed to initialize application');
        }
    }

    async initFirebase() {
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK not loaded');
        }

        const config = {
            apiKey: "AIzaSyCifqLPnCuvRVZ9hvHIJVBmHkzB5nJyqtc",
            authDomain: "urbindex-d69e1.firebaseapp.com",
            projectId: "urbindex-d69e1",
            storageBucket: "urbindex-d69e1.firebasestorage.app",
            messagingSenderId: "889914696327",
            appId: "1:889914696327:web:351daa656a4d12fa828e22"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }

        this.db = firebase.firestore();
        this.auth = firebase.auth();
        
        // Enable offline persistence
        try {
            await this.db.enablePersistence({ synchronizeTabs: true });
        } catch (err) {
            console.warn('Firestore persistence failed:', err.code);
        }
    }

    initMap() {
        const mapElement = document.getElementById('map');
        if (!mapElement) return;

        this.map = L.map('map', {
            center: [40.7128, -74.0060],
            zoom: 13,
            zoomControl: true,
            attributionControl: false
        });

        // Add tile layer with error handling
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18,
            errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2NjY2Ij5NYXAgVW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+'
        }).addTo(this.map);

        // Add map click handler
        this.map.on('click', (e) => this.handleMapClick(e));
        
        // Add location control
        if (L.Control.Locate) {
            L.control.locate({
                position: 'topright',
                strings: { title: 'Show my location' }
            }).addTo(this.map);
        }
    }

    initUI() {
        // Initialize navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Initialize modals
        this.initModals();
        
        // Initialize forms
        this.initForms();
        
        // Setup responsive behavior
        this.setupResponsive();
    }

    initAuth() {
        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this.updateAuthUI();
            
            if (user) {
                this.loadUserData();
            }
        });

        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => this.handleAuth());
        }
    }

    setupEventListeners() {
        // Online/offline status
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Window resize
        window.addEventListener('resize', () => this.handleResize());
        
        // Visibility change (for performance)
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    async loadInitialData() {
        const loadingTasks = [
            this.loadLocations(),
            this.loadActivity(),
            this.loadCommunityData()
        ];

        try {
            await Promise.allSettled(loadingTasks);
        } catch (error) {
            console.error('Error loading initial data:', error);
        }
    }

    // Data Loading Methods
    async loadLocations() {
        try {
            const query = this.db.collection('locations')
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .limit(100);

            query.onSnapshot(snapshot => {
                this.updateMapMarkers(snapshot);
                this.updateLocationsList(snapshot);
            }, error => {
                console.error('Error loading locations:', error);
                this.showError('Failed to load locations');
            });
        } catch (error) {
            console.error('Error setting up locations listener:', error);
        }
    }

    updateMapMarkers(snapshot) {
        if (!this.map) return;

        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers.clear();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.coordinates && Array.isArray(data.coordinates) && data.coordinates.length === 2) {
                const marker = this.createLocationMarker(doc.id, data);
                this.markers.set(doc.id, marker);
            }
        });
    }

    createLocationMarker(id, data) {
        const [lat, lng] = data.coordinates;
        
        // Custom icon based on category
        const iconClass = this.getIconForCategory(data.category);
        const riskColor = this.getRiskColor(data.riskLevel);
        
        const marker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-icon" style="background-color: ${riskColor}">
                         <i class="fas ${iconClass}"></i>
                       </div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        });

        const popupContent = this.createPopupContent(id, data);
        marker.bindPopup(popupContent, {
            maxWidth: 300,
            className: 'custom-popup'
        });

        marker.addTo(this.map);
        return marker;
    }

    createPopupContent(id, data) {
        const timeAgo = data.createdAt ? this.timeAgo(data.createdAt.toDate()) : 'Unknown';
        
        return `
            <div class="popup-content">
                <h4>${this.escapeHtml(data.name)}</h4>
                <p>${this.escapeHtml(data.description)}</p>
                <div class="popup-meta">
                    <span class="category">${this.escapeHtml(data.category)}</span>
                    <span class="risk risk-${data.riskLevel}">${data.riskLevel} risk</span>
                </div>
                <div class="popup-time">Added ${timeAgo}</div>
                ${this.currentUser ? `
                    <div class="popup-actions">
                        <button onclick="app.viewLocationDetails('${id}')" class="popup-btn">
                            <i class="fas fa-eye"></i> View Details
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    async loadActivity() {
        try {
            const query = this.db.collection('locations')
                .orderBy('createdAt', 'desc')
                .limit(20);

            query.onSnapshot(snapshot => {
                this.updateActivityFeed(snapshot);
            }, error => {
                console.error('Error loading activity:', error);
                this.showActivityError();
            });
        } catch (error) {
            console.error('Error setting up activity listener:', error);
        }
    }

    updateActivityFeed(snapshot) {
        const feedElement = document.getElementById('activity-feed');
        if (!feedElement) return;

        if (snapshot.empty) {
            feedElement.innerHTML = '<div class="no-data">No recent activity</div>';
            return;
        }

        const activities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            activities.push({
                id: doc.id,
                type: 'location_added',
                user: data.createdBy || 'Anonymous',
                content: `Added "${data.name}"`,
                time: data.createdAt ? this.timeAgo(data.createdAt.toDate()) : 'Just now',
                category: data.category
            });
        });

        feedElement.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="activity-item fade-in">
                <div class="activity-icon">
                    <i class="fas ${this.getIconForCategory(activity.category)}"></i>
                </div>
                <div class="activity-content">
                    <div><span class="activity-user">${this.escapeHtml(activity.user)}</span> ${this.escapeHtml(activity.content)}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    // UI Methods
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        // Handle view-specific logic
        if (viewName === 'map' && this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        }
    }

    initModals() {
        const modal = document.getElementById('location-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal('location-modal'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal('location-modal'));

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal('location-modal');
        });

        // FAB button
        const fabBtn = document.getElementById('add-location-btn');
        if (fabBtn) {
            fabBtn.addEventListener('click', () => this.showAddLocationModal());
        }
    }

    initForms() {
        const locationForm = document.getElementById('location-form');
        if (locationForm) {
            locationForm.addEventListener('submit', (e) => this.handleLocationSubmit(e));
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            
            // Reset form if it exists
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
        
        this.selectedLatLng = null;
    }

    showAddLocationModal(latlng = null) {
        if (!this.currentUser) {
            this.showToast('Please sign in to add locations', 'warning');
            return;
        }

        this.selectedLatLng = latlng;
        this.showModal('location-modal');
        
        // Focus first input
        setTimeout(() => {
            const firstInput = document.getElementById('location-name');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    async handleLocationSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showToast('Please sign in first', 'error');
            return;
        }

        const formData = new FormData(e.target);
        const locationData = {
            name: formData.get('name') || document.getElementById('location-name').value,
            description: formData.get('description') || document.getElementById('location-description').value,
            category: formData.get('category') || document.getElementById('location-category').value,
            riskLevel: formData.get('riskLevel') || document.getElementById('location-risk').value,
            coordinates: this.selectedLatLng ? 
                [this.selectedLatLng.lat, this.selectedLatLng.lng] : 
                [40.7128, -74.0060],
            createdBy: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };

        try {
            await this.db.collection('locations').add(locationData);
            this.showToast('Location added successfully!', 'success');
            this.hideModal('location-modal');
        } catch (error) {
            console.error('Error adding location:', error);
            this.showToast('Failed to add location', 'error');
        }
    }

    // Authentication Methods
    async handleAuth() {
        if (this.currentUser) {
            try {
                await this.auth.signOut();
                this.showToast('Signed out successfully', 'success');
            } catch (error) {
                this.showToast('Sign out failed', 'error');
            }
        } else {
            try {
                await this.auth.signInAnonymously();
                this.showToast('Signed in successfully', 'success');
            } catch (error) {
                console.error('Sign in error:', error);
                this.showToast('Sign in failed', 'error');
            }
        }
    }

    updateAuthUI() {
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            // Update button text and icon
            const span = authBtn.querySelector('span');
            const icon = authBtn.querySelector('i');
            if (span) {
                span.textContent = this.currentUser ? 'Sign Out' : 'Sign In';
            }
            if (icon) {
                icon.className = this.currentUser ? 'fas fa-sign-out-alt' : 'fas fa-sign-in-alt';
            }
            authBtn.title = this.currentUser
                ? 'Sign out of your account'
                : 'Sign in to unlock full features';
        }

        // Update status dot and text
        const dot = document.getElementById('status-dot');
        const text = document.getElementById('status-text');
        if (dot && text) {
            if (this.currentUser) {
                dot.classList.remove('offline');
                text.textContent = 'Connected';
            } else {
                dot.classList.add('offline');
                text.textContent = 'Guest Mode';
            }
        }
    }

    // Event Handlers
    handleMapClick(e) {
        if (this.currentUser) {
            this.showAddLocationModal(e.latlng);
        } else {
            this.showToast('Sign in to add locations', 'info');
        }
    }

    handleKeyboard(e) {
        if (e.key === 'Escape') {
            this.hideModal('location-modal');
        }
        
        if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.showAddLocationModal();
        }
    }

    handleOnlineStatus(isOnline) {
        this.isOnline = isOnline;
        this.updateConnectionStatus();
        
        if (isOnline) {
            this.showToast('Connection restored', 'success');
        } else {
            this.showToast('You are offline', 'warning');
        }
    }

    handleResize() {
        if (this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Pause expensive operations
            this.pauseUpdates();
        } else {
            // Resume operations
            this.resumeUpdates();
        }
    }

    // Utility Methods
    updateConnectionStatus() {
        // Use main status dot/text in header
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        if (statusDot && statusText) {
            if (this.isOnline) {
                statusDot.classList.remove('offline');
                statusText.textContent = 'Connected';
            } else {
                statusDot.classList.add('offline');
                statusText.textContent = 'Offline';
            }
        }
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const styles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            zIndex: '3000',
            animation: 'fadeIn 0.3s ease-out',
            maxWidth: '90vw',
            wordWrap: 'break-word'
        };

        Object.assign(toast.style, styles);

        // Type-specific styling
        const typeColors = {
            error: 'var(--danger)',
            success: 'var(--success)',
            warning: 'var(--warning)',
            info: 'var(--accent-blue)'
        };

        if (typeColors[type]) {
            toast.style.borderColor = typeColors[type];
            toast.style.color = typeColors[type];
        }

        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    showError(message) {
        console.error(message);
        this.showToast(message, 'error');
    }

    timeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 30) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getIconForCategory(category) {
        const icons = {
            abandoned: 'fa-building',
            rooftop: 'fa-building',
            tunnel: 'fa-subway',
            industrial: 'fa-industry',
            water: 'fa-water',
            other: 'fa-map-marker-alt'
        };
        return icons[category] || 'fa-map-marker-alt';
    }

    getRiskColor(riskLevel) {
        const colors = {
            low: '#23d160',
            moderate: '#ffdd57',
            high: '#ff3860'
        };
        return colors[riskLevel] || '#7a7a9a';
    }

    setupResponsive() {
        // Handle responsive behavior
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        mediaQuery.addListener(this.handleMediaChange.bind(this));
        this.handleMediaChange(mediaQuery);
    }

    handleMediaChange(mediaQuery) {
        if (mediaQuery.matches) {
            // Mobile layout adjustments
            document.body.classList.add('mobile');
        } else {
            document.body.classList.remove('mobile');
        }
    }

    pauseUpdates() {
        // Pause real-time updates when tab is hidden
        this.updatesPaused = true;
    }

    resumeUpdates() {
        // Resume updates when tab becomes visible
        this.updatesPaused = false;
    }

    // Public API methods
    viewLocationDetails(locationId) {
        console.log('Viewing location:', locationId);
        // Implement location details view
    }

    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const userDoc = await this.db.collection('users').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                this.updateUserProfile(userData);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserProfile(userData) {
        const profileContent = document.getElementById('profile-content');
        if (profileContent) {
            let name = 'Explorer';
            if (userData.displayName) {
                name = userData.displayName;
            } else if (userData.isAnonymous) {
                name = 'Guest';
            }
            profileContent.innerHTML = `
                <div class="card">
                    <h3>Welcome, ${name}!</h3>
                    <p>Your urban exploration journey continues.</p>
                    <div class="profile-stats">
                        <div class="stat">
                            <div class="stat-value">${userData.locationsCount || 0}</div>
                            <div class="stat-label">Locations</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${userData.explorationsCount || 0}</div>
                            <div class="stat-label">Explorations</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${userData.score || 0}</div>
                            <div class="stat-label">Score</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    loadCommunityData() {
        const usersDiv = document.getElementById('online-users');
        if (!usersDiv) return;

        // For now, show static community info
        usersDiv.innerHTML = `
            <div class="community-info">
                <div class="status">
                    <div class="status-dot"></div>
                    <span>Community Active</span>
                </div>
                <div class="community-stats">
                    <div class="stat-small">
                        <span class="stat-value">150+</span>
                        <span class="stat-label">Explorers</span>
                    </div>
                    <div class="stat-small">
                        <span class="stat-value">500+</span>
                        <span class="stat-label">Locations</span>
                    </div>
                </div>
            </div>
        `;
    }
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UrbindexApp();
});

// Export for global access
window.UrbindexApp = UrbindexApp;