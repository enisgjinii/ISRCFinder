// popup.js
import { translations } from './utils/translations.js';
import { showToast } from './utils/toast.js';
// If you have specialized classes or utilities, import them here:
// import { SearchHistory } from './utils/searchHistory.js';
// import { compareTracksFeature } from './utils/trackCompare.js';
// import { Statistics } from './utils/statistics.js';
// import { showUserGuide } from './utils/guide.js';

////////////////////////////////////////////////////////////////////////
// Global selectors & variables
////////////////////////////////////////////////////////////////////////

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

function updateLanguage(lang) {
  currentLang = lang;
  const texts = translations[lang] || translations.en;

  // Example: update placeholders/text
  youtubeLinkInput.placeholder = texts.youtubeUrl || "🔗 YouTube URL";
  fetchYouTubeBtn.textContent = texts.getInfo || "✨ Get Info";
  // If you have multiple info-title elements, you'll need to carefully select them
  document.querySelectorAll('#youtubeInfo .info-title')[0].textContent = texts.videoTitle || "🎬 Title";
  document.querySelectorAll('#youtubeInfo .info-title')[1].textContent = texts.videoDescription || "📝 Description";
  spotifySearchInput.placeholder = texts.songSearch || "🎵 Song title to search";
  searchSpotifyBtn.textContent = texts.searchSpotify || "🔍 Search Spotify";
  manualSpotifyInput.placeholder = texts.spotifyLinkPlaceholder || "🔗 Or paste Spotify link here";
  fetchSpotifyLinksBtn.textContent = texts.getDetails || "✨ Get Details";
  document.querySelector('.card-title').textContent = texts.results || "📑 Results";
  openOptionsBtn.title = texts.settings || "Settings";

  // Also set the language selector dropdown
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.value = lang;
  }

  // Save language preference
  chrome.storage.local.set({ language: lang });
}

////////////////////////////////////////////////////////////////////////
// 2. Handling YouTube info
////////////////////////////////////////////////////////////////////////

// We’ll use a more advanced string cleaning for the video title
function cleanYouTubeTitle(title = "") {
  return title
    .replace(/\(.*?\)/g, "")   // remove parentheses
    .replace(/\[.*?\]/g, "")   // remove brackets
    .replace(/\b\d{4}\b/g, "") // remove standalone 4-digit years
    .trim();
}

// Extract video ID from youtube.com URLs
function parseYouTubeId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get("v");
  } catch (error) {
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

    // Example: show a toast that we're fetching
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
        youtubeInfoDiv.style.display = "block";
        videoTitleEl.textContent = snippet.title || "(No title)";
        videoDescriptionEl.textContent = snippet.description || "(No description)";

        // Save to localStorage so we can restore if the user closes & reopens popup
        localStorage.setItem("youtubeTitle", snippet.title || "");
        localStorage.setItem("youtubeDescription", snippet.description || "");

        showLocalizedToast("youtubeInfoFetched", "success");

        // Optionally auto-trigger Spotify search with a cleaned version
        const cleanedTitle = cleanYouTubeTitle(snippet.title || "");
        if (cleanedTitle) {
          setTimeout(() => doSpotifySearch(cleanedTitle), 500);
        }
        resolve(true);
      });
    });
  } catch (error) {
    console.error(error);
    showLocalizedToast("failedToFetchYouTubeInfo", "error");
  } finally {
    setLoading(false);
  }
}

////////////////////////////////////////////////////////////////////////
// 3. Searching Spotify
////////////////////////////////////////////////////////////////////////

// Use Dice coefficient for more robust fuzzy matching
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

    // Check local cache to reduce repeated calls
    const cacheKey = `spotifySearch_${query.toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      buildSpotifySearchResultsUI(parsed, query);
      return;
    }

    // If not cached, do an API request via background.js
    chrome.runtime.sendMessage({ action: "SEARCH_SPOTIFY_TRACKS", query }, (resp) => {
      if (!resp || !resp.success) {
        showLocalizedToast(`error: ${resp?.error || "noResponse"}`, "error");
        return;
      }
      // Save to cache
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

// Build the UI for the results of a Spotify search
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

    // Add "Details" button handler
    row.querySelector(".get-details").addEventListener("click", () => {
      getSpotifyTrackDetails(track.id);
    });

    resultsDiv.appendChild(row);
  });

  // If best similarity is below a threshold, show a fallback button
  const bestSim = Math.max(...items.map(t => computeDiceCoefficient(originalQuery, t.name)));
  if (bestSim < 0.3 && videoDescriptionEl.textContent.trim()) {
    const fallbackBtn = document.createElement("button");
    fallbackBtn.classList.add("btn", "btn-small", "btn-purple");
    fallbackBtn.textContent = "Try with Description 🔄";
    fallbackBtn.addEventListener("click", () => {
      const fallbackQuery = videoDescriptionEl.textContent
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

// Basic example of building track details UI
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

  // Copy ISRC/UPC to clipboard
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

  // Optionally add a "Similar Tracks" button or a "Lyrics" button
  const lyricsBtn = document.createElement('button');
  lyricsBtn.className = 'action-button';
  lyricsBtn.textContent = '📝 Lyrics';
  lyricsBtn.addEventListener('click', async () => {
    const artist = trackData.artists[0]?.name || '';
    const title = trackData.name || '';
    const lyrics = await fetchLyrics(artist, title);
    showLyricsModal(lyrics, trackData.name);
  });
  container.querySelector('.result-actions').appendChild(lyricsBtn);

  // If there's a preview URL, show an audio preview
  if (trackData.preview_url) {
    const audioPlayer = createAudioPlayer(trackData.preview_url, trackData.name);
    container.querySelector('.result-actions').appendChild(audioPlayer);
  }

  resultsDiv.appendChild(container);
  updateSavedResults();
}

// Example multi-source lyric search
async function fetchLyrics(artist, title) {
  let lyrics = await fetchLyricsFromOvh(artist, title);
  if (!lyrics) {
    // fallback to a second source here (e.g., Genius or AudD)
    // lyrics = await fetchLyricsFromGenius(artist, title);
  }
  return lyrics || "Lyrics not found.";
}

async function fetchLyricsFromOvh(artist, title) {
  try {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    const resp = await fetch(url);
    const data = await resp.json();
    return data.lyrics || "";
  } catch {
    return "";
  }
}

// Simple lyrics modal
function showLyricsModal(lyrics, trackName) {
  const modal = document.createElement('div');
  modal.className = 'lyrics-modal';
  modal.innerHTML = `
    <div class="lyrics-content">
      <h3>${trackName}</h3>
      <pre style="white-space: pre-wrap; font-size: 13px;">${lyrics}</pre>
      <button class="btn btn-blue">Close</button>
    </div>
  `;
  modal.querySelector('button').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  document.body.appendChild(modal);
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
      // Optionally reset the other progress bar
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
// 6. Batch Processing Feature
////////////////////////////////////////////////////////////////////////

function addBatchProcessingFeature() {
  const batchUploadBtn = document.createElement('button');
  batchUploadBtn.className = 'btn btn-purple';
  batchUploadBtn.innerHTML = '📄 Batch Process';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.txt,.csv';
  fileInput.style.display = 'none';

  batchUploadBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target.result;
      const links = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.includes('youtube.com/watch') || line.includes('spotify.com/track'));

      showToast(`Processing ${links.length} links...`, 'info');

      for (const link of links) {
        if (link.includes('youtube.com')) {
          await fetchYouTubeInfo(link);
        } else if (link.includes('spotify.com')) {
          const trackId = parseSpotifyId(link, 'track');
          if (trackId) await getSpotifyTrackDetails(trackId);
        }
      }
    };
    reader.readAsText(file);
  });

  // Insert the new button above your first .input-group in that card
  const firstCard = document.querySelector('.card');
  const firstInputGroup = firstCard.querySelector('.input-group');
  firstCard.insertBefore(batchUploadBtn, firstInputGroup);
}

////////////////////////////////////////////////////////////////////////
// 7. General Utils (Loading states, saving results, etc.)
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

// Save results to localStorage so we can restore them next time
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

async function autoFetchFromCurrentTab() {
  try {
    const tab = await getCurrentTab();
    if (!tab) {
      showLocalizedToast("couldNotAccessCurrentTab", "error");
      return;
    }
    if (!tab.url?.includes("youtube.com/watch")) {
      // Not a YT watch page, so we skip auto fetching
      return;
    }
    // Set the URL in the input and fetch info
    youtubeLinkInput.value = tab.url;
    await fetchYouTubeInfo(tab.url);
  } catch (error) {
    console.error("Auto-fetch error:", error);
    showLocalizedToast("failedToAutoFetchVideoInfo", "error");
  }
}

////////////////////////////////////////////////////////////////////////
// 8. DOMContentLoaded Initialization
////////////////////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load saved results from localStorage
    loadSavedResults();

    // Load saved YouTube info from localStorage
    const savedTitle = localStorage.getItem("youtubeTitle");
    const savedDescription = localStorage.getItem("youtubeDescription");
    if (savedTitle || savedDescription) {
      youtubeInfoDiv.style.display = "block";
      videoTitleEl.textContent = savedTitle || "(No title)";
      videoDescriptionEl.textContent = savedDescription || "(No description)";
    }

    // Possibly attempt to auto-fetch from current tab
    await autoFetchFromCurrentTab();

    // Load saved language preference
    chrome.storage.local.get('language', (data) => {
      const savedLang = data.language || 'en';
      updateLanguage(savedLang);
    });
    // If the user changes language in Options, listen for changes:
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.language) {
        updateLanguage(changes.language.newValue);
      }
    });

    // Initialize language selector
    const languageSelect = document.getElementById('languageSelect');
    languageSelect.addEventListener('change', function () {
      updateLanguage(this.value);
    });

    // Theme is already set at the top

    // Event listeners
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
      resultsDiv.innerHTML = "";
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

    // Add advanced features
    addBatchProcessingFeature();
    addExportFeature(); // see function below for exporting CSV, or place it inline

    // If you have a user guide or a compare feature, enable them:
    // const searchHistory = new SearchHistory();
    // const compareBtn = compareTracksFeature(resultsDiv);
    // if (!localStorage.getItem('guideSeen')) {
    //   showUserGuide(currentLang);
    //   localStorage.setItem('guideSeen', 'true');
    // }

  } catch (error) {
    console.error("DOMContentLoaded error:", error);
    showLocalizedToast("failedToInitializeExtension", "error");
  }
});

////////////////////////////////////////////////////////////////////////
// 9. Export CSV Feature (optional)
////////////////////////////////////////////////////////////////////////

function addExportFeature() {
  const exportBtn = document.createElement('button');
  exportBtn.className = 'btn btn-blue';
  exportBtn.innerHTML = '📥 Export Results';
  exportBtn.style.marginLeft = '8px';

  exportBtn.addEventListener('click', () => {
    const allItems = Array.from(resultsDiv.querySelectorAll('.result-item'));
    if (!allItems.length) {
      showLocalizedToast("noResultsToExport", "warning");
      return;
    }

    // Build CSV from each .result-item
    const results = allItems.map(item => {
      const titleEl = item.querySelector('.result-title');
      const subtitleEl = item.querySelector('.result-subtitle');
      const isrcBtn = item.querySelector('.copy-isrc');
      const upcBtn = item.querySelector('.copy-upc');
      return {
        title: titleEl ? titleEl.textContent : '',
        artist: subtitleEl ? subtitleEl.textContent.split('•')[0].trim() : '',
        isrc: isrcBtn ? (isrcBtn.getAttribute('data-value') || '') : '',
        upc: upcBtn ? (upcBtn.getAttribute('data-value') || '') : ''
      };
    });

    const header = ['Title', 'Artist', 'ISRC', 'UPC'];
    const csvRows = [header.join(',')];
    for (const r of results) {
      csvRows.push([
        r.title.replace(/,/g, ';'),
        r.artist.replace(/,/g, ';'),
        r.isrc,
        r.upc
      ].join(','));
    }
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exported_results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Append the Export button next to the Clear Results button
  const parent = document.getElementById('clearResultsBtn').parentNode;
  parent.appendChild(exportBtn);
}
