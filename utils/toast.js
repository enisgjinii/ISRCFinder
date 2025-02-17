/**
 * Toast notification types
 * @enum {string}
 */
const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Default configuration for toast notifications
 * @constant
 */
const TOAST_CONFIG = {
  duration: 3000,
  animationDuration: 200
};

/**
 * Shows a toast notification with the specified message and type
 * @param {string} message - The message to display in the toast
 * @param {('success'|'error'|'warning'|'info')} [type='info'] - The type of toast notification
 * @returns {void}
 * @throws {Error} If the toast container is not found
 */
export function showToast(message, type = TOAST_TYPES.INFO) {
  if (!message) {
    console.error('Toast message is required');
    return;
  }

  const container = document.getElementById('toastContainer');
  if (!container) {
    throw new Error('Toast container not found. Make sure element with id "toastContainer" exists.');
  }

  // Validate toast type
  if (!Object.values(TOAST_TYPES).includes(type)) {
    console.warn(`Invalid toast type: ${type}. Defaulting to 'info'`);
    type = TOAST_TYPES.INFO;
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Create icon based on type
  const icon = document.createElement('span');
  icon.className = 'toast-icon';
  switch (type) {
    case TOAST_TYPES.SUCCESS:
      icon.textContent = '✅';
      break;
    case TOAST_TYPES.ERROR:
      icon.textContent = '❌';
      break;
    case TOAST_TYPES.WARNING:
      icon.textContent = '⚠️';
      break;
    case TOAST_TYPES.INFO:
      icon.textContent = 'ℹ️';
      break;
  }

  // Create message container
  const messageElement = document.createElement('span');
  messageElement.className = 'toast-message';
  messageElement.textContent = message;

  // Assemble toast
  toast.appendChild(icon);
  toast.appendChild(messageElement);
  container.appendChild(toast);

  // Handle toast removal
  const removeToast = () => {
    toast.classList.add('fade-out');
    setTimeout(() => {
      if (container.contains(toast)) {
        container.removeChild(toast);
      }
    }, TOAST_CONFIG.animationDuration);
  };

  // Auto remove after duration
  setTimeout(removeToast, TOAST_CONFIG.duration);

  // Allow manual removal by clicking
  toast.addEventListener('click', () => {
    removeToast();
  });
}