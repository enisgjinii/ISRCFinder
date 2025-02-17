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
      ['spotifyClientId', 'spotifyClientSecret', 'spotifyDuration', 'youtubeApiKey'],
      function (data) {
        if (chrome.runtime.lastError) {
          console.error('Settings load error:', chrome.runtime.lastError);
          showToast('Error loading settings');
          return;
        }
        
        if (data.spotifyClientId) document.getElementById('spotifyClientId').value = data.spotifyClientId;
        if (data.spotifyClientSecret) document.getElementById('spotifyClientSecret').value = data.spotifyClientSecret;
        if (data.spotifyDuration) document.getElementById('spotifyDuration').value = data.spotifyDuration;
        if (data.youtubeApiKey) document.getElementById('youtubeApiKey').value = data.youtubeApiKey;
      }
    );
  } catch (error) {
    console.error('Settings initialization error:', error);
    showToast('Failed to initialize settings');
  }

  // Save Settings: Validate and store user configuration
  document.getElementById('saveBtn').addEventListener('click', function () {
    if (!validateSettings()) return;

    const spotifyClientId = document.getElementById('spotifyClientId').value.trim();
    const spotifyClientSecret = document.getElementById('spotifyClientSecret').value.trim();
    const spotifyDuration = document.getElementById('spotifyDuration').value.trim();
    const youtubeApiKey = document.getElementById('youtubeApiKey').value.trim();

    try {
      chrome.storage.local.set({
        spotifyClientId,
        spotifyClientSecret,
        spotifyDuration,
        youtubeApiKey
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

  // Clear Settings: Remove all stored configuration
  document.getElementById('clearBtn').addEventListener('click', function () {
    try {
      chrome.storage.local.remove(
        ['spotifyClientId', 'spotifyClientSecret', 'spotifyDuration', 'youtubeApiKey'],
        function () {
          if (chrome.runtime.lastError) {
            console.error('Settings clear error:', chrome.runtime.lastError);
            showToast('Error clearing settings');
            return;
          }
          
          // Clear all input fields
          document.getElementById('spotifyClientId').value = '';
          document.getElementById('spotifyClientSecret').value = '';
          document.getElementById('spotifyDuration').value = '';
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
    showToast('Testing Spotify connection...');
  });

  // Section Toggle: Handle collapsible sections
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function () {
      const section = this.parentElement;
      const wasActive = section.classList.contains('active');
      
      // First close all sections
      document.querySelectorAll('.section').forEach(s => {
        s.classList.remove('active');
      });
      
      // Then open the clicked section if it wasn't active
      if (!wasActive) {
        section.classList.add('active');
      }
    });
  });
});
