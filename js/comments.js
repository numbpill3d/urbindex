// Urbindex - Comments Module

// Use utility functions from utils.js
const formatDate = utilsModule.formatDate;

// Initialize comments functionality
function initComments() {
  // Set up event listeners
  document.addEventListener('user-signed-in', (event) => {
    const user = event.detail;
    // Nothing to do here yet, but we could load user's comments history
  });
  
  document.addEventListener('user-signed-out', () => {
    // Clear any user-specific comment data
  });
}

// Add comment to a location
async function addComment(locationId, commentText) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to add comments');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    const commentData = {
      locationId,
      text: commentText,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userDisplayName: user.displayName || 'Anonymous',
      userPhotoURL: user.photoURL || null
    };
    
    await commentsRef.add(commentData);
    console.log('Comment added successfully');
    return true;
  } catch (error) {
    console.error('Error adding comment:', error);
    return false;
  }
}

// Load comments for a location
async function loadComments(locationId) {
  try {
    const snapshot = await commentsRef
      .where('locationId', '==', locationId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const comments = [];
    snapshot.forEach(doc => {
      comments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return comments;
  } catch (error) {
    console.error('Error loading comments:', error);
    return [];
  }
}

// Delete a comment
async function deleteComment(commentId) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to delete comments');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Get the comment
    const commentDoc = await commentsRef.doc(commentId).get();
    
    if (!commentDoc.exists) {
      console.error('Comment does not exist');
      return false;
    }
    
    const commentData = commentDoc.data();
    
    // Check if user is the author of the comment
    if (commentData.createdBy !== user.uid) {
      alert('You can only delete your own comments');
      return false;
    }
    
    // Delete the comment
    await commentsRef.doc(commentId).delete();
    console.log('Comment deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    return false;
  }
}

// Edit a comment
async function editComment(commentId, newText) {
  if (!authModule.isAuthenticated()) {
    alert('Please sign in to edit comments');
    return false;
  }
  
  const user = authModule.getCurrentUser();
  
  try {
    // Get the comment
    const commentDoc = await commentsRef.doc(commentId).get();
    
    if (!commentDoc.exists) {
      console.error('Comment does not exist');
      return false;
    }
    
    const commentData = commentDoc.data();
    
    // Check if user is the author of the comment
    if (commentData.createdBy !== user.uid) {
      alert('You can only edit your own comments');
      return false;
    }
    
    // Update the comment
    await commentsRef.doc(commentId).update({
      text: newText,
      editedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Comment edited successfully');
    return true;
  } catch (error) {
    console.error('Error editing comment:', error);
    return false;
  }
}

// Render comments for a location
function renderComments(locationId, container) {
  if (!container) return;
  
  // Clear container
  container.innerHTML = '<h3>Comments</h3>';
  
  // Add comment form
  const commentForm = document.createElement('form');
  commentForm.className = 'comment-form';
  commentForm.innerHTML = `
    <div class="form-group">
      <textarea id="comment-text-${locationId}" placeholder="Add a comment..." rows="2" required></textarea>
    </div>
    <button type="submit" class="neon-button">Post Comment</button>
  `;
  
  commentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const commentText = document.getElementById(`comment-text-${locationId}`).value;
    if (!commentText.trim()) return;
    
    const success = await addComment(locationId, commentText);
    
    if (success) {
      // Clear form
      document.getElementById(`comment-text-${locationId}`).value = '';
      
      // Reload comments
      loadAndDisplayComments();
    }
  });
  
  container.appendChild(commentForm);
  
  // Add comments list
  const commentsList = document.createElement('div');
  commentsList.className = 'comments-list';
  container.appendChild(commentsList);
  
  // Load and display comments
  const loadAndDisplayComments = async () => {
    const comments = await loadComments(locationId);
    
    if (comments.length === 0) {
      commentsList.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
      return;
    }
    
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      commentElement.dataset.id = comment.id;
      
      // Format date
      const dateDisplay = formatDate(comment.createdAt);
      
      // Check if user is the author
      const user = authModule.getCurrentUser();
      const isAuthor = user && comment.createdBy === user.uid;
      
      commentElement.innerHTML = `
        <div class="comment-header">
          <div class="comment-author">
            ${comment.userPhotoURL ? `<img src="${comment.userPhotoURL}" alt="${comment.userDisplayName}" class="comment-avatar">` : ''}
            <span>${comment.userDisplayName}</span>
          </div>
          <div class="comment-date">${dateDisplay}</div>
        </div>
        <div class="comment-content">${comment.text}</div>
        <div class="comment-actions">
          ${isAuthor ? `
            <button class="comment-edit comment-action" data-id="${comment.id}">Edit</button>
            <button class="comment-delete comment-action" data-id="${comment.id}">Delete</button>
          ` : ''}
          <button class="comment-reply comment-action" data-id="${comment.id}">Reply</button>
        </div>
      `;
      
      // Add event listeners for comment actions
      commentElement.querySelectorAll('.comment-action').forEach(button => {
        button.addEventListener('click', async (e) => {
          const commentId = e.target.dataset.id;
          
          if (e.target.classList.contains('comment-edit')) {
            // Show edit form
            const commentContent = commentElement.querySelector('.comment-content');
            const originalText = commentContent.textContent;
            
            commentContent.innerHTML = `
              <form class="edit-comment-form">
                <textarea class="edit-comment-text" rows="2" required>${originalText}</textarea>
                <div class="edit-actions">
                  <button type="submit" class="neon-button">Save</button>
                  <button type="button" class="cancel-edit neon-button">Cancel</button>
                </div>
              </form>
            `;
            
            const editForm = commentContent.querySelector('.edit-comment-form');
            const cancelBtn = commentContent.querySelector('.cancel-edit');
            
            editForm.addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const newText = commentContent.querySelector('.edit-comment-text').value;
              if (!newText.trim()) return;
              
              const success = await editComment(commentId, newText);
              
              if (success) {
                // Reload comments
                loadAndDisplayComments();
              }
            });
            
            cancelBtn.addEventListener('click', () => {
              commentContent.textContent = originalText;
            });
          } else if (e.target.classList.contains('comment-delete')) {
            // Confirm deletion
            if (confirm('Are you sure you want to delete this comment?')) {
              const success = await deleteComment(commentId);
              
              if (success) {
                // Reload comments
                loadAndDisplayComments();
              }
            }
          } else if (e.target.classList.contains('comment-reply')) {
            // Scroll to comment form and focus
            const textarea = document.getElementById(`comment-text-${locationId}`);
            textarea.focus();
            textarea.value = `@${comment.userDisplayName} `;
            
            // Scroll to form
            commentForm.scrollIntoView({ behavior: 'smooth' });
          }
        });
      });
      
      commentsList.appendChild(commentElement);
    });
  };
  
  // Initial load
  loadAndDisplayComments();
}

// Export functions for use in other modules
window.commentsModule = {
  initComments,
  addComment,
  loadComments,
  deleteComment,
  editComment,
  renderComments
};
