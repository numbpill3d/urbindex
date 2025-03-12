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
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = 'Copy';
    }, 2000);
  });
}
