document.addEventListener('DOMContentLoaded', function () {
  const saveBtn = document.getElementById('saveBtn');
  const clearBtn = document.getElementById('clearBtn');
  const testBtn = document.getElementById('testBtn');

  // Load saved options
  chrome.storage.local.get(['spotifyClientId', 'spotifyClientSecret', 'spotifyDuration', 'youtubeApiKey'], function (data) {
    if (data.spotifyClientId) document.getElementById('spotifyClientId').value = data.spotifyClientId;
    if (data.spotifyClientSecret) document.getElementById('spotifyClientSecret').value = data.spotifyClientSecret;
    if (data.spotifyDuration) document.getElementById('spotifyDuration').value = data.spotifyDuration;
    if (data.youtubeApiKey) document.getElementById('youtubeApiKey').value = data.youtubeApiKey;
  });

  saveBtn.addEventListener('click', function () {
    const spotifyClientId = document.getElementById('spotifyClientId').value;
    const spotifyClientSecret = document.getElementById('spotifyClientSecret').value;
    const spotifyDuration = document.getElementById('spotifyDuration').value;
    const youtubeApiKey = document.getElementById('youtubeApiKey').value;
    chrome.storage.local.set({
      spotifyClientId,
      spotifyClientSecret,
      spotifyDuration,
      youtubeApiKey
    }, function () {
      showToast("Settings saved!", "success");
    });
  });

  clearBtn.addEventListener('click', function () {
    chrome.storage.local.remove(['spotifyClientId', 'spotifyClientSecret', 'spotifyDuration', 'youtubeApiKey'], function () {
      document.getElementById('spotifyClientId').value = "";
      document.getElementById('spotifyClientSecret').value = "";
      document.getElementById('spotifyDuration').value = "";
      document.getElementById('youtubeApiKey').value = "";
      showToast("Settings cleared!", "success");
    });
  });

  testBtn.addEventListener('click', function () {
    // For demonstration, simply show a toast.
    showToast("Testing Spotify credentials...", "success");
    // Normally, you would attempt to fetch a token using the provided credentials.
  });

  // Accordion toggle behavior
  const accordions = document.querySelectorAll('.accordion-header');
  accordions.forEach(header => {
    header.addEventListener('click', function () {
      const body = this.nextElementSibling;
      if (body.style.display === 'none') {
        body.style.display = 'block';
        this.querySelector('.accordion-toggle').textContent = '-';
      } else {
        body.style.display = 'none';
        this.querySelector('.accordion-toggle').textContent = '+';
      }
    });
  });

  function showToast(message, type) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type === 'success' ? 'toast-success' : 'toast-error');
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 600);
    }, 2000);
  }
});
