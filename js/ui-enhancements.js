// Enhanced UI functionality for Urbindex

// Floating Action Button functionality
document.addEventListener('DOMContentLoaded', function() {
    const mainFab = document.getElementById('main-fab');
    const fabMenu = document.getElementById('fab-menu');
    const addLocationFab = document.getElementById('add-location-fab');
    const addTerritoryFab = document.getElementById('add-territory-fab');
    const quickPhotoFab = document.getElementById('quick-photo-fab');

    if (mainFab && fabMenu) {
        // Toggle FAB menu
        mainFab.addEventListener('click', function() {
            const isActive = fabMenu.classList.contains('active');
            
            if (isActive) {
                fabMenu.classList.remove('active');
                mainFab.classList.remove('active');
            } else {
                fabMenu.classList.add('active');
                mainFab.classList.add('active');
            }
        });

        // Close FAB menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!event.target.closest('.floating-action-menu')) {
                fabMenu.classList.remove('active');
                mainFab.classList.remove('active');
            }
        });

        // FAB item actions
        if (addLocationFab) {
            addLocationFab.addEventListener('click', function() {
                // Close FAB menu
                fabMenu.classList.remove('active');
                mainFab.classList.remove('active');
                
                // Switch to map view if not already there
                const mapBtn = document.querySelector('[data-view="map"]');
                if (mapBtn) mapBtn.click();
                
                // Open location modal after a short delay
                setTimeout(() => {
                    const locationModal = document.getElementById('location-modal');
                    if (locationModal) {
                        locationModal.classList.remove('hidden');
                        locationModal.classList.add('active');
                    }
                }, 300);
            });
        }

        if (addTerritoryFab) {
            addTerritoryFab.addEventListener('click', function() {
                fabMenu.classList.remove('active');
                mainFab.classList.remove('active');
                
                // Switch to map view and show territory creation
                const mapBtn = document.querySelector('[data-view="map"]');
                if (mapBtn) mapBtn.click();
                
                // Show territory creation notification
                showToast('Territory creation mode activated. Click and drag on the map to define boundaries.', 'info');
            });
        }

        if (quickPhotoFab) {
            quickPhotoFab.addEventListener('click', function() {
                fabMenu.classList.remove('active');
                mainFab.classList.remove('active');
                
                // Trigger camera/file input
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.capture = 'environment'; // Use rear camera on mobile
                
                fileInput.addEventListener('change', function(e) {
                    const file = e.target.files[0];
                    if (file) {
                        // Process the photo
                        processQuickPhoto(file);
                    }
                });
                
                fileInput.click();
            });
        }
    }

    // Enhanced status indicators
    updateStatusIndicators();
    setInterval(updateStatusIndicators, 30000); // Update every 30 seconds

    // Initialize enhanced UI features
    initializeEnhancedFeatures();
});

// Process quick photo
function processQuickPhoto(file) {
    // Create a preview modal
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <h3>Quick Photo</h3>
            <div class="photo-preview">
                <img id="quick-photo-preview" style="max-width: 100%; max-height: 300px; border-radius: 8px;">
            </div>
            <div class="form-group">
                <label for="photo-description">Description</label>
                <textarea id="photo-description" placeholder="Add a description for this photo..."></textarea>
            </div>
            <div class="form-group">
                <label for="photo-location">Location</label>
                <input type="text" id="photo-location" placeholder="Where was this taken?">
            </div>
            <div class="form-actions">
                <button class="neon-button" id="save-quick-photo">Save Photo</button>
                <button class="neon-button" id="cancel-quick-photo">Cancel</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Display the photo preview
    const preview = modal.querySelector('#quick-photo-preview');
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    // Handle modal actions
    const closeBtn = modal.querySelector('.close-modal');
    const saveBtn = modal.querySelector('#save-quick-photo');
    const cancelBtn = modal.querySelector('#cancel-quick-photo');

    const closeModal = () => {
        modal.classList.remove('active');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    saveBtn.addEventListener('click', function() {
        const description = modal.querySelector('#photo-description').value;
        const location = modal.querySelector('#photo-location').value;

        // Here you would typically upload the photo to your storage service
        // For now, we'll just show a success message
        showToast('Photo saved successfully!', 'success');
        closeModal();
    });
}

// Update status indicators
function updateStatusIndicators() {
    const networkStatus = document.querySelector('.network-status');
    const syncStatus = document.querySelector('.sync-status');

    if (networkStatus) {
        if (navigator.onLine) {
            networkStatus.classList.add('online');
            networkStatus.classList.remove('offline');
            networkStatus.title = 'Online';
        } else {
            networkStatus.classList.add('offline');
            networkStatus.classList.remove('online');
            networkStatus.title = 'Offline';
        }
    }

    if (syncStatus) {
        // Simulate sync status
        const lastSync = localStorage.getItem('lastSyncTime');
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        if (!lastSync || (now - parseInt(lastSync)) > fiveMinutes) {
            syncStatus.classList.add('syncing');
            syncStatus.title = 'Syncing data...';
            
            // Simulate sync completion
            setTimeout(() => {
                syncStatus.classList.remove('syncing');
                syncStatus.title = 'Data synced';
                localStorage.setItem('lastSyncTime', now.toString());
            }, 2000);
        } else {
            syncStatus.classList.remove('syncing');
            syncStatus.title = 'Data synced';
        }
    }
}

// Initialize enhanced UI features
function initializeEnhancedFeatures() {
    // Add smooth scrolling to all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add loading states to buttons
    document.querySelectorAll('button').forEach(button => {
        if (!button.classList.contains('no-loading')) {
            button.addEventListener('click', function() {
                if (!this.disabled) {
                    this.classList.add('loading');
                    setTimeout(() => {
                        this.classList.remove('loading');
                    }, 1000);
                }
            });
        }
    });

    // Add hover effects to cards
    document.querySelectorAll('.spot-card, .forum-item, .location-item').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Initialize tooltips
    initializeTooltips();

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
}

// Initialize tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[title]');
    
    tooltipElements.forEach(element => {
        let tooltip;
        
        element.addEventListener('mouseenter', function(e) {
            const title = this.getAttribute('title');
            if (title) {
                // Remove the title to prevent default tooltip
                this.setAttribute('data-title', title);
                this.removeAttribute('title');
                
                // Create custom tooltip
                tooltip = document.createElement('div');
                tooltip.className = 'custom-tooltip';
                tooltip.textContent = title;
                document.body.appendChild(tooltip);
                
                // Position tooltip
                const rect = this.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
                tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + 'px';
                
                // Show tooltip
                setTimeout(() => {
                    tooltip.classList.add('visible');
                }, 100);
            }
        });
        
        element.addEventListener('mouseleave', function() {
            if (tooltip) {
                tooltip.classList.remove('visible');
                setTimeout(() => {
                    if (tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                }, 200);
            }
            
            // Restore title
            const dataTitle = this.getAttribute('data-title');
            if (dataTitle) {
                this.setAttribute('title', dataTitle);
                this.removeAttribute('data-title');
            }
        });
    });
}

// Initialize keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Only handle shortcuts when not typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Ctrl/Cmd + shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case '1':
                    e.preventDefault();
                    document.querySelector('[data-view="map"]')?.click();
                    break;
                case '2':
                    e.preventDefault();
                    document.querySelector('[data-view="forum"]')?.click();
                    break;
                case '3':
                    e.preventDefault();
                    document.querySelector('[data-view="my-locations"]')?.click();
                    break;
                case '4':
                    e.preventDefault();
                    document.querySelector('[data-view="profile"]')?.click();
                    break;
                case '5':
                    e.preventDefault();
                    document.querySelector('[data-view="settings"]')?.click();
                    break;
                case 'n':
                    e.preventDefault();
                    document.getElementById('main-fab')?.click();
                    break;
            }
        }

        // Escape key to close modals and menus
        if (e.key === 'Escape') {
            // Close FAB menu
            const fabMenu = document.getElementById('fab-menu');
            const mainFab = document.getElementById('main-fab');
            if (fabMenu?.classList.contains('active')) {
                fabMenu.classList.remove('active');
                mainFab?.classList.remove('active');
            }

            // Close active modals
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
                modal.classList.add('hidden');
            });
        }
    });
}

// Enhanced toast notification function
function showToast(message, type = 'info', options = {}) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconMap = {
        success: 'check-circle',
        error: 'times-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };

    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-${iconMap[type]} toast-icon"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close">&times;</button>
        </div>
        <div class="toast-progress"></div>
    `;

    // Add to container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    container.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-hide after duration
    const duration = options.duration || 5000;
    const progressBar = toast.querySelector('.toast-progress');
    
    if (progressBar) {
        progressBar.style.animationDuration = `${duration}ms`;
        progressBar.classList.add('animate');
    }

    const hideTimeout = setTimeout(() => {
        hideToast(toast);
    }, duration);

    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(hideTimeout);
        hideToast(toast);
    });

    return toast;
}

function hideToast(toast) {
    toast.classList.remove('show');
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}