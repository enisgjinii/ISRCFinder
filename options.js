// Import the shared toast utility
import { showToast } from './utils/toast.js';

/**
 * Validates the settings form inputs
 * @returns {boolean} True if all required fields are valid
 */
function validateSettings() {
  const spotifyClientId = document.getElementById('spotifyClientId').value.trim();
  const spotifyClientSecret = document.getElementById('spotifyClientSecret').value.trim();
  const youtubeApiKey = document.getElementById('youtubeApiKey').value.trim();
  
  if (!spotifyClientId || !spotifyClientSecret) {
    showToast('Spotify Client ID and Secret are required');
    return false;
  }
  
  if (!youtubeApiKey) {
    showToast('YouTube API Key is required');
    return false;
  }
  
  return true;
}

document.addEventListener('DOMContentLoaded', function () {
  // Initialize: Load saved settings from chrome.storage
  try {
    chrome.storage.local.get(
      ['spotifyClientId', 'spotifyClientSecret', 'youtubeApiKey', 'userCredentials'],
      function (data) {
        if (chrome.runtime.lastError) {
          console.error('Settings load error:', chrome.runtime.lastError);
          showToast('Error loading settings');
          return;
        }

        // Check if credentials are expired
        if (data.userCredentials?.expiresAt && Date.now() > data.userCredentials.expiresAt) {
          // Clear expired credentials
          chrome.storage.local.remove(['userCredentials']);
          showToast('Spotify credentials have expired. Please re-enter.');
          return;
        }
        
        if (data.spotifyClientId) document.getElementById('spotifyClientId').value = data.spotifyClientId;
        if (data.spotifyClientSecret) document.getElementById('spotifyClientSecret').value = data.spotifyClientSecret;
        if (data.youtubeApiKey) document.getElementById('youtubeApiKey').value = data.youtubeApiKey;
      }
    );
  } catch (error) {
    console.error('Settings initialization error:', error);
    showToast('Failed to initialize settings');
  }

  // Save Settings
  document.getElementById('saveBtn').addEventListener('click', function () {
    if (!validateSettings()) return;

    const spotifyClientId = document.getElementById('spotifyClientId').value.trim();
    const spotifyClientSecret = document.getElementById('spotifyClientSecret').value.trim();
    const youtubeApiKey = document.getElementById('youtubeApiKey').value.trim();

    // Set expiration to 30 days from now
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);

    try {
      chrome.storage.local.set({
        spotifyClientId,
        spotifyClientSecret,
        youtubeApiKey,
        userCredentials: {
          clientId: spotifyClientId,
          clientSecret: spotifyClientSecret,
          expiresAt: expiresAt
        }
      }, function () {
        if (chrome.runtime.lastError) {
          console.error('Settings save error:', chrome.runtime.lastError);
          showToast('Error saving settings');
          return;
        }
        showToast('Settings saved successfully');
      });
    } catch (error) {
      console.error('Settings save error:', error);
      showToast('Failed to save settings');
    }
  });

  // Clear Settings
  document.getElementById('clearBtn').addEventListener('click', function () {
    try {
      chrome.storage.local.remove(
        ['spotifyClientId', 'spotifyClientSecret', 'youtubeApiKey', 'userCredentials'],
        function () {
          if (chrome.runtime.lastError) {
            console.error('Settings clear error:', chrome.runtime.lastError);
            showToast('Error clearing settings');
            return;
          }
          
          document.getElementById('spotifyClientId').value = '';
          document.getElementById('spotifyClientSecret').value = '';
          document.getElementById('youtubeApiKey').value = '';
          showToast('All settings cleared');
        }
      );
    } catch (error) {
      console.error('Settings clear error:', error);
      showToast('Failed to clear settings');
    }
  });

  // Test button
  document.getElementById('testBtn').addEventListener('click', function () {
    chrome.runtime.sendMessage({ action: "TEST_CREDENTIALS" }, (response) => {
      if (response.success) {
        showToast('Spotify connection successful! 🎉', 'success');
      } else {
        showToast(`Connection failed: ${response.error}`, 'error');
      }
    });
  });

  // Section Toggle
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function () {
      const section = this.parentElement;
      const wasActive = section.classList.contains('active');
      
      document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
      });
      
      if (!wasActive) {
        section.classList.add('active');
      }
    });
  });
});
