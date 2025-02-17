const openOptionsBtn = document.getElementById("openOptionsBtn");
const youtubeLinkInput = document.getElementById("youtubeLinkInput");
const fetchYouTubeBtn = document.getElementById("fetchYouTubeBtn");
const youtubeInfoDiv = document.getElementById("youtubeInfo");
const videoTitleEl = document.getElementById("videoTitle");
const videoDescriptionEl = document.getElementById("videoDescription");
const spotifySearchInput = document.getElementById("spotifySearchInput");
const searchSpotifyBtn = document.getElementById("searchSpotifyBtn");
const manualSpotifyInput = document.getElementById("manualSpotifyInput");
const fetchSpotifyLinksBtn = document.getElementById("fetchSpotifyLinksBtn");
const resultsDiv = document.getElementById("results");
const clearResultsBtn = document.getElementById("clearResultsBtn");
const toastContainer = document.getElementById("toastContainer");

async function getCurrentTab() {
  try {
    const queryOptions = { active: true, lastFocusedWindow: true };
    const [tab] = await chrome.tabs.query(queryOptions);
    return tab;
  } catch (error) {
    console.error('getCurrentTab error:', error);
    showToast('Failed to get current tab', 'error');
    return null;
  }
}

async function autoFetchFromCurrentTab() {
  try {
    const tab = await getCurrentTab();
    if (!tab) {
      showToast('Could not access current tab', 'error');
      return;
    }

    if (!tab.url?.includes('youtube.com/watch')) {
      showToast('Please open a YouTube video first', 'warning');
      return;
    }

    // Set the URL in the input
    const input = document.getElementById('youtubeLinkInput');
    if (input) {
      input.value = tab.url;
      await fetchYouTubeInfo(tab.url);
    }
  } catch (error) {
    console.error('Auto-fetch error:', error);
    showToast('Failed to auto-fetch video info', 'error');
  }
}

function showToast(message, type = "info") {
  if (!message || typeof message !== 'string') {
    console.error('Invalid toast message');
    return;
  }

  try {
    const toast = document.createElement("div");
    toast.classList.add("toast", "fade-in");
    
    // Validate type parameter
    const validTypes = ["success", "error", "info", "warning"];
    const toastType = validTypes.includes(type) ? type : "info";
    
    toast.classList.add(`toast-${toastType}`);
    toast.innerHTML = `
      <span class="toast-icon">${toastType === "success" ? "✅" : toastType === "error" ? "❌" : "ℹ️"}</span>
      <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    setTimeout(() => {
      if (toast && toast.parentElement) {
        toast.classList.remove("fade-in");
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 500);
      }
    }, 3000);
  } catch (error) {
    console.error("Toast error:", error);
  }
}

function loadDarkModePreference() {
  try {
    const darkEnabled = localStorage.getItem("darkModeEnabled") === "true";
    darkModeToggle.checked = darkEnabled;
    if (darkEnabled) document.documentElement.classList.add("dark-mode");
  } catch (error) {
    console.error(error);
  }
}
function saveDarkModePreference(enabled) {
  try {
    localStorage.setItem("darkModeEnabled", enabled);
  } catch (error) {
    console.error(error);
  }
}

// Theme handling
const html = document.documentElement;
const themeButtons = document.querySelectorAll('.theme-btn');

// Check system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'system';
setTheme(savedTheme);

// Theme button clicks
themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.dataset.theme;
    setTheme(theme);
    localStorage.setItem('theme', theme);
  });
});

function setTheme(theme) {
  // Update button states
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });

  // Apply theme
  if (theme === 'system') {
    html.classList.remove('light', 'dark');
  } else {
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
  }
}

// Listen for system theme changes
prefersDark.addEventListener('change', (e) => {
  if (localStorage.getItem('theme') === 'system') {
    setTheme('system');
  }
});
function updateSavedResults() {
  try {
    localStorage.setItem("savedResults", resultsDiv.innerHTML);
  } catch (error) {
    console.error(error);
  }
}
function loadSavedResults() {
  try {
    const saved = localStorage.getItem("savedResults");
    if (saved) resultsDiv.innerHTML = saved;
  } catch (error) {
    console.error(error);
  }
}
loadSavedResults();

function computeSimilarity(str1, str2) {
  try {
    const set1 = new Set(str1.toLowerCase().split(/\s+/));
    const set2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size ? intersection.size / union.size : 0;
  } catch (error) {
    console.error(error);
    return 0;
  }
}

function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("v");
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function fetchYouTubeInfo(url) {
  try {
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      showToast('Invalid YouTube URL format', 'error');
      return;
    }

    fetchYouTubeBtn.disabled = true;
    showToast('Fetching video info...', 'info');

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'GET_YOUTUBE_SNIPPET', videoId }, (resp) => {
        fetchYouTubeBtn.disabled = false;
        
        if (!resp || !resp.success) {
          showToast(`Error: ${resp?.error || 'No response'}`, 'error');
          resolve(false);
          return;
        }

        const items = resp.youtubeData.items || [];
        if (!items.length) {
          showToast('Video not found. 😕', 'info');
          resolve(false);
          return;
        }

        const snippet = items[0].snippet || {};
        youtubeInfoDiv.style.display = 'block';
        videoTitleEl.textContent = snippet.title || '(No title)';
        videoDescriptionEl.textContent = snippet.description || '(No description)';
        spotifySearchInput.value = snippet.title || '';
        
        showToast('YouTube info fetched! 🎉', 'success');
        
        // Auto trigger Spotify search
        if (snippet.title) {
          setTimeout(() => doSpotifySearch(snippet.title), 500);
        }
        
        resolve(true);
      });
    });
  } catch (error) {
    console.error('YouTube fetch error:', error);
    showToast('Error fetching YouTube info.', 'error');
    fetchYouTubeBtn.disabled = false;
    return false;
  }
}

fetchYouTubeBtn.addEventListener("click", async () => {
  const link = youtubeLinkInput.value.trim();
  if (!link) {
    showToast('Please enter a YouTube URL', 'error');
    return;
  }
  await fetchYouTubeInfo(link);
});

searchSpotifyBtn.addEventListener("click", () => {
  try {
    const query = spotifySearchInput.value.trim();
    if (!query) {
      showToast("Vendosni një kërkim për Spotify! 🔍", "error");
      return;
    }
    doSpotifySearch(query);
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë fillimit të kërkimit në Spotify.", "error");
  }
});

function doSpotifySearch(query) {
  try {
    resultsDiv.innerHTML = "";
    chrome.runtime.sendMessage({ action: "SEARCH_SPOTIFY_TRACKS", query }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim: ${resp?.error || "Nuk ka përgjigje"}`, "error");
        return;
      }
      const items = resp.searchData.tracks?.items || [];
      if (!items.length) {
        showToast("Nuk u gjet asnjë këngë. 😕", "info");
        return;
      }
      let maxSim = 0;
      items.forEach(track => {
        const sim = computeSimilarity(query, track.name);
        if (sim > maxSim) maxSim = sim;
      });
      if (maxSim < 0.4 && videoDescriptionEl.textContent.trim() !== "") {
        const fallbackBtn = document.createElement("button");
        fallbackBtn.classList.add("btn", "btn-small", "btn-purple");
        fallbackBtn.textContent = "Provo me Përshkrim 🔄";
        fallbackBtn.addEventListener("click", () => {
          const fallbackQuery = videoDescriptionEl.textContent.trim().split(" ").slice(0, 10).join(" ");
          doSpotifySearch(fallbackQuery);
        });
        resultsDiv.appendChild(fallbackBtn);
        showToast("Similari i ulët. Provo me përshkrim?", "info");
      }
      showToast(`U gjetën ${items.length} këngë! 🎶`, "success");
      items.forEach(track => buildTrackSearchRow(track, query));
      updateSavedResults();
    });
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë kërkimit në Spotify.", "error");
  }
}

// Replace the buildTrackSearchRow function with this:

function buildTrackSearchRow(track, query) {
  try {
    const simScore = computeSimilarity(query, track.name);
    const row = document.createElement("div");
    row.classList.add("result-item");
    
    row.innerHTML = `
      <img 
        src="${track.album.images[0]?.url || 'placeholder.png'}" 
        alt="${track.name}"
        class="result-thumbnail"
      />
      <div class="result-content">
        <div class="result-title">${track.name}</div>
        <div class="result-subtitle">${track.artists[0]?.name || 'Unknown'} • ${track.album.name}</div>
      </div>
      <div class="result-actions">
        <span class="result-badge">${(simScore * 100).toFixed(0)}%</span>
        <button class="action-button get-details" title="Get track details">
          <span>Details</span>
        </button>
      </div>
    `;

    row.querySelector('.get-details').addEventListener('click', () => {
      getSpotifyTrackDetails(track.id);
    });

    resultsDiv.appendChild(row);
    updateSavedResults();
  } catch (error) {
    console.error(error);
    showToast("Error building result row", "error");
  }
}

fetchSpotifyLinksBtn.addEventListener("click", () => {
  try {
    const raw = manualSpotifyInput.value.trim();
    if (!raw) {
      showToast("Vendosni një lidhje Spotify! 🔗", "error");
      return;
    }
    resultsDiv.innerHTML = "";
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    lines.forEach(line => {
      if (line.includes("spotify.com/track/")) {
        const trackId = parseSpotifyId(line, "track");
        if (trackId) getSpotifyTrackDetails(trackId);
        else showToast(`Lidhje e pavlefshme: ${line}`, "error");
      } else {
        showToast(`Lidhje e panjohur: ${line}`, "error");
      }
    });
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë përpunimit të lidhjes Spotify.", "error");
  }
});

function parseSpotifyId(link, type) {
  try {
    const parts = link.split(`${type}/`);
    if (parts.length < 2) return "";
    return parts[1].split("?")[0];
  } catch (error) {
    console.error(error);
    return "";
  }
}

function getSpotifyTrackDetails(trackId) {
  try {
    chrome.runtime.sendMessage({ action: "GET_SPOTIFY_TRACK_DETAILS", trackId }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim: ${resp?.error || "Nuk ka përgjigje"}`, "error");
        return;
      }
      buildTrackDetailsCard(resp.trackData, resp.audioFeatures);
    });
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë marrjes së detajeve.", "error");
  }
}

// And update the buildTrackDetailsCard function:

function buildTrackDetailsCard(trackData, audioFeatures) {
  try {
    const container = document.createElement("div");
    container.classList.add("result-item");
    
    container.innerHTML = `
      <img 
        src="${trackData.album?.images[0]?.url || 'placeholder.png'}" 
        alt="${trackData.name}"
        class="result-thumbnail"
      />
      <div class="result-content">
        <div class="result-title">${trackData.name}</div>
        <div class="result-subtitle">
          ${trackData.artists[0]?.name || 'Unknown'} • ${trackData.album?.name}
        </div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
          ISRC: ${trackData.external_ids?.isrc || 'N/A'} • 
          UPC: ${trackData.album?.external_ids?.upc || 'N/A'}
        </div>
      </div>
      <div class="result-actions">
        <button class="action-button" data-value="${trackData.external_ids?.isrc}" title="Copy ISRC">
          📋 ISRC
        </button>
        <button class="action-button" data-value="${trackData.album?.external_ids?.upc}" title="Copy UPC">
          📋 UPC
        </button>
      </div>
    `;

    container.querySelectorAll('.action-button').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-value');
        if (val && val !== 'N/A') {
          navigator.clipboard.writeText(val)
            .then(() => showToast(`Copied: ${val}`, "success"))
            .catch(() => showToast("Copy failed", "error"));
        } else {
          showToast("Nothing to copy!", "warning");
        }
      });
    });

    resultsDiv.appendChild(container);
    updateSavedResults();
  } catch (error) {
    console.error(error);
    showToast("Error building details card", "error");
  }
}

clearResultsBtn.addEventListener("click", () => {
  try {
    resultsDiv.innerHTML = "";
    updateSavedResults();
    showToast("Rezultatet u pastren. 🗑️", "success");
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë pastrimit të rezultateve.", "error");
  }
});

openOptionsBtn.addEventListener("click", () => {
  try {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
    else window.open(chrome.runtime.getURL("options.html"));
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë hapjes së opsioneve.", "error");
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await autoFetchFromCurrentTab();
  } catch (error) {
    console.error('DOMContentLoaded error:', error);
    showToast('Failed to initialize extension', 'error');
  }
});
