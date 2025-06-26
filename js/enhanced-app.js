// Enhanced Urbindex Application with Complete Functionality
class UrbindexApp {
    constructor() {
        this.map = null;
        this.currentUser = null;
        this.markers = new Map();
        this.isOnline = navigator.onLine;
        this.editingLocationId = null;
        this.selectedLatLng = null;
        
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
            
            document.dispatchEvent(new CustomEvent('app-ready'));
            console.log('Urbindex initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Urbindex:', error);
            this.showError('Failed to initialize application');
        }
    }

    async initFirebase() {
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
            zoomControl: true
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        this.map.on('click', (e) => this.handleMapClick(e));
        
        // Add map controls
        this.initMapControls();
    }

    initMapControls() {
        const locateBtn = document.getElementById('locate-btn');
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        
        if (locateBtn) {
            locateBtn.addEventListener('click', () => this.locateUser());
        }
        
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        }
    }

    locateUser() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.map.setView([latitude, longitude], 15);
                    this.showToast('Location found', 'success');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    this.showToast('Unable to get your location', 'error');
                }
            );
        } else {
            this.showToast('Geolocation not supported', 'error');
        }
    }

    toggleFullscreen() {
        const mapContainer = document.querySelector('.map-container');
        if (!document.fullscreenElement) {
            mapContainer.requestFullscreen().then(() => {
                setTimeout(() => this.map.invalidateSize(), 100);
            });
        } else {
            document.exitFullscreen();
        }
    }

    initUI() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        this.initModals();
        this.initForms();
    }

    initAuth() {
        this.auth.onAuthStateChanged(user => {
            this.currentUser = user;
            this.updateAuthUI();
            this.updateConnectionStatus();
            
            if (user) {
                this.loadUserData();
                this.updateUserPresence();
            }
        });

        const authBtn = document.getElementById('auth-btn');
        if (authBtn) {
            authBtn.addEventListener('click', () => this.handleAuth());
        }
    }

    async updateUserPresence() {
        if (!this.currentUser) return;
        
        try {
            await this.db.collection('users').doc(this.currentUser.uid).set({
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                online: true
            }, { merge: true });
        } catch (error) {
            console.error('Error updating user presence:', error);
        }
    }

    setupEventListeners() {
        window.addEventListener('online', () => this.handleOnlineStatus(true));
        window.addEventListener('offline', () => this.handleOnlineStatus(false));
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        window.addEventListener('resize', () => this.handleResize());
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            if (this.currentUser) {
                this.db.collection('users').doc(this.currentUser.uid).update({
                    online: false,
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        });
    }

    async loadInitialData() {
        await Promise.allSettled([
            this.loadLocations(),
            this.loadActivity(),
            this.loadCommunityData()
        ]);
    }

    async loadLocations() {
        try {
            this.db.collection('locations')
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .onSnapshot(snapshot => {
                    this.updateMapMarkers(snapshot);
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

        marker.bindPopup(this.createPopupContent(id, data), {
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
                <div class="popup-actions">
                    <button onclick="app.viewLocationDetails('${id}')" class="popup-btn">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
    }

    async loadActivity() {
        try {
            this.db.collection('locations')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .onSnapshot(snapshot => {
                    this.updateActivityFeed(snapshot);
                }, error => {
                    console.error('Error loading activity:', error);
                    const feedElement = document.getElementById('activity-feed');
                    if (feedElement) feedElement.innerHTML = '<div class="error">Failed to load activity</div>';
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
                user: 'Explorer',
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

    async loadCommunityData() {
        const communityDiv = document.getElementById('community-info');
        const totalLocationsEl = document.getElementById('total-locations');
        const activeExplorersEl = document.getElementById('active-explorers');
        
        if (!communityDiv) return;

        try {
            const [locationsSnapshot, usersSnapshot] = await Promise.all([
                this.db.collection('locations').where('status', '==', 'active').get(),
                this.db.collection('users').where('lastSeen', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)).get()
            ]);

            const totalLocations = locationsSnapshot.size;
            const activeUsers = usersSnapshot.size;

            if (totalLocationsEl) totalLocationsEl.textContent = totalLocations;
            if (activeExplorersEl) activeExplorersEl.textContent = activeUsers;

            communityDiv.innerHTML = `
                <div class="community-info">
                    <div class="status">
                        <div class="status-dot"></div>
                        <span>Community Active</span>
                    </div>
                    <div class="community-stats">
                        <div class="stat-small">
                            <span class="stat-value">${totalLocations}</span>
                            <span class="stat-label">Total Locations</span>
                        </div>
                        <div class="stat-small">
                            <span class="stat-value">${activeUsers}</span>
                            <span class="stat-label">Active Today</span>
                        </div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error loading community data:', error);
            communityDiv.innerHTML = '<div class="error">Failed to load community data</div>';
        }
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}-view`);
        });

        if (viewName === 'map' && this.map) {
            setTimeout(() => this.map.invalidateSize(), 100);
        } else if (viewName === 'locations') {
            this.loadUserLocations();
        } else if (viewName === 'profile') {
            this.updateUserProfile();
        }
    }

    initModals() {
        const modal = document.getElementById('location-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-location-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.hideModal('location-modal'));
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideModal('location-modal'));

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.hideModal('location-modal');
        });

        const fabBtn = document.getElementById('add-location-fab');
        if (fabBtn) {
            fabBtn.addEventListener('click', () => this.showAddLocationModal());
        }
    }

    initForms() {
        const locationForm = document.getElementById('location-form');
        if (locationForm) {
            locationForm.addEventListener('submit', (e) => this.handleLocationSubmit(e));
        }

        const categoryFilter = document.getElementById('category-filter');
        const riskFilter = document.getElementById('risk-filter');
        const searchInput = document.getElementById('locations-search');
        
        if (categoryFilter) categoryFilter.addEventListener('change', () => this.filterLocations());
        if (riskFilter) riskFilter.addEventListener('change', () => this.filterLocations());
        if (searchInput) searchInput.addEventListener('input', () => this.filterLocations());

        const exportBtn = document.getElementById('export-locations-btn');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportLocations());

        const addLocationHeaderBtn = document.getElementById('add-location-header-btn');
        if (addLocationHeaderBtn) {
            addLocationHeaderBtn.addEventListener('click', () => this.showAddLocationModal());
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
            
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
        
        this.selectedLatLng = null;
        this.editingLocationId = null;
        
        const coordsEl = document.getElementById('coordinates-display');
        if (coordsEl) coordsEl.textContent = 'Click on the map to set location';
        
        const modalTitle = document.getElementById('modal-title');
        if (modalTitle) modalTitle.innerHTML = '<i class="fas fa-map-marker-alt"></i> Add New Location';
    }

    showAddLocationModal(latlng = null) {
        if (!this.currentUser) {
            this.showToast('Please sign in to add locations', 'warning');
            return;
        }

        this.selectedLatLng = latlng;
        this.showModal('location-modal');
        
        if (latlng) {
            this.updateCoordinatesDisplay();
        }
        
        setTimeout(() => {
            const firstInput = document.getElementById('location-name');
            if (firstInput) firstInput.focus();
        }, 100);
    }

    updateCoordinatesDisplay() {
        const coordsEl = document.getElementById('coordinates-display');
        if (coordsEl && this.selectedLatLng) {
            coordsEl.textContent = `${this.selectedLatLng.lat.toFixed(6)}, ${this.selectedLatLng.lng.toFixed(6)}`;
        }
    }

    async handleLocationSubmit(e) {
        e.preventDefault();
        
        if (!this.currentUser) {
            this.showToast('Please sign in first', 'error');
            return;
        }

        const name = document.getElementById('location-name').value.trim();
        const description = document.getElementById('location-description').value.trim();
        
        if (!name || !description) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        if (!this.selectedLatLng) {
            this.showToast('Please select a location on the map', 'error');
            return;
        }

        const locationData = {
            name,
            description,
            category: document.getElementById('location-category').value,
            riskLevel: document.getElementById('location-risk').value,
            tags: document.getElementById('location-tags').value.trim(),
            coordinates: [this.selectedLatLng.lat, this.selectedLatLng.lng],
            createdBy: this.currentUser.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active'
        };

        try {
            if (this.editingLocationId) {
                await this.db.collection('locations').doc(this.editingLocationId).update(locationData);
                this.showToast('Location updated successfully!', 'success');
            } else {
                await this.db.collection('locations').add(locationData);
                this.showToast('Location added successfully!', 'success');
            }
            
            this.hideModal('location-modal');
            this.loadCommunityData();
        } catch (error) {
            console.error('Error saving location:', error);
            this.showToast('Failed to save location', 'error');
        }
    }

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
            const span = authBtn.querySelector('span');
            if (span) {
                span.textContent = this.currentUser ? 'Sign Out' : 'Sign In';
            }
        }
    }

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

    updateConnectionStatus() {
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        if (statusDot && statusText) {
            if (this.isOnline && this.currentUser) {
                statusDot.classList.remove('offline');
                statusText.textContent = 'Connected';
            } else if (this.isOnline) {
                statusDot.classList.remove('offline');
                statusText.textContent = 'Online';
            } else {
                statusDot.classList.add('offline');
                statusText.textContent = 'Offline';
            }
        }
    }

    async loadUserLocations() {
        if (!this.currentUser) {
            const grid = document.getElementById('locations-grid');
            if (grid) grid.innerHTML = '<div class="no-data">Please sign in to view your locations</div>';
            return;
        }

        try {
            const snapshot = await this.db.collection('locations')
                .where('createdBy', '==', this.currentUser.uid)
                .where('status', '==', 'active')
                .orderBy('createdAt', 'desc')
                .get();

            const locations = [];
            snapshot.forEach(doc => {
                locations.push({ id: doc.id, ...doc.data() });
            });

            this.displayUserLocations(locations);
        } catch (error) {
            console.error('Error loading user locations:', error);
            const grid = document.getElementById('locations-grid');
            if (grid) grid.innerHTML = '<div class="error">Failed to load locations</div>';
        }
    }

    displayUserLocations(locations) {
        const grid = document.getElementById('locations-grid');
        if (!grid) return;

        if (locations.length === 0) {
            grid.innerHTML = '<div class="no-data">No locations found. Click the + button to add your first location!</div>';
            return;
        }

        grid.innerHTML = locations.map(location => `
            <div class="card location-card fade-in" data-id="${location.id}">
                <div class="location-header">
                    <h4>${this.escapeHtml(location.name)}</h4>
                    <span class="risk risk-${location.riskLevel}">${location.riskLevel}</span>
                </div>
                <p class="location-description">${this.escapeHtml(location.description)}</p>
                <div class="location-meta">
                    <span class="category">${location.category}</span>
                    <span class="date">${location.createdAt ? this.timeAgo(location.createdAt.toDate()) : 'Unknown'}</span>
                </div>
                <div class="location-actions">
                    <button class="btn btn-small" onclick="app.viewLocationDetails('${location.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-small" onclick="app.editLocation('${location.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-small btn-danger" onclick="app.deleteLocation('${location.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async updateUserProfile() {
        const profileContent = document.getElementById('profile-content');
        if (!profileContent || !this.currentUser) {
            if (profileContent) profileContent.innerHTML = '<div class="no-data">Please sign in to view your profile</div>';
            return;
        }

        try {
            const userLocations = await this.db.collection('locations')
                .where('createdBy', '==', this.currentUser.uid)
                .where('status', '==', 'active')
                .get();

            const locationsCount = userLocations.size;
            const joinDate = this.currentUser.metadata.creationTime ? 
                new Date(this.currentUser.metadata.creationTime).toLocaleDateString() : 'Unknown';

            profileContent.innerHTML = `
                <div class="card">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            <i class="fas fa-user-circle"></i>
                        </div>
                        <div class="profile-info">
                            <h3>Urban Explorer</h3>
                            <p class="profile-subtitle">Member since ${joinDate}</p>
                        </div>
                    </div>
                    
                    <div class="profile-stats">
                        <div class="stat">
                            <div class="stat-value">${locationsCount}</div>
                            <div class="stat-label">Locations Added</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${Math.floor(locationsCount * 1.5)}</div>
                            <div class="stat-label">Explorations</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">${locationsCount * 10}</div>
                            <div class="stat-label">Explorer Score</div>
                        </div>
                    </div>
                    
                    <div class="profile-actions">
                        <button class="btn btn-secondary" onclick="app.showUserLocationsOnMap()">
                            <i class="fas fa-map"></i> View My Locations on Map
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error updating profile:', error);
            profileContent.innerHTML = '<div class="error">Failed to load profile data</div>';
        }
    }

    showUserLocationsOnMap() {
        this.switchView('map');
        if (this.map && this.currentUser) {
            const userMarkers = Array.from(this.markers.values()).filter(marker => 
                marker.options.userData?.createdBy === this.currentUser.uid
            );
            
            if (userMarkers.length > 0) {
                const group = new L.featureGroup(userMarkers);
                this.map.fitBounds(group.getBounds().pad(0.1));
            }
        }
    }

    async exportLocations() {
        if (!this.currentUser) return;

        try {
            const snapshot = await this.db.collection('locations')
                .where('createdBy', '==', this.currentUser.uid)
                .where('status', '==', 'active')
                .get();

            const locations = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                locations.push({
                    name: data.name,
                    description: data.description,
                    category: data.category,
                    riskLevel: data.riskLevel,
                    coordinates: data.coordinates,
                    tags: data.tags,
                    createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null
                });
            });

            const dataStr = JSON.stringify(locations, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `urbindex-locations-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            this.showToast('Locations exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting locations:', error);
            this.showToast('Failed to export locations', 'error');
        }
    }

    async deleteLocation(locationId) {
        if (!confirm('Are you sure you want to delete this location?')) return;

        try {
            await this.db.collection('locations').doc(locationId).update({
                status: 'deleted',
                deletedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            this.showToast('Location deleted successfully', 'success');
            this.loadUserLocations();
        } catch (error) {
            console.error('Error deleting location:', error);
            this.showToast('Failed to delete location', 'error');
        }
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

    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        const styles = {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'var(--secondary-bg)',
            color: 'var(--text-primary)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            zIndex: '3000',
            animation: 'fadeIn 0.3s ease-out',
            maxWidth: '300px',
            wordWrap: 'break-word'
        };

        Object.assign(toast.style, styles);
        
        const typeColors = {
            error: 'var(--danger)',
            success: 'var(--success)',
            warning: 'var(--warning)',
            info: 'var(--neon-blue)'
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
}

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UrbindexApp();
});

window.UrbindexApp = UrbindexApp;