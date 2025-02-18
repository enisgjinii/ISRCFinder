// Import the shared toast utility
import { showToast } from './utils/toast.js';
import { languages } from './utils/languages.js';

let currentLang = 'en';

function updateLanguage(lang) {
  currentLang = lang;
  const texts = languages[lang];

  // Update all text content
  document.querySelector('.title').textContent = `⚙️ ${texts.settings}`;
  document.querySelector('#spotifyHeader h2').textContent = `🎧 ${texts.spotifyCredentials}`;
  document.querySelector('#spotifyBody .small-note').textContent = texts.spotifyNote;
  document.querySelector('#spotifyClientId').placeholder = texts.clientId;
  document.querySelector('#spotifyClientSecret').placeholder = texts.clientSecret;
  document.querySelector('#youtubeHeader h2').textContent = `📺 ${texts.youtubeApiKey}`;
  document.querySelector('#youtubeBody .small-note').textContent = texts.youtubeNote;
  document.querySelector('#youtubeApiKey').placeholder = texts.youtubeApiKey;
  document.querySelector('#saveBtn').textContent = `💾 ${texts.saveChanges}`;
  document.querySelector('#clearBtn').textContent = `❌ ${texts.clearAll}`;
  document.querySelector('#testBtn').textContent = `✅ ${texts.testConnection}`;
}

/**
 * Validates the settings form inputs
 * @returns {boolean} True if all required fields are valid
 */
// Enhanced validation
function validateSettings() {
  const spotifyClientId = document.getElementById('spotifyClientId').value.trim();
  const spotifyClientSecret = document.getElementById('spotifyClientSecret').value.trim();
  const youtubeApiKey = document.getElementById('youtubeApiKey').value.trim();

  const errors = [];

  if (!spotifyClientId) errors.push(languages[currentLang].spotifyClientIdRequired);
  if (!spotifyClientSecret) errors.push(languages[currentLang].spotifyClientSecretRequired);
  if (!youtubeApiKey) errors.push(languages[currentLang].youtubeApiKeyRequired);

  if (spotifyClientId && !/^[0-9a-f]{32}$/i.test(spotifyClientId)) {
    errors.push(languages[currentLang].invalidSpotifyClientId);
  }

  if (spotifyClientSecret && !/^[0-9a-f]{32}$/i.test(spotifyClientSecret)) {
    errors.push(languages[currentLang].invalidSpotifyClientSecret);
  }

  if (errors.length > 0) {
    errors.forEach(error => showToast(error, 'error'));
    return false;
  }

  return true;
}

// Add auto-save functionality
let saveTimeout;
function autoSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (validateSettings()) {
      document.getElementById('saveBtn').click();
    }
  }, 1000);
}

// Add input event listeners for auto-save
document.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', autoSave);
});

// Add connection test feedback
async function testConnection() {
  try {
    const testBtn = document.getElementById('testBtn');
    testBtn.disabled = true;
    testBtn.innerHTML = '⌛ Testing...';

    const response = await chrome.runtime.sendMessage({ action: "TEST_CREDENTIALS" });

    if (response.success) {
      showLocalizedToast('connectionTestSuccess', 'success');
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    showLocalizedToast(`connectionTestFailed: ${error.message}`, 'error');
  } finally {
    const testBtn = document.getElementById('testBtn');
    testBtn.disabled = false;
    testBtn.innerHTML = '✅ Test Connection';
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Initialize: Load saved settings from chrome.storage
  try {
    chrome.storage.local.get(
      ['spotifyClientId', 'spotifyClientSecret', 'youtubeApiKey', 'userCredentials'],
      function (data) {
        if (chrome.runtime.lastError) {
          console.error('Settings load error:', chrome.runtime.lastError);
          showLocalizedToast('errorLoadingSettings');
          return;
        }

        // Check if credentials are expired
        if (data.userCredentials?.expiresAt && Date.now() > data.userCredentials.expiresAt) {
          // Clear expired credentials
          chrome.storage.local.remove(['userCredentials']);
          showLocalizedToast('spotifyCredentialsExpired');
          return;
        }

        if (data.spotifyClientId) document.getElementById('spotifyClientId').value = data.spotifyClientId;
        if (data.spotifyClientSecret) document.getElementById('spotifyClientSecret').value = data.spotifyClientSecret;
        if (data.youtubeApiKey) document.getElementById('youtubeApiKey').value = data.youtubeApiKey;
      }
    );
  } catch (error) {
    console.error('Settings initialization error:', error);
    showLocalizedToast('failedToInitializeSettings');
  }

  // Initialize language selector
  const languageSelect = document.getElementById('languageSelect');

  // Load saved language preference
  chrome.storage.local.get('language', function (data) {
    const savedLang = data.language || 'en';
    languageSelect.value = savedLang;
    updateLanguage(savedLang);
  });

  // Handle language changes
  languageSelect.addEventListener('change', function () {
    const selectedLang = this.value;
    updateLanguage(selectedLang);
    chrome.storage.local.set({ language: selectedLang });
  });

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
          showLocalizedToast('errorSavingSettings');
          return;
        }
        showLocalizedToast('success');
      });
    } catch (error) {
      console.error('Settings save error:', error);
      showLocalizedToast('failedToSaveSettings');
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
            showLocalizedToast('errorClearingSettings');
            return;
          }

          document.getElementById('spotifyClientId').value = '';
          document.getElementById('spotifyClientSecret').value = '';
          document.getElementById('youtubeApiKey').value = '';
          showLocalizedToast('allSettingsCleared');
        }
      );
    } catch (error) {
      console.error('Settings clear error:', error);
      showLocalizedToast('failedToClearSettings');
    }
  });

  // Test button
  document.getElementById('testBtn').addEventListener('click', function () {
    chrome.runtime.sendMessage({ action: "TEST_CREDENTIALS" }, (response) => {
      if (response.success) {
        showLocalizedToast('spotifyConnectionSuccess', 'success');
      } else {
        showLocalizedToast(`connectionFailed: ${response.error}`, 'error');
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

function showLocalizedToast(key, type = 'info') {
  const text = languages[currentLang][key] || key;
  showToast(text, type);
}