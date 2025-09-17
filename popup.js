// popup.js
import { translations } from './utils/translations.js';
import { showToast } from './utils/toast.js';

////////////////////////////////////////////////////////////////////////
// Global selectors & variables
////////////////////////////////////////////////////////////////////////

const openOptionsBtn = document.getElementById("openOptionsBtn");
const youtubeLinkInput = document.getElementById("youtubeLinkInput");
const fetchYouTubeBtn = document.getElementById("fetchYouTubeBtn");
const searchSpotifyBtn = document.getElementById("searchSpotifyBtn");
const manualSpotifyInput = document.getElementById("manualSpotifyInput");
const fetchSpotifyLinksBtn = document.getElementById("fetchSpotifyLinksBtn");
const resultsDiv = document.getElementById("results");
const clearResultsBtn = document.getElementById("clearResultsBtn");
const toastContainer = document.getElementById("toastContainer");
const spotifyLinkSection = document.getElementById("spotifyLinkSection");
const resultsCount = document.getElementById("resultsCount");

let currentLang = 'en';
// We'll keep track of the active <audio> element so only one can play at a time
let activeAudio = null;

////////////////////////////////////////////////////////////////////////
// 1. Theming & language initialization
////////////////////////////////////////////////////////////////////////

const html = document.documentElement;
const themeButtons = document.querySelectorAll(".theme-btn");
const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
const savedTheme = localStorage.getItem("theme") || "system";
setTheme(savedTheme);

themeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    setTheme(theme);
    localStorage.setItem("theme", theme);
  });
});

function setTheme(theme) {
  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
  if (theme === "system") {
    html.classList.remove("light", "dark");
  } else {
    html.classList.remove("light", "dark");
    html.classList.add(theme);
  }
}

prefersDark.addEventListener("change", () => {
  if (localStorage.getItem("theme") === "system") {
    setTheme("system");
  }
});

function updateLanguage() {
  const texts = translations[currentLang] || translations.en;
  
  // Update input placeholder
  youtubeLinkInput.placeholder = "🎬 YouTube URL or 🎵 Song title...";
  manualSpotifyInput.placeholder = texts.spotifyLinkPlaceholder || "🔗 Paste Spotify links here...";
  
  // Update results count
  updateResultsCount();
  
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.value = currentLang;
  }
}

function updateResultsCount() {
  const resultItems = resultsDiv.querySelectorAll('.result-item:not(.empty-state)');
  const count = resultItems.length;
  if (resultsCount) {
    resultsCount.textContent = count === 0 ? 'No results' : count === 1 ? '1 result' : `${count} results`;
  }
}

function handleSpotifyLinks() {
  const links = manualSpotifyInput.value.trim().split('\n').filter(link => link.trim());
  if (links.length === 0) return;
  
  // Process each Spotify link
  links.forEach(link => {
    if (link.includes('spotify.com/track/')) {
      doSpotifyLinkFetch(link.trim());
    }
  });
  
  // Clear the input
  manualSpotifyInput.value = '';
}

////////////////////////////////////////////////////////////////////////
// 2. Handling YouTube info
////////////////////////////////////////////////////////////////////////

// Enhanced URL detection with multiple formats support
function parseYouTubeId(url) {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu.be\/)([^&\n?#]+)/,
      /youtube.com\/shorts\/([^&\n?#]+)/,
      /youtube.com\/embed\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  } catch (error) {
    console.error('URL parse error:', error);
    return null;
  }
}

async function fetchYouTubeInfo(url) {
  try {
    setLoading(true);
    if (!url) {
      showLocalizedToast('pleaseProvideValidYouTubeUrl', 'error');
      return false;
    }
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      showLocalizedToast("invalidYouTubeUrlFormat", "error");
      return;
    }

    showLocalizedToast("fetchingVideoInfo", "info");
    fetchYouTubeBtn.disabled = true;

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_YOUTUBE_SNIPPET", videoId }, (resp) => {
        fetchYouTubeBtn.disabled = false;
        if (!resp || !resp.success) {
          showLocalizedToast(`error: ${resp?.error || "noResponse"}`, "error");
          resolve(false);
          return;
        }
        const items = resp.youtubeData.items || [];
        if (!items.length) {
          showLocalizedToast("videoNotFound", "info");
          resolve(false);
          return;
        }
        const snippet = items[0].snippet || {};
        
        // Store YouTube info for potential fallback searching
        localStorage.setItem("youtubeTitle", snippet.title || "");
        localStorage.setItem("youtubeDescription", snippet.description || "");

        showLocalizedToast("youtubeInfoFetched", "success");

        const cleanedTitle = cleanYouTubeTitle(snippet.title || "");
        if (cleanedTitle) {
          setTimeout(() => doSpotifySearch(cleanedTitle), 500);
        }
        resolve(true);
      });
    });
  } catch (error) {
    handleError(translations[currentLang].networkError);
  } finally {
    setLoading(false);
  }
}

function cleanYouTubeTitle(title = "") {
  return title
    .replace(/\(.*?\)/g, "")   // remove parentheses
    .replace(/\[.*?\]/g, "")   // remove brackets
    .replace(/\b\d{4}\b/g, "") // remove standalone 4-digit years
    .trim();
}

////////////////////////////////////////////////////////////////////////
// 3. Searching Spotify
////////////////////////////////////////////////////////////////////////

function computeDiceCoefficient(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (!s1 || !s2) return 0;

  const bigrams = (s) => {
    const pairs = [];
    for (let i = 0; i < s.length - 1; i++) {
      pairs.push(s.slice(i, i + 2));
    }
    return pairs;
  };

  const bg1 = bigrams(s1);
  const bg2 = bigrams(s2);

  const map1 = new Map();
  const map2 = new Map();

  for (const b of bg1) {
    map1.set(b, (map1.get(b) || 0) + 1);
  }
  for (const b of bg2) {
    map2.set(b, (map2.get(b) || 0) + 1);
  }

  let intersection = 0;
  for (const [b, freq] of map1) {
    if (map2.has(b)) {
      intersection += Math.min(freq, map2.get(b));
    }
  }
  return (2.0 * intersection) / (bg1.length + bg2.length);
}

async function doSpotifySearch(query) {
  try {
    setLoading(true);
    if (!query) {
      showLocalizedToast("invalidSearchQuery", "error");
      return;
    }
    resultsDiv.innerHTML = "";

    const cacheKey = `spotifySearch_${query.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      buildSpotifySearchResultsUI(parsed, query);
      return;
    }

    chrome.runtime.sendMessage({ action: "SEARCH_SPOTIFY_TRACKS", query }, (resp) => {
      if (!resp || !resp.success) {
        showLocalizedToast(`error: ${resp?.error || "noResponse"}`, "error");
        return;
      }
      localStorage.setItem(cacheKey, JSON.stringify(resp.searchData));
      buildSpotifySearchResultsUI(resp.searchData, query);
    });
  } catch (error) {
    console.error(error);
    showLocalizedToast("failedToSearchSpotify", "error");
  } finally {
    setLoading(false);
  }
}

function buildSpotifySearchResultsUI(searchData, originalQuery) {
  const items = searchData.tracks?.items || [];
  if (!items.length) {
    showLocalizedToast("noSongsFound", "info");
    return;
  }

  items.forEach((track) => {
    const row = document.createElement("div");
    row.classList.add("result-item");

    const simScore = computeDiceCoefficient(originalQuery, track.name);

    row.innerHTML = `
      <img 
        src="${track.album.images[0]?.url || ""}" 
        alt="${track.name}" 
        class="result-thumbnail"
      />
      <div class="result-content">
        <div class="result-title">${track.name}</div>
        <div class="result-subtitle">${track.artists[0]?.name || "Unknown"} • ${track.album.name}</div>
      </div>
      <div class="result-actions">
        <span class="result-badge">${(simScore * 100).toFixed(1)}%</span>
        <button class="action-button get-details">Details</button>
      </div>
    `;

    row.querySelector(".get-details").addEventListener("click", () => {
      getSpotifyTrackDetails(track.id);
    });

    resultsDiv.appendChild(row);
    updateResultsCount();
  });

  const bestSim = Math.max(...items.map(t => computeDiceCoefficient(originalQuery, t.name)));
  const storedDescription = localStorage.getItem("youtubeDescription") || "";
  if (bestSim < 0.3 && storedDescription.trim()) {
    const fallbackBtn = document.createElement("button");
    fallbackBtn.classList.add("btn", "btn-small", "btn-purple");
    fallbackBtn.textContent = "Try with Description 🔄";
    fallbackBtn.addEventListener("click", () => {
      const fallbackQuery = storedDescription
        .trim()
        .split(" ")
        .slice(0, 10)
        .join(" ");
      doSpotifySearch(fallbackQuery);
    });
    resultsDiv.prepend(fallbackBtn);
    showLocalizedToast("lowSimilarityTryWithDescription", "info");
  }
  updateSavedResults();
}

////////////////////////////////////////////////////////////////////////
// 4. Fetching and displaying Spotify track details
////////////////////////////////////////////////////////////////////////

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
        showLocalizedToast(`error: ${resp?.error || "noResponse"}`, "error");
        return;
      }
      buildTrackDetailsCard(resp.trackData, resp.audioFeatures);
    });
  } catch (error) {
    console.error(error);
    showLocalizedToast("errorFetchingTrackDetails", "error");
  }
}

function buildTrackDetailsCard(trackData, audioFeatures) {
  const container = document.createElement("div");
  container.classList.add("result-item");

  container.innerHTML = `
    <img 
      src="${trackData.album?.images[0]?.url || "placeholder.png"}" 
      alt="${trackData.name}"
      class="result-thumbnail"
    />
    <div class="result-content">
      <div class="result-title">${trackData.name}</div>
      <div class="result-subtitle">
        ${trackData.artists[0]?.name || "Unknown"} • ${trackData.album?.name}
      </div>
      <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
        ISRC: ${trackData.external_ids?.isrc || "N/A"} • 
        UPC: ${trackData.album?.external_ids?.upc || "N/A"}
      </div>
    </div>
    <div class="result-actions">
      <button class="action-button copy-isrc" data-value="${trackData.external_ids?.isrc}">📋 ISRC</button>
      <button class="action-button copy-upc" data-value="${trackData.album?.external_ids?.upc}">📋 UPC</button>
    </div>
  `;

  container.querySelectorAll(".action-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-value");
      if (val && val !== "N/A") {
        navigator.clipboard.writeText(val)
          .then(() => showLocalizedToast(`copied: ${val}`, "success"))
          .catch(() => showLocalizedToast("copyFailed", "error"));
      } else {
        showLocalizedToast("nothingToCopy", "warning");
      }
    });
  });

  if (trackData.preview_url) {
    const audioPlayer = createAudioPlayer(trackData.preview_url, trackData.name);
    container.querySelector('.result-actions').appendChild(audioPlayer);
  }

  resultsDiv.appendChild(container);
  updateResultsCount();
  updateSavedResults();
}

////////////////////////////////////////////////////////////////////////
// 5. Audio Preview
////////////////////////////////////////////////////////////////////////

function createAudioPlayer(previewUrl, title) {
  const container = document.createElement('div');
  container.classList.add('audio-preview');

  const audio = new Audio(previewUrl);
  const playBtn = document.createElement('button');
  playBtn.className = 'action-button';
  playBtn.textContent = '▶️';

  const progress = document.createElement('div');
  progress.className = 'progress-bar';
  progress.style.width = '0%';

  playBtn.addEventListener('click', () => {
    if (activeAudio && activeAudio !== audio) {
      activeAudio.pause();
    }
    if (audio.paused) {
      audio.play();
      activeAudio = audio;
      playBtn.textContent = '⏸️';
    } else {
      audio.pause();
      playBtn.textContent = '▶️';
    }
  });

  audio.addEventListener('timeupdate', () => {
    const pct = (audio.currentTime / audio.duration) * 100;
    progress.style.width = `${pct}%`;
  });

  audio.addEventListener('ended', () => {
    playBtn.textContent = '▶️';
    progress.style.width = '0%';
  });

  container.appendChild(playBtn);
  container.appendChild(progress);
  return container;
}

////////////////////////////////////////////////////////////////////////
// 6. General Utils (Loading states, saving results, etc.)
////////////////////////////////////////////////////////////////////////

function setLoading(isLoading) {
  const buttons = document.querySelectorAll('.btn, .action-button');
  buttons.forEach(btn => {
    if (isLoading) {
      btn.disabled = true;
      if (!btn.dataset.originalText) {
        btn.dataset.originalText = btn.innerHTML;
      }
      btn.innerHTML = '⌛ Loading...';
    } else {
      btn.disabled = false;
      if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
        delete btn.dataset.originalText;
      }
    }
  });
}

function showLocalizedToast(key, type = 'info') {
  const text = translations[currentLang][key] || key;
  showToast(text, type);
}

function updateSavedResults() {
  try {
    localStorage.setItem("savedResults", resultsDiv.innerHTML);
  } catch (error) {
    console.error("Error saving results:", error);
  }
}
function loadSavedResults() {
  try {
    const saved = localStorage.getItem("savedResults");
    if (saved) {
      resultsDiv.innerHTML = saved;
    }
  } catch (error) {
    console.error("Error loading saved results:", error);
  }
}

async function getCurrentTab() {
  try {
    if (!chrome.tabs) throw new Error('Chrome tabs API not available');
    const queryOptions = { active: true, currentWindow: true };
    const tabs = await new Promise((resolve, reject) => {
      chrome.tabs.query(queryOptions, (ts) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        resolve(ts);
      });
    });
    return tabs[0];
  } catch (error) {
    console.error("getCurrentTab error:", error);
    showLocalizedToast("failedToGetCurrentTab", "error");
    return null;
  }
}

// Enhanced auto-detection
async function autoFetchFromCurrentTab() {
  try {
    setLoading(true);
    const tab = await getCurrentTab();
    if (!tab?.url) return;

    // Auto-detect YouTube URL from clipboard if not on YouTube
    if (!tab.url.includes('youtube.com')) {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText.includes('youtube.com')) {
        youtubeLinkInput.value = clipboardText;
        await fetchYouTubeInfo(clipboardText);
        return;
      }
    } else {
      youtubeLinkInput.value = tab.url;
      await fetchYouTubeInfo(tab.url);
    }
  } catch (error) {
    console.error('Auto-fetch error:', error);
    showLocalizedToast('autoFetchError', 'error');
  } finally {
    setLoading(false);
  }
}

////////////////////////////////////////////////////////////////////////
// 7. Event Listeners for Compact Interface
////////////////////////////////////////////////////////////////////////

// Main input handler - can detect YouTube URL or song title
fetchYouTubeBtn.addEventListener('click', () => {
  const input = youtubeLinkInput.value.trim();
  if (!input) return;
  
  // Check if it's a YouTube URL
  if (parseYouTubeId(input)) {
    handleYouTubeInput();
  } else {
    // Treat as song title and search Spotify
    doSpotifySearch(input);
  }
});

// Show Spotify link input section
fetchSpotifyLinksBtn.addEventListener('click', () => {
  if (spotifyLinkSection.style.display === 'none' || !spotifyLinkSection.style.display) {
    spotifyLinkSection.style.display = 'block';
    manualSpotifyInput.focus();
  } else {
    const links = manualSpotifyInput.value.trim();
    if (links) {
      handleSpotifyLinks();
    }
    spotifyLinkSection.style.display = 'none';
  }
});

// Search Spotify directly
searchSpotifyBtn.addEventListener('click', () => {
  const input = youtubeLinkInput.value.trim();
  if (input) {
    doSpotifySearch(input);
  }
});

////////////////////////////////////////////////////////////////////////
// 8. Keyboard Shortcuts
////////////////////////////////////////////////////////////////////////

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    switch(e.key) {
      case 'Enter':
        e.preventDefault();
        fetchYouTubeBtn.click();
        break;
      case 's':
        e.preventDefault();
        searchSpotifyBtn.click();
        break;
      case 'l':
        e.preventDefault();
        clearResultsBtn.click();
        break;
    }
  }
});

////////////////////////////////////////////////////////////////////////
// 9. DOMContentLoaded Initialization
////////////////////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", async () => {
  try {
    loadSavedResults();

    // YouTube info is stored but not displayed in compact interface
    // const savedTitle = localStorage.getItem("youtubeTitle");
    // const savedDescription = localStorage.getItem("youtubeDescription");

    await autoFetchFromCurrentTab();

    chrome.storage.local.get('language', (data) => {
      const savedLang = data.language || 'en';
      updateLanguage(savedLang);
    });

    const languageSelect = document.getElementById('languageSelect');
    languageSelect.addEventListener('change', function () {
      updateLanguage(this.value);
    });

    fetchYouTubeBtn.addEventListener("click", () => fetchYouTubeInfo(youtubeLinkInput.value.trim()));
    searchSpotifyBtn.addEventListener("click", () => doSpotifySearch(spotifySearchInput.value.trim()));
    fetchSpotifyLinksBtn.addEventListener("click", () => {
      try {
        const raw = manualSpotifyInput.value.trim();
        if (!raw) {
          showLocalizedToast("pleaseEnterSpotifyLink", "error");
          return;
        }
        resultsDiv.innerHTML = "";
        const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        lines.forEach((line) => {
          if (line.includes("spotify.com/track/")) {
            const trackId = parseSpotifyId(line, "track");
            if (trackId) getSpotifyTrackDetails(trackId);
            else showLocalizedToast(`invalidLink: ${line}`, "error");
          } else {
            showLocalizedToast(`unknownLink: ${line}`, "error");
          }
        });
      } catch (err) {
        console.error(err);
        showLocalizedToast("errorProcessingSpotifyLink", "error");
      }
    });

    clearResultsBtn.addEventListener("click", () => {
      resultsDiv.innerHTML = `
        <div class="empty-state" id="emptyState">
          <i class="bx bx-search empty-icon"></i>
          <p>Search for songs to find ISRC codes</p>
        </div>
      `;
      updateResultsCount();
      updateSavedResults();
      showLocalizedToast("resultsCleared", "success");
    });

    openOptionsBtn.addEventListener("click", () => {
      try {
        if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
        else window.open(chrome.runtime.getURL("options.html"));
      } catch (error) {
        console.error(error);
        showLocalizedToast("errorOpeningOptions", "error");
      }
    });
  } catch (error) {
    console.error("DOMContentLoaded error:", error);
    showLocalizedToast("failedToInitializeExtension", "error");
  }
});
