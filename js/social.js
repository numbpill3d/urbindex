// Urbindex - Social Media Integration Module

// Initialize social media functionality
function initSocial() {
  // Add social links to profile
  addSocialLinksToProfile();
  
  // Add share buttons to location details
  addShareButtonsToLocations();
  
  // Add social login options
  addSocialLoginOptions();
  
  // Set up event listeners for sharing
  setupSharingEventListeners();
}

// Add social links to profile
function addSocialLinksToProfile() {
  const socialLinksContainer = document.getElementById('social-links-container');
  if (!socialLinksContainer) return;
  
  // Check if social links already exist
  if (socialLinksContainer.querySelector('.social-links')) return;
  
  // Create social links section
  const socialLinksSection = document.createElement('div');
  socialLinksSection.className = 'social-links-section';
  
  socialLinksSection.innerHTML = `
    <h3>Social Links</h3>
    <div class="social-links">
      <div class="form-group">
        <label for="social-instagram">Instagram</label>
        <div class="social-input-container">
          <span class="social-prefix">instagram.com/</span>
          <input type="text" id="social-instagram" placeholder="username">
        </div>
      </div>
      <div class="form-group">
        <label for="social-twitter">Twitter</label>
        <div class="social-input-container">
          <span class="social-prefix">twitter.com/</span>
          <input type="text" id="social-twitter" placeholder="username">
        </div>
      </div>
      <div class="form-group">
        <label for="social-facebook">Facebook</label>
        <div class="social-input-container">
          <span class="social-prefix">facebook.com/</span>
          <input type="text" id="social-facebook" placeholder="username">
        </div>
      </div>
      <div class="form-group">
        <label for="social-website">Personal Website</label>
        <input type="url" id="social-website" placeholder="https://yourwebsite.com">
      </div>
      <button id="save-social-links" class="neon-button">Save Social Links</button>
    </div>
  `;
  
  // Add to container
  socialLinksContainer.appendChild(socialLinksSection);
  
  // Add event listener to save button
  const saveButton = document.getElementById('save-social-links');
  if (saveButton) {
    saveButton.addEventListener('click', saveSocialLinks);
  }
  
  // Load user's social links
  loadSocialLinks();
}

// Load user's social links
function loadSocialLinks() {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Get user data from Firestore
  db.collection('users').doc(user.uid).get()
    .then(doc => {
      if (doc.exists && doc.data().socialLinks) {
        const socialLinks = doc.data().socialLinks;
        
        // Update input fields
        const instagramInput = document.getElementById('social-instagram');
        const twitterInput = document.getElementById('social-twitter');
        const facebookInput = document.getElementById('social-facebook');
        const websiteInput = document.getElementById('social-website');
        
        if (instagramInput && socialLinks.instagram) {
          instagramInput.value = socialLinks.instagram;
        }
        
        if (twitterInput && socialLinks.twitter) {
          twitterInput.value = socialLinks.twitter;
        }
        
        if (facebookInput && socialLinks.facebook) {
          facebookInput.value = socialLinks.facebook;
        }
        
        if (websiteInput && socialLinks.website) {
          websiteInput.value = socialLinks.website;
        }
      }
    })
    .catch(error => {
      console.error('Error loading social links:', error);
    });
}

// Save social links
function saveSocialLinks() {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Please sign in to save social links', 'error');
    } else {
      alert('Please sign in to save social links');
    }
    return;
  }
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Get values from input fields
  const instagramInput = document.getElementById('social-instagram');
  const twitterInput = document.getElementById('social-twitter');
  const facebookInput = document.getElementById('social-facebook');
  const websiteInput = document.getElementById('social-website');
  
  const socialLinks = {
    instagram: instagramInput?.value?.trim() || '',
    twitter: twitterInput?.value?.trim() || '',
    facebook: facebookInput?.value?.trim() || '',
    website: websiteInput?.value?.trim() || ''
  };
  
  // Validate website URL
  if (socialLinks.website && !isValidUrl(socialLinks.website)) {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Please enter a valid website URL', 'error');
    } else {
      alert('Please enter a valid website URL');
    }
    return;
  }
  
  // Save to Firestore
  db.collection('users').doc(user.uid).update({
    socialLinks,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Social links saved', 'success');
    } else {
      alert('Social links saved');
    }
  })
  .catch(error => {
    console.error('Error saving social links:', error);
    
    if (window.offlineModule?.showToast) {
      window.offlineModule.showToast('Error saving social links', 'error');
    } else {
      alert('Error saving social links');
    }
  });
}

// Validate URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

// Add share buttons to location details
function addShareButtonsToLocations() {
  // Listen for location details loaded event
  document.addEventListener('location-details-loaded', (event) => {
    const locationData = event.detail;
    if (!locationData) return;
    
    const locationDetailsContainer = document.getElementById('location-details-container');
    if (!locationDetailsContainer) return;
    
    // Check if share buttons already exist
    let shareButtonsContainer = locationDetailsContainer.querySelector('.share-buttons-container');
    if (!shareButtonsContainer) {
      // Create share buttons container
      shareButtonsContainer = document.createElement('div');
      shareButtonsContainer.className = 'share-buttons-container';
      locationDetailsContainer.appendChild(shareButtonsContainer);
    } else {
      // Clear existing buttons
      shareButtonsContainer.innerHTML = '';
    }
    
    // Create share buttons
    shareButtonsContainer.innerHTML = `
      <h3>Share This Location</h3>
      <div class="share-buttons">
        <button class="share-button share-facebook" data-platform="facebook">
          <span class="share-icon">f</span>
          <span class="share-text">Facebook</span>
        </button>
        <button class="share-button share-twitter" data-platform="twitter">
          <span class="share-icon">t</span>
          <span class="share-text">Twitter</span>
        </button>
        <button class="share-button share-instagram" data-platform="instagram">
          <span class="share-icon">i</span>
          <span class="share-text">Instagram</span>
        </button>
        <button class="share-button share-copy" data-platform="copy">
          <span class="share-icon">c</span>
          <span class="share-text">Copy Link</span>
        </button>
      </div>
    `;
    
    // Add event listeners to share buttons
    const shareButtons = shareButtonsContainer.querySelectorAll('.share-button');
    shareButtons.forEach(button => {
      button.addEventListener('click', () => {
        const platform = button.dataset.platform;
        shareLocation(locationData, platform);
      });
    });
  });
}

// Share location on social media
function shareLocation(locationData, platform) {
  if (!locationData) return;
  
  // Create share URL for the location
  const locationUrl = `${window.location.origin}${window.location.pathname}?view=map&location=${locationData.id}`;
  
  // Create share text
  const shareTitle = `Check out ${locationData.name} on Urbindex!`;
  const shareText = locationData.description || 'I found this interesting location on Urbindex!';
  
  // Share based on platform
  switch (platform) {
    case 'facebook':
      // Open Facebook share dialog
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(locationUrl)}&quote=${encodeURIComponent(shareText)}`;
      window.open(facebookUrl, '_blank', 'width=600,height=400');
      break;
      
    case 'twitter':
      // Open Twitter share dialog
      const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(locationUrl)}&text=${encodeURIComponent(shareTitle)}`;
      window.open(twitterUrl, '_blank', 'width=600,height=400');
      break;
      
    case 'instagram':
      // Instagram doesn't have a direct share URL, so show instructions
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast('To share on Instagram, take a screenshot and post it with this link: ' + locationUrl, 'info', 10000);
      } else {
        alert('To share on Instagram, take a screenshot and post it with this link: ' + locationUrl);
      }
      break;
      
    case 'copy':
      // Copy link to clipboard
      navigator.clipboard.writeText(locationUrl)
        .then(() => {
          if (window.offlineModule?.showToast) {
            window.offlineModule.showToast('Link copied to clipboard!', 'success');
          } else {
            alert('Link copied to clipboard!');
          }
        })
        .catch(error => {
          console.error('Error copying link:', error);
          
          if (window.offlineModule?.showToast) {
            window.offlineModule.showToast('Error copying link. Please try again.', 'error');
          } else {
            alert('Error copying link. Please try again.');
          }
        });
      break;
      
    default:
      // Use Web Share API if available
      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: shareText,
          url: locationUrl
        })
        .catch(error => {
          console.error('Error sharing:', error);
        });
      } else {
        // Fallback to copying link
        navigator.clipboard.writeText(locationUrl)
          .then(() => {
            if (window.offlineModule?.showToast) {
              window.offlineModule.showToast('Link copied to clipboard!', 'success');
            } else {
              alert('Link copied to clipboard!');
            }
          })
          .catch(error => {
            console.error('Error copying link:', error);
          });
      }
      break;
  }
  
  // Track share event
  trackShareEvent(locationData.id, platform);
}

// Track share event
function trackShareEvent(locationId, platform) {
  // Check if user is authenticated
  if (!window.authModule?.isAuthenticated()) return;
  
  const user = window.authModule.getCurrentUser();
  if (!user) return;
  
  // Add share event to Firestore
  db.collection('shares').add({
    locationId,
    platform,
    userId: user.uid,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  })
  .catch(error => {
    console.error('Error tracking share event:', error);
  });
  
  // Update location share count
  db.collection('locations').doc(locationId).update({
    shareCount: firebase.firestore.FieldValue.increment(1)
  })
  .catch(error => {
    console.error('Error updating share count:', error);
  });
  
  // Check for sharing achievements
  if (window.achievementsModule?.checkSharingAchievements) {
    window.achievementsModule.checkSharingAchievements(user.uid);
  }
}

// Add social login options
function addSocialLoginOptions() {
  const loginButton = document.getElementById('login-button');
  if (!loginButton) return;
  
  // Create social login container
  const socialLoginContainer = document.createElement('div');
  socialLoginContainer.id = 'social-login-container';
  socialLoginContainer.className = 'social-login-container';
  
  // Insert after login button
  loginButton.parentNode.insertBefore(socialLoginContainer, loginButton.nextSibling);
  
  // Add click event to login button to show social options
  const originalClickHandler = loginButton.onclick;
  loginButton.onclick = (e) => {
    // Call original handler if exists
    if (typeof originalClickHandler === 'function') {
      originalClickHandler(e);
    }
    
    // Toggle social login container
    socialLoginContainer.classList.toggle('active');
    
    // Create social login options if not already created
    if (!socialLoginContainer.querySelector('.social-login-options')) {
      const socialLoginOptions = document.createElement('div');
      socialLoginOptions.className = 'social-login-options';
      
      socialLoginOptions.innerHTML = `
        <button class="social-login-button google-login" data-provider="google">
          <span class="social-icon">G</span>
          <span class="social-text">Google</span>
        </button>
        <button class="social-login-button facebook-login" data-provider="facebook">
          <span class="social-icon">f</span>
          <span class="social-text">Facebook</span>
        </button>
        <button class="social-login-button twitter-login" data-provider="twitter">
          <span class="social-icon">t</span>
          <span class="social-text">Twitter</span>
        </button>
      `;
      
      // Add event listeners to social login buttons
      const socialLoginButtons = socialLoginOptions.querySelectorAll('.social-login-button');
      socialLoginButtons.forEach(button => {
        button.addEventListener('click', () => {
          const provider = button.dataset.provider;
          socialLogin(provider);
          
          // Hide social login container
          socialLoginContainer.classList.remove('active');
        });
      });
      
      socialLoginContainer.appendChild(socialLoginOptions);
    }
  };
  
  // Close social login container when clicking outside
  document.addEventListener('click', (e) => {
    if (!socialLoginContainer.contains(e.target) && e.target !== loginButton) {
      socialLoginContainer.classList.remove('active');
    }
  });
}

// Social login
function socialLogin(provider) {
  if (!window.authModule) return;
  
  let authProvider;
  
  switch (provider) {
    case 'google':
      authProvider = new firebase.auth.GoogleAuthProvider();
      break;
      
    case 'facebook':
      authProvider = new firebase.auth.FacebookAuthProvider();
      break;
      
    case 'twitter':
      authProvider = new firebase.auth.TwitterAuthProvider();
      break;
      
    default:
      console.error('Invalid provider:', provider);
      return;
  }
  
  // Sign in with popup
  firebase.auth().signInWithPopup(authProvider)
    .then(result => {
      // Get user info
      const user = result.user;
      
      // Check if user exists in Firestore
      db.collection('users').doc(user.uid).get()
        .then(doc => {
          if (!doc.exists) {
            // Create new user document
            return db.collection('users').doc(user.uid).set({
              displayName: user.displayName || '',
              email: user.email || '',
              photoURL: user.photoURL || '',
              provider: provider,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              online: true
            });
          } else {
            // Update existing user document
            return db.collection('users').doc(user.uid).update({
              updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              online: true
            });
          }
        })
        .then(() => {
          console.log('User signed in successfully');
          
          // Show success message
          if (window.offlineModule?.showToast) {
            window.offlineModule.showToast(`Signed in with ${provider}`, 'success');
          }
          
          // Refresh UI
          window.authModule.updateAuthUI();
        })
        .catch(error => {
          console.error('Error updating user document:', error);
        });
    })
    .catch(error => {
      console.error('Error signing in with social provider:', error);
      
      // Show error message
      if (window.offlineModule?.showToast) {
        window.offlineModule.showToast(`Error signing in with ${provider}. Please try again.`, 'error');
      } else {
        alert(`Error signing in with ${provider}. Please try again.`);
      }
    });
}

// Set up event listeners for sharing
function setupSharingEventListeners() {
  // Listen for share button clicks in location list
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('location-share-btn') || 
        e.target.closest('.location-share-btn')) {
      
      const shareBtn = e.target.classList.contains('location-share-btn') ? 
                       e.target : 
                       e.target.closest('.location-share-btn');
      
      const locationId = shareBtn.dataset.id;
      if (!locationId) return;
      
      // Get location data
      db.collection('locations').doc(locationId).get()
        .then(doc => {
          if (doc.exists) {
            const locationData = { id: doc.id, ...doc.data() };
            
            // Show share options
            showShareOptions(shareBtn, locationData);
          }
        })
        .catch(error => {
          console.error('Error getting location data:', error);
        });
      
      // Prevent event from bubbling up
      e.stopPropagation();
    }
  });
}

// Show share options
function showShareOptions(button, locationData) {
  // Check if share options already exist
  let shareOptions = document.getElementById('share-options');
  if (shareOptions) {
    // Remove existing share options
    shareOptions.remove();
  }
  
  // Create share options
  shareOptions = document.createElement('div');
  shareOptions.id = 'share-options';
  shareOptions.className = 'share-options';
  
  // Position share options near button
  const buttonRect = button.getBoundingClientRect();
  shareOptions.style.position = 'fixed';
  shareOptions.style.top = `${buttonRect.bottom + 10}px`;
  shareOptions.style.left = `${buttonRect.left}px`;
  
  // Add share options
  shareOptions.innerHTML = `
    <div class="share-options-content">
      <button class="share-option" data-platform="facebook">
        <span class="share-icon">f</span>
        <span class="share-text">Facebook</span>
      </button>
      <button class="share-option" data-platform="twitter">
        <span class="share-icon">t</span>
        <span class="share-text">Twitter</span>
      </button>
      <button class="share-option" data-platform="copy">
        <span class="share-icon">c</span>
        <span class="share-text">Copy Link</span>
      </button>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(shareOptions);
  
  // Add event listeners to share options
  const shareOptionButtons = shareOptions.querySelectorAll('.share-option');
  shareOptionButtons.forEach(optionButton => {
    optionButton.addEventListener('click', () => {
      const platform = optionButton.dataset.platform;
      shareLocation(locationData, platform);
      
      // Remove share options
      shareOptions.remove();
    });
  });
  
  // Close share options when clicking outside
  document.addEventListener('click', function closeShareOptions(e) {
    if (!shareOptions.contains(e.target) && e.target !== button) {
      shareOptions.remove();
      document.removeEventListener('click', closeShareOptions);
    }
  });
}

// Add CSS for social media integration
const socialStyles = document.createElement('style');
socialStyles.textContent = `
  /* Social Links Section */
  .social-links-section {
    margin-top: 20px;
    padding: 15px;
    background-color: var(--secondary-bg);
    border-radius: var(--border-radius);
    border: 1px solid var(--border-color);
  }
  
  .social-links {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .social-input-container {
    display: flex;
    align-items: center;
    background-color: var(--input-bg);
    border-radius: var(--border-radius);
    overflow: hidden;
  }
  
  .social-prefix {
    padding: 8px 10px;
    background-color: rgba(255, 255, 255, 0.1);
    color: var(--text-secondary);
    font-family: monospace;
  }
  
  /* Share Buttons */
  .share-buttons-container {
    margin-top: 20px;
  }
  
  .share-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }
  
  .share-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 15px;
    border: none;
    border-radius: var(--border-radius);
    background-color: var(--secondary-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .share-facebook {
    border-left: 3px solid #1877f2;
  }
  
  .share-twitter {
    border-left: 3px solid #1da1f2;
  }
  
  .share-instagram {
    border-left: 3px solid #e1306c;
  }
  
  .share-copy {
    border-left: 3px solid #6c757d;
  }
  
  .share-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
  
  .share-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.1);
    font-weight: bold;
  }
  
  /* Social Login */
  .social-login-container {
    position: relative;
    display: none;
  }
  
  .social-login-container.active {
    display: block;
  }
  
  .social-login-options {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 10px;
    padding: 10px;
    background-color: var(--secondary-bg);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 200px;
  }
  
  .social-login-button {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    border: none;
    border-radius: var(--border-radius);
    background-color: var(--primary-bg);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .google-login {
    border-left: 3px solid #4285f4;
  }
  
  .facebook-login {
    border-left: 3px solid #1877f2;
  }
  
  .twitter-login {
    border-left: 3px solid #1da1f2;
  }
  
  .social-login-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Share Options */
  .share-options {
    z-index: 1000;
  }
  
  .share-options-content {
    background-color: var(--secondary-bg);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  
  .share-option {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: none;
    background: none;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: var(--border-radius);
    transition: background-color 0.2s ease;
  }
  
  .share-option:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .share-buttons {
      flex-direction: column;
      align-items: stretch;
    }
    
    .social-login-options {
      right: -50px;
    }
  }
`;

document.head.appendChild(socialStyles);

// Export functions for use in other modules
window.socialModule = {
  initSocial,
  shareLocation,
  socialLogin
};
