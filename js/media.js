// Urbindex - Enhanced Media Module

// DOM Elements
const locationImageInput = document.getElementById('location-image');
const imagePreviewContainer = document.getElementById('image-preview-container');

// Maximum number of images per location
const MAX_IMAGES = 10;

// Maximum video size in bytes (50MB)
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

// Initialize media functionality
function initMedia() {
  // Set up event listeners
  if (locationImageInput) {
    locationImageInput.addEventListener('change', handleImageSelection);
  }
  
  // Add video upload button to location form if it doesn't exist
  addVideoUploadToLocationForm();
  
  // Set up media gallery for location details
  setupMediaGallery();
  
  // Set up video player
  setupVideoPlayer();
}

// Handle image selection
function handleImageSelection(event) {
  if (!imagePreviewContainer) return;
  
  // Clear preview container
  imagePreviewContainer.innerHTML = '';
  
  const files = event.target.files;
  
  // Check if too many files are selected
  if (files.length > MAX_IMAGES) {
    alert(`You can only upload up to ${MAX_IMAGES} images per location.`);
    event.target.value = '';
    return;
  }
  
  // Preview each selected image
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      continue;
    }
    
    // Create preview element
    const previewItem = document.createElement('div');
    previewItem.className = 'image-preview-item';
    
    // Create image element
    const img = document.createElement('img');
    img.className = 'image-preview';
    
    // Create remove button
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      // Remove preview item
      imagePreviewContainer.removeChild(previewItem);
      
      // Update file input (this is tricky as FileList is read-only)
      // We'll need to track which images to upload separately
      previewItem.dataset.removed = 'true';
    });
    
    // Load image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Add elements to preview item
    previewItem.appendChild(img);
    previewItem.appendChild(removeBtn);
    
    // Add preview item to container
    imagePreviewContainer.appendChild(previewItem);
  }
}

// Add video upload to location form
function addVideoUploadToLocationForm() {
  const mediaTabContent = document.getElementById('media');
  if (!mediaTabContent) return;
  
  // Check if video upload section already exists
  if (document.getElementById('location-video-section')) return;
  
  // Create video upload section
  const videoSection = document.createElement('div');
  videoSection.className = 'form-group';
  videoSection.id = 'location-video-section';
  
  videoSection.innerHTML = `
    <label for="location-video">Video Upload (Optional)</label>
    <input type="file" id="location-video" accept="video/*">
    <p class="form-help-text">Maximum size: 50MB. Supported formats: MP4, WebM, Ogg.</p>
    <div id="video-preview-container" class="video-preview-container"></div>
  `;
  
  // Insert after image upload section
  const imageSection = mediaTabContent.querySelector('.form-group');
  if (imageSection) {
    imageSection.parentNode.insertBefore(videoSection, imageSection.nextSibling);
  } else {
    mediaTabContent.appendChild(videoSection);
  }
  
  // Set up event listener for video selection
  const videoInput = document.getElementById('location-video');
  if (videoInput) {
    videoInput.addEventListener('change', handleVideoSelection);
  }
}

// Handle video selection
function handleVideoSelection(event) {
  const videoPreviewContainer = document.getElementById('video-preview-container');
  if (!videoPreviewContainer) return;
  
  // Clear preview container
  videoPreviewContainer.innerHTML = '';
  
  const file = event.target.files[0];
  if (!file) return;
  
  // Check if file is a video
  if (!file.type.startsWith('video/')) {
    alert('Please select a video file.');
    event.target.value = '';
    return;
  }
  
  // Check file size
  if (file.size > MAX_VIDEO_SIZE) {
    alert(`Video size must be less than ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`);
    event.target.value = '';
    return;
  }
  
  // Create preview element
  const previewItem = document.createElement('div');
  previewItem.className = 'video-preview-item';
  
  // Create video element
  const video = document.createElement('video');
  video.className = 'video-preview';
  video.controls = true;
  
  // Create remove button
  const removeBtn = document.createElement('button');
  removeBtn.className = 'remove-video-btn';
  removeBtn.innerHTML = '&times;';
  removeBtn.type = 'button';
  removeBtn.addEventListener('click', () => {
    // Remove preview item
    videoPreviewContainer.removeChild(previewItem);
    
    // Clear file input
    event.target.value = '';
  });
  
  // Load video preview
  const videoURL = URL.createObjectURL(file);
  video.src = videoURL;
  
  // Add elements to preview item
  previewItem.appendChild(video);
  previewItem.appendChild(removeBtn);
  
  // Add preview item to container
  videoPreviewContainer.appendChild(previewItem);
}

// Set up media gallery for location details
function setupMediaGallery() {
  // This will be called when viewing a location's details
  document.addEventListener('location-details-loaded', (event) => {
    const locationData = event.detail;
    if (!locationData) return;
    
    const locationDetailsContainer = document.getElementById('location-details-container');
    if (!locationDetailsContainer) return;
    
    // Check if media gallery already exists
    let mediaGallery = locationDetailsContainer.querySelector('.media-gallery');
    if (!mediaGallery) {
      // Create media gallery
      mediaGallery = document.createElement('div');
      mediaGallery.className = 'media-gallery';
      locationDetailsContainer.appendChild(mediaGallery);
    } else {
      // Clear existing gallery
      mediaGallery.innerHTML = '';
    }
    
    // Add images to gallery
    if (locationData.images && locationData.images.length > 0) {
      const imagesSection = document.createElement('div');
      imagesSection.className = 'images-section';
      
      // Create image thumbnails
      locationData.images.forEach((imageUrl, index) => {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'image-thumbnail';
        thumbnail.style.backgroundImage = `url(${imageUrl})`;
        thumbnail.dataset.index = index;
        thumbnail.dataset.url = imageUrl;
        
        // Add click event to open fullscreen gallery
        thumbnail.addEventListener('click', () => {
          openFullscreenGallery(locationData.images, index);
        });
        
        imagesSection.appendChild(thumbnail);
      });
      
      mediaGallery.appendChild(imagesSection);
    }
    
    // Add video to gallery
    if (locationData.video) {
      const videoSection = document.createElement('div');
      videoSection.className = 'video-section';
      
      const video = document.createElement('video');
      video.className = 'location-video';
      video.controls = true;
      video.src = locationData.video;
      video.poster = locationData.images && locationData.images.length > 0 ? locationData.images[0] : '';
      
      videoSection.appendChild(video);
      mediaGallery.appendChild(videoSection);
    }
  });
}

// Open fullscreen gallery
function openFullscreenGallery(images, startIndex = 0) {
  // Create fullscreen gallery container
  const galleryContainer = document.createElement('div');
  galleryContainer.className = 'fullscreen-gallery';
  
  // Create gallery content
  galleryContainer.innerHTML = `
    <div class="gallery-content">
      <button class="close-gallery">&times;</button>
      <div class="gallery-image-container">
        <img class="gallery-image" src="${images[startIndex]}" alt="Gallery image">
      </div>
      <div class="gallery-controls">
        <button class="gallery-prev">&lt;</button>
        <span class="gallery-counter">${startIndex + 1} / ${images.length}</span>
        <button class="gallery-next">&gt;</button>
      </div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(galleryContainer);
  
  // Show gallery with animation
  setTimeout(() => {
    galleryContainer.classList.add('active');
  }, 10);
  
  // Current image index
  let currentIndex = startIndex;
  
  // Update gallery image
  const updateGalleryImage = (index) => {
    const galleryImage = galleryContainer.querySelector('.gallery-image');
    const galleryCounter = galleryContainer.querySelector('.gallery-counter');
    
    galleryImage.src = images[index];
    galleryCounter.textContent = `${index + 1} / ${images.length}`;
  };
  
  // Set up event listeners
  const closeBtn = galleryContainer.querySelector('.close-gallery');
  const prevBtn = galleryContainer.querySelector('.gallery-prev');
  const nextBtn = galleryContainer.querySelector('.gallery-next');
  
  closeBtn.addEventListener('click', () => {
    galleryContainer.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(galleryContainer);
    }, 300);
  });
  
  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateGalleryImage(currentIndex);
  });
  
  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % images.length;
    updateGalleryImage(currentIndex);
  });
  
  // Close gallery when clicking outside content
  galleryContainer.addEventListener('click', (e) => {
    if (e.target === galleryContainer) {
      galleryContainer.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(galleryContainer);
      }, 300);
    }
  });
  
  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      galleryContainer.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(galleryContainer);
      }, 300);
      window.removeEventListener('keydown', handleKeyDown);
    } else if (e.key === 'ArrowLeft') {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
      updateGalleryImage(currentIndex);
    } else if (e.key === 'ArrowRight') {
      currentIndex = (currentIndex + 1) % images.length;
      updateGalleryImage(currentIndex);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
}

// Set up video player
function setupVideoPlayer() {
  // This will be called when a video is clicked in the locations list
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('location-video-thumbnail') || 
        e.target.closest('.location-video-thumbnail')) {
      
      const thumbnail = e.target.classList.contains('location-video-thumbnail') ? 
                        e.target : 
                        e.target.closest('.location-video-thumbnail');
      
      const videoUrl = thumbnail.dataset.videoUrl;
      if (!videoUrl) return;
      
      openVideoPlayer(videoUrl);
    }
  });
}

// Open video player
function openVideoPlayer(videoUrl) {
  // Create video player container
  const playerContainer = document.createElement('div');
  playerContainer.className = 'fullscreen-video-player';
  
  // Create player content
  playerContainer.innerHTML = `
    <div class="player-content">
      <button class="close-player">&times;</button>
      <div class="video-container">
        <video class="player-video" controls autoplay>
          <source src="${videoUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  `;
  
  // Add to document
  document.body.appendChild(playerContainer);
  
  // Show player with animation
  setTimeout(() => {
    playerContainer.classList.add('active');
  }, 10);
  
  // Set up event listeners
  const closeBtn = playerContainer.querySelector('.close-player');
  const video = playerContainer.querySelector('.player-video');
  
  closeBtn.addEventListener('click', () => {
    // Pause video
    video.pause();
    
    // Close player
    playerContainer.classList.remove('active');
    setTimeout(() => {
      document.body.removeChild(playerContainer);
    }, 300);
  });
  
  // Close player when clicking outside content
  playerContainer.addEventListener('click', (e) => {
    if (e.target === playerContainer) {
      // Pause video
      video.pause();
      
      // Close player
      playerContainer.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(playerContainer);
      }, 300);
    }
  });
  
  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      // Pause video
      video.pause();
      
      // Close player
      playerContainer.classList.remove('active');
      setTimeout(() => {
        document.body.removeChild(playerContainer);
      }, 300);
      window.removeEventListener('keydown', handleKeyDown);
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
}

// Upload location media (images and video)
async function uploadLocationMedia(locationId, imageFiles, videoFile) {
  if (!locationId) return { images: [], video: null };
  
  const imageUrls = [];
  let videoUrl = null;
  
  try {
    // Upload images
    if (imageFiles && imageFiles.length > 0) {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        
        // Skip non-image files
        if (!file.type.startsWith('image/')) {
          continue;
        }
        
        // Upload image to Firebase Storage
        const storageRef = firebase.storage().ref();
        const imageRef = storageRef.child(`locations/${locationId}/images/${Date.now()}_${file.name}`);
        
        await imageRef.put(file);
        const downloadUrl = await imageRef.getDownloadURL();
        
        imageUrls.push(downloadUrl);
      }
    }
    
    // Upload video
    if (videoFile) {
      // Skip non-video files
      if (videoFile.type.startsWith('video/')) {
        // Upload video to Firebase Storage
        const storageRef = firebase.storage().ref();
        const videoRef = storageRef.child(`locations/${locationId}/videos/${Date.now()}_${videoFile.name}`);
        
        await videoRef.put(videoFile);
        videoUrl = await videoRef.getDownloadURL();
      }
    }
    
    return { images: imageUrls, video: videoUrl };
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

// Create video thumbnail element
function createVideoThumbnail(videoUrl, posterUrl = '') {
  const thumbnail = document.createElement('div');
  thumbnail.className = 'location-video-thumbnail';
  thumbnail.dataset.videoUrl = videoUrl;
  
  // Add play button overlay
  const playButton = document.createElement('div');
  playButton.className = 'play-button-overlay';
  playButton.innerHTML = '<span>▶</span>';
  
  // Add poster image if available
  if (posterUrl) {
    thumbnail.style.backgroundImage = `url(${posterUrl})`;
  } else {
    thumbnail.classList.add('no-poster');
  }
  
  thumbnail.appendChild(playButton);
  
  return thumbnail;
}

// Add CSS for media gallery and video player
const mediaStyles = document.createElement('style');
mediaStyles.textContent = `
  /* Image Preview Styles */
  .image-preview-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 10px;
  }
  
  .image-preview-item {
    position: relative;
    width: 100px;
    height: 100px;
    border-radius: var(--border-radius);
    overflow: hidden;
    border: 2px solid var(--neon-blue);
  }
  
  .image-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .remove-image-btn,
  .remove-video-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: rgba(255, 0, 0, 0.7);
    color: white;
    border: none;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Video Preview Styles */
  .video-preview-container {
    margin-top: 10px;
  }
  
  .video-preview-item {
    position: relative;
    max-width: 300px;
    border-radius: var(--border-radius);
    overflow: hidden;
    border: 2px solid var(--neon-pink);
  }
  
  .video-preview {
    width: 100%;
    max-height: 200px;
  }
  
  /* Media Gallery Styles */
  .media-gallery {
    margin-top: 20px;
  }
  
  .images-section {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .image-thumbnail {
    width: 100px;
    height: 100px;
    border-radius: var(--border-radius);
    background-size: cover;
    background-position: center;
    cursor: pointer;
    border: 2px solid var(--neon-blue);
    transition: transform 0.2s, border-color 0.2s;
  }
  
  .image-thumbnail:hover {
    transform: scale(1.05);
    border-color: var(--neon-green);
  }
  
  .video-section {
    margin-top: 15px;
  }
  
  .location-video {
    width: 100%;
    max-height: 300px;
    border-radius: var(--border-radius);
    border: 2px solid var(--neon-pink);
  }
  
  /* Fullscreen Gallery Styles */
  .fullscreen-gallery {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .fullscreen-gallery.active {
    opacity: 1;
  }
  
  .gallery-content {
    position: relative;
    width: 90%;
    max-width: 1000px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
  }
  
  .close-gallery,
  .close-player {
    position: absolute;
    top: -40px;
    right: 0;
    width: 40px;
    height: 40px;
    background-color: transparent;
    color: white;
    border: none;
    font-size: 30px;
    cursor: pointer;
    z-index: 10;
  }
  
  .gallery-image-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: var(--border-radius);
  }
  
  .gallery-image {
    max-width: 100%;
    max-height: calc(90vh - 60px);
    object-fit: contain;
  }
  
  .gallery-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    color: white;
  }
  
  .gallery-prev,
  .gallery-next {
    background-color: rgba(0, 0, 0, 0.5);
    color: white;
    border: none;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .gallery-counter {
    font-size: 14px;
  }
  
  /* Fullscreen Video Player Styles */
  .fullscreen-video-player {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.9);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
  }
  
  .fullscreen-video-player.active {
    opacity: 1;
  }
  
  .player-content {
    position: relative;
    width: 90%;
    max-width: 1000px;
    max-height: 90vh;
  }
  
  .video-container {
    width: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    border-radius: var(--border-radius);
    overflow: hidden;
  }
  
  .player-video {
    width: 100%;
    max-height: 80vh;
  }
  
  /* Video Thumbnail Styles */
  .location-video-thumbnail {
    position: relative;
    width: 100%;
    height: 150px;
    background-color: #0a0a20;
    background-size: cover;
    background-position: center;
    border-radius: var(--border-radius);
    overflow: hidden;
    cursor: pointer;
    border: 2px solid var(--neon-pink);
  }
  
  .location-video-thumbnail.no-poster {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1a1a30;
  }
  
  .play-button-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s;
  }
  
  .play-button-overlay span {
    font-size: 40px;
    color: white;
    opacity: 0.8;
    transition: opacity 0.2s, transform 0.2s;
  }
  
  .location-video-thumbnail:hover .play-button-overlay {
    background-color: rgba(0, 0, 0, 0.6);
  }
  
  .location-video-thumbnail:hover .play-button-overlay span {
    opacity: 1;
    transform: scale(1.1);
  }
  
  /* Responsive Adjustments */
  @media (max-width: 768px) {
    .gallery-image {
      max-height: calc(90vh - 100px);
    }
    
    .image-thumbnail {
      width: 80px;
      height: 80px;
    }
  }
  
  @media (max-width: 480px) {
    .image-thumbnail {
      width: 60px;
      height: 60px;
    }
    
    .gallery-prev,
    .gallery-next {
      width: 30px;
      height: 30px;
      font-size: 16px;
    }
  }
`;

document.head.appendChild(mediaStyles);

// Export functions for use in other modules
window.mediaModule = {
  initMedia,
  uploadLocationMedia,
  createVideoThumbnail,
  openFullscreenGallery,
  openVideoPlayer
};
