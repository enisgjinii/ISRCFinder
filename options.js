// Import the shared toast utility
import { showToast } from './utils/toast.js';
import { languages } from './utils/languages.js';

let currentLang = 'en';
let currentTheme = 'light';

function updateLanguage(lang) {
  currentLang = lang;
  const texts = languages[lang];

  // Update header
  document.querySelector('.logo-section h1').textContent = texts.settings || 'ISRC Finder Dashboard';
  document.querySelector('.logo-section p').textContent = texts.dashboardSubtitle || 'Manage your extension settings and monitor activity';

  // Update card headers
  document.querySelector('.api-config-card .card-header h3').textContent = `🔑 ${texts.apiConfiguration || 'API Configuration'}`;
  document.querySelector('.automation-card .card-header h3').textContent = `🤖 ${texts.automation || 'Automation Settings'}`;
  document.querySelector('.appearance-card .card-header h3').textContent = `🎨 ${texts.appearance || 'Appearance'}`;
  document.querySelector('.export-card .card-header h3').textContent = `📤 ${texts.exportData || 'Export & Data'}`;
  document.querySelector('.notifications-card .card-header h3').textContent = `🔔 ${texts.notifications || 'Notifications'}`;
  document.querySelector('.backup-card .card-header h3').textContent = `💾 ${texts.backupSync || 'Backup & Sync'}`;

  // Update form labels and placeholders
  document.querySelector('label[for="spotifyClientId"]').textContent = texts.clientId || 'Spotify Client ID';
  document.querySelector('#spotifyClientId').placeholder = texts.enterClientId || 'Enter your Spotify Client ID';
  document.querySelector('label[for="spotifyClientSecret"]').textContent = texts.clientSecret || 'Spotify Client Secret';
  document.querySelector('#spotifyClientSecret').placeholder = texts.enterClientSecret || 'Enter your Spotify Client Secret';
  document.querySelector('label[for="spotifyDuration"]').textContent = texts.tokenDuration || 'Token Duration (hours)';
  document.querySelector('label[for="youtubeApiKey"]').textContent = texts.youtubeApiKey || 'YouTube API Key';
  document.querySelector('#youtubeApiKey').placeholder = texts.enterYoutubeApiKey || 'Enter your YouTube Data API v3 key';

  // Update buttons
  document.querySelector('#saveBtn').textContent = `💾 ${texts.saveChanges || 'Save Configuration'}`;
  document.querySelector('#testBtn').textContent = `✅ ${texts.testConnection || 'Test Connection'}`;
  document.querySelector('#clearBtn').textContent = `🗑️ ${texts.clearAll || 'Reset All Settings'}`;

  // Update setting descriptions
  const autoFetchLabel = document.querySelector('.automation-card .setting-item:nth-child(1) .setting-info label');
  const clipboardLabel = document.querySelector('.automation-card .setting-item:nth-child(2) .setting-info label');
  const desktopNotifsLabel = document.querySelector('.notifications-card .setting-item .setting-info label');

  if (autoFetchLabel) autoFetchLabel.textContent = texts.autoFetch || 'Auto-Fetch';
  if (clipboardLabel) clipboardLabel.textContent = texts.clipboardMonitor || 'Clipboard Monitor';
  if (desktopNotifsLabel) desktopNotifsLabel.textContent = texts.desktopNotifications || 'Desktop Notifications';

  // Update setting descriptions
  document.querySelector('.automation-card .setting-item:nth-child(1) .setting-description').textContent = texts.autoFetchDesc || 'Automatically search for ISRC codes';
  document.querySelector('.automation-card .setting-item:nth-child(2) .setting-description').textContent = texts.clipboardMonitorDesc || 'Scan clipboard for music links';
  document.querySelector('.notifications-card .setting-item .setting-description').textContent = texts.desktopNotificationsDesc || 'Show system notifications';
  document.querySelector('.export-card .setting-item .setting-description').textContent = texts.autoExportDesc || 'Automatically export search results';
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

// Dashboard Statistics Functions
function updateDashboardStats() {
  // Load statistics from storage
  chrome.storage.local.get(['searchStats', 'lastActivity'], (data) => {
    const stats = data.searchStats || { totalSearches: 0, successfulFinds: 0, exportCount: 0 };

    document.getElementById('totalSearches').textContent = stats.totalSearches || 0;
    document.getElementById('successfulFinds').textContent = stats.successfulFinds || 0;
    document.getElementById('exportCount').textContent = stats.exportCount || 0;

    const lastActivity = data.lastActivity || Date.now();
    const timeAgo = getTimeAgo(lastActivity);
    document.getElementById('lastActivity').textContent = timeAgo;
  });
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function updateApiStatus() {
  const clientId = document.getElementById('spotifyClientId').value.trim();
  const clientSecret = document.getElementById('spotifyClientSecret').value.trim();
  const apiKey = document.getElementById('youtubeApiKey').value.trim();

  const statusElement = document.getElementById('apiStatus');
  const isConfigured = clientId && clientSecret && apiKey;

  if (isConfigured) {
    statusElement.textContent = 'Configured';
    statusElement.classList.add('configured');
  } else {
    statusElement.textContent = 'Not Configured';
    statusElement.classList.remove('configured');
  }
}

// Volume Control
function updateVolumeDisplay() {
  const volumeSlider = document.getElementById('alertVolume');
  const volumeDisplay = document.getElementById('volumeValue');
  volumeDisplay.textContent = `${volumeSlider.value}%`;
}

document.addEventListener('DOMContentLoaded', function () {
  // Initialize theme first to avoid flash
  initializeTheme();
  setupThemeToggle();

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

        // Update API status after loading
        setTimeout(updateApiStatus, 100);
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
        updateApiStatus();
      });
    } catch (error) {
      console.error('Settings save error:', error);
      showLocalizedToast('failedToSaveSettings');
    }
  });

  // Clear Settings
  document.getElementById('clearBtn').addEventListener('click', function () {
    if (confirm('Are you sure you want to reset all settings? This action cannot be undone.')) {
      try {
        chrome.storage.local.clear(function () {
          if (chrome.runtime.lastError) {
            console.error('Settings clear error:', chrome.runtime.lastError);
            showLocalizedToast('errorClearingSettings');
            return;
          }

          document.getElementById('spotifyClientId').value = '';
          document.getElementById('spotifyClientSecret').value = '';
          document.getElementById('youtubeApiKey').value = '';

          // Reset all toggles and inputs
          document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
          document.querySelectorAll('select').forEach(select => select.selectedIndex = 0);
          document.querySelectorAll('input[type="color"]').forEach(color => color.value = '#6366f1');
          document.querySelectorAll('input[type="range"]').forEach(range => range.value = 50);

          updateVolumeDisplay();
          updateApiStatus();
          showLocalizedToast('allSettingsCleared');
        });
      } catch (error) {
        console.error('Settings clear error:', error);
        showLocalizedToast('failedToClearSettings');
      }
    }
  });

  // Test button
  document.getElementById('testBtn').addEventListener('click', function () {
    const testBtn = this;
    testBtn.disabled = true;
    testBtn.innerHTML = '⌛ Testing...';

    chrome.runtime.sendMessage({ action: "TEST_CREDENTIALS" }, (response) => {
      testBtn.disabled = false;
      testBtn.innerHTML = '✅ Test Connection';

      if (response && response.success) {
        showLocalizedToast('spotifyConnectionSuccess', 'success');
      } else {
        const errorMsg = response ? response.error : 'Unknown error';
        showLocalizedToast(`connectionFailed: ${errorMsg}`, 'error');
      }
    });
  });

  // Volume control
  const volumeSlider = document.getElementById('alertVolume');
  volumeSlider.addEventListener('input', updateVolumeDisplay);

  // Update API status when inputs change
  ['spotifyClientId', 'spotifyClientSecret', 'youtubeApiKey'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateApiStatus);
  });

  // Initialize dashboard stats
  updateDashboardStats();

  // Initialize new features
  initializeAutoFetchSettings();
  initializeAppearanceSettings();
  initializeExportSettings();
  initializeNotificationSettings();
  initializeBackupSettings();

  // Update volume display initially
  updateVolumeDisplay();
});

// 1. Auto-Fetch Settings
function initializeAutoFetchSettings() {
  const autoFetchEnabled = document.getElementById('autoFetchEnabled');
  const clipboardScanEnabled = document.getElementById('clipboardScanEnabled');

  chrome.storage.local.get(['autoFetchEnabled', 'clipboardScanEnabled'], (data) => {
    autoFetchEnabled.checked = data.autoFetchEnabled ?? false;
    clipboardScanEnabled.checked = data.clipboardScanEnabled ?? false;
  });

  autoFetchEnabled.addEventListener('change', (e) => {
    chrome.storage.local.set({ autoFetchEnabled: e.target.checked });
    showToast('Auto-fetch settings saved', 'success');
  });
}

// 2. Appearance Settings
function initializeAppearanceSettings() {
  const accentColor = document.getElementById('accentColor');
  const fontSize = document.getElementById('fontSize');

  chrome.storage.local.get(['accentColor', 'fontSize'], (data) => {
    accentColor.value = data.accentColor || '#6366f1';
    fontSize.value = data.fontSize || 'medium';
    applyAppearanceTheme(data.accentColor, data.fontSize);
  });

  accentColor.addEventListener('change', (e) => {
    chrome.storage.local.set({ accentColor: e.target.value });
    applyAppearanceTheme(e.target.value);
  });
}

// 3. Export Settings
function initializeExportSettings() {
  const exportFormat = document.getElementById('exportFormat');
  const autoExportEnabled = document.getElementById('autoExportEnabled');

  exportFormat.addEventListener('change', (e) => {
    chrome.storage.local.set({ exportFormat: e.target.value });
  });
}

// 4. Notification Settings
function initializeNotificationSettings() {
  const desktopNotifs = document.getElementById('desktopNotifs');
  const alertVolume = document.getElementById('alertVolume');

  chrome.storage.local.get(['notificationsEnabled', 'alertVolume'], (data) => {
    desktopNotifs.checked = data.notificationsEnabled ?? true;
    alertVolume.value = data.alertVolume ?? 50;
  });

  desktopNotifs.addEventListener('change', (e) => {
    if (e.target.checked) {
      Notification.requestPermission();
    }
    chrome.storage.local.set({ notificationsEnabled: e.target.checked });
  });
}

// 5. Backup & Sync
function initializeBackupSettings() {
  const exportSettingsBtn = document.getElementById('exportSettingsBtn');
  const importSettingsBtn = document.getElementById('importSettingsBtn');
  const backupFrequency = document.getElementById('backupFrequency');

  exportSettingsBtn.addEventListener('click', async () => {
    const settings = await exportSettings();
    downloadJson(settings, 'isrc-finder-settings.json');

    // Update stats after export
    chrome.storage.local.get(['searchStats'], (data) => {
      const stats = data.searchStats || { totalSearches: 0, successfulFinds: 0, exportCount: 0 };
      stats.exportCount = (stats.exportCount || 0) + 1;
      chrome.storage.local.set({ searchStats: stats });
      updateDashboardStats();
    });

    showToast('Settings exported successfully', 'success');
  });

  importSettingsBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => importSettings(e.target.files[0]);
    input.click();
  });

  backupFrequency.addEventListener('change', (e) => {
    chrome.storage.local.set({ backupFrequency: e.target.value });
  });

  // Load backup settings
  chrome.storage.local.get(['backupFrequency', 'lastBackup'], (data) => {
    if (data.backupFrequency) {
      backupFrequency.value = data.backupFrequency;
    }

    const lastBackupDate = data.lastBackup ? new Date(data.lastBackup).toLocaleDateString() : 'Never';
    document.getElementById('lastBackupDate').textContent = lastBackupDate;
  });

  // Calculate and display settings size
  updateSettingsSize();
}

function updateSettingsSize() {
  chrome.storage.local.get(null, (data) => {
    const sizeBytes = new Blob([JSON.stringify(data)]).size;
    const sizeKB = Math.round(sizeBytes / 1024);
    document.getElementById('settingsSize').textContent = `${sizeKB} KB`;
  });
}

// Utility Functions
async function exportSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => {
      resolve(data);
    });
  });
}

async function importSettings(file) {
  try {
    const text = await file.text();
    const settings = JSON.parse(text);
    await new Promise((resolve) => {
      chrome.storage.local.set(settings, resolve);
    });
    showToast('Settings imported successfully', 'success');
    location.reload();
  } catch (error) {
    showToast('Error importing settings', 'error');
  }
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function applyAppearanceTheme(accentColor, fontSize = 'medium') {
  document.documentElement.style.setProperty('--primary', accentColor);
  document.documentElement.style.fontSize = {
    small: '14px',
    medium: '16px',
    large: '18px'
  }[fontSize];
}

function showLocalizedToast(key, type = 'info') {
  const text = languages[currentLang][key] || key;
  showToast(text, type);
}

// Theme Management Functions
function initializeTheme() {
  // Get saved theme or detect system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    currentTheme = savedTheme;
  } else {
    currentTheme = systemPrefersDark ? 'dark' : 'light';
  }
  
  applyTheme(currentTheme);
  updateThemeToggleIcon();
}

function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  updateThemeToggleIcon();
}

function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme);
  
  // Show toast notification
  const themeKey = newTheme === 'dark' ? 'darkModeEnabled' : 'lightModeEnabled';
  showLocalizedToast(themeKey, 'success');
}

function updateThemeToggleIcon() {
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
  }
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only update if user hasn't manually set a theme
    if (!localStorage.getItem('theme')) {
      currentTheme = e.matches ? 'dark' : 'light';
      applyTheme(currentTheme);
    }
  });
}