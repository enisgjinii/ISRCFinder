document.addEventListener('DOMContentLoaded', function () {
  // Load saved options
  chrome.storage.local.get(
    ['spotifyClientId', 'spotifyClientSecret', 'spotifyDuration', 'youtubeApiKey'],
    function (data) {
      if (data.spotifyClientId) document.getElementById('spotifyClientId').value = data.spotifyClientId;
      if (data.spotifyClientSecret) document.getElementById('spotifyClientSecret').value = data.spotifyClientSecret;
      if (data.spotifyDuration) document.getElementById('spotifyDuration').value = data.spotifyDuration;
      if (data.youtubeApiKey) document.getElementById('youtubeApiKey').value = data.youtubeApiKey;
    }
  );

  // Save button
  document.getElementById('saveBtn').addEventListener('click', function () {
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
      showToast('Settings saved successfully');
    });
  });

  // Clear button
  document.getElementById('clearBtn').addEventListener('click', function () {
    chrome.storage.local.remove(
      ['spotifyClientId', 'spotifyClientSecret', 'spotifyDuration', 'youtubeApiKey'],
      function () {
        document.getElementById('spotifyClientId').value = '';
        document.getElementById('spotifyClientSecret').value = '';
        document.getElementById('spotifyDuration').value = '';
        document.getElementById('youtubeApiKey').value = '';
        showToast('All settings cleared');
      }
    );
  });

  // Test button
  document.getElementById('testBtn').addEventListener('click', function () {
    showToast('Testing Spotify connection...');
  });

  // Section toggle behavior
  document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function () {
      const section = this.parentElement;
      section.classList.toggle('active');
    });
  });

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    const container = document.getElementById('toastContainer');
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
});
