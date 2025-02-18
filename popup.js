import { translations } from './utils/translations.js';
import { showToast } from './utils/toast.js';

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

function updateLanguage(lang) {
  currentLang = lang;
  const texts = translations[lang];

  // Update all placeholders and text content
  document.getElementById('youtubeLinkInput').placeholder = texts.youtubeUrl;
  document.getElementById('fetchYouTubeBtn').textContent = texts.getInfo;
  document.querySelector('#youtubeInfo .info-title').textContent = texts.videoTitle;
  document.querySelector('#youtubeInfo .info-title:nth-child(3)').textContent = texts.videoDescription;
  document.getElementById('spotifySearchInput').placeholder = texts.songSearch;
  document.getElementById('searchSpotifyBtn').textContent = texts.searchSpotify;
  document.getElementById('manualSpotifyInput').placeholder = texts.spotifyLinkPlaceholder;
  document.getElementById('fetchSpotifyLinksBtn').textContent = texts.getDetails;
  document.querySelector('.card-title').textContent = texts.results;
  document.getElementById('openOptionsBtn').title = texts.settings;

  // Update language selector
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    languageSelect.value = lang;
  }

  // Save language preference
  chrome.storage.local.set({ language: lang });
}

async function getCurrentTab() {
  try {
    if (!chrome.tabs) {
      throw new Error('Chrome tabs API not available');
    }
    
    const queryOptions = { active: true, currentWindow: true };
    const tabs = await new Promise((resolve, reject) => {
      chrome.tabs.query(queryOptions, (tabs) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }
        resolve(tabs);
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
      showLocalizedToast("pleaseOpenYouTubeVideoFirst", "warning");
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

// Configuration loading
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'theme'], (config) => {
      if (chrome.runtime.lastError) {
        console.error('Config load error:', chrome.runtime.lastError);
        showLocalizedToast('failedToLoadConfiguration', 'error');
        resolve({});
      } else {
        resolve(config);
      }
    });
  });
}

// Theme handling
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
prefersDark.addEventListener("change", (e) => {
  if (localStorage.getItem("theme") === "system") {
    setTheme("system");
  }
});

// Save and load search results from localStorage
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
    const intersection = new Set([...set1].filter((x) => set2.has(x)));
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

// Add loading state management
function setLoading(isLoading) {
  const buttons = document.querySelectorAll('.btn');
  buttons.forEach(btn => {
    btn.disabled = isLoading;
    if (isLoading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '⌛ Loading...';
    } else if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      delete btn.dataset.originalText;
    }
  });
}

// Enhanced error handling
async function handleError(error, context) {
  console.error(`Error in ${context}:`, error);
  
  let errorMessage;
  if (error.message.includes('Network Error')) {
    errorMessage = translations[currentLang].networkError;
  } else if (error.message.includes('API key')) {
    errorMessage = translations[currentLang].invalidApiKey;
  } else if (error.message.includes('quota')) {
    errorMessage = translations[currentLang].quotaExceeded;
  } else {
    errorMessage = `${translations[currentLang].generalError}: ${error.message}`;
  }
  
  showLocalizedToast(errorMessage, 'error');
}

// Enhanced fetch YouTube info
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
    fetchYouTubeBtn.disabled = true;
    showLocalizedToast("fetchingVideoInfo", "info");
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
        spotifySearchInput.value = snippet.title || "";

        // Save the YouTube video info in localStorage
        localStorage.setItem("youtubeTitle", snippet.title || "");
        localStorage.setItem("youtubeDescription", snippet.description || "");

        showLocalizedToast("youtubeInfoFetched", "success");
        // Auto-trigger Spotify search if a title exists
        if (snippet.title) {
          setTimeout(() => doSpotifySearch(snippet.title), 500);
        }
        resolve(true);
      });
    });
  } catch (error) {
    await handleError(error, 'fetchYouTubeInfo');
  } finally {
    setLoading(false);
  }
}

// Enhanced Spotify search
async function doSpotifySearch(query) {
  try {
    setLoading(true);
    if (!query || typeof query !== 'string') {
      showLocalizedToast('invalidSearchQuery', 'error');
      return;
    }
    
    resultsDiv.innerHTML = "";
    chrome.runtime.sendMessage({ action: "SEARCH_SPOTIFY_TRACKS", query }, (resp) => {
      if (!resp || !resp.success) {
        showLocalizedToast(`error: ${resp?.error || "noResponse"}`, "error");
        return;
      }
      const items = resp.searchData.tracks?.items || [];
      if (!items.length) {
        showLocalizedToast("noSongsFound", "info");
        return;
      }
      let maxSim = 0;
      items.forEach((track) => {
        const sim = computeSimilarity(query, track.name);
        if (sim > maxSim) maxSim = sim;
      });
      if (maxSim < 0.4 && videoDescriptionEl.textContent.trim() !== "") {
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
        resultsDiv.appendChild(fallbackBtn);
        showLocalizedToast("lowSimilarityTryWithDescription", "info");
      }
      showLocalizedToast("foundSongs", "success");
      items.forEach((track) => buildTrackSearchRow(track, query));
      updateSavedResults();
    });
  } catch (error) {
    await handleError(error, 'doSpotifySearch');
  } finally {
    setLoading(false);
  }
}

// Add input validation
function validateYouTubeUrl(url) {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
  return pattern.test(url);
}

function validateSpotifyUrl(url) {
  const pattern = /^(https?:\/\/)?(open\.)?spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]+$/;
  return pattern.test(url);
}
function buildTrackSearchRow(track, query) {
  try {
    if (!track || !track.name) {
      throw new Error('Invalid track data');
    }
    
    const simScore = computeSimilarity(query, track.name);
    const row = document.createElement("div");
    row.classList.add("result-item");
    row.innerHTML = `
      <img 
        src="${track.album.images[0]?.url || "placeholder.png"}" 
        alt="${track.name}"
        class="result-thumbnail"
      />
      <div class="result-content">
        <div class="result-title">${track.name}</div>
        <div class="result-subtitle">${track.artists[0]?.name || "Unknown"} • ${track.album.name}</div>
      </div>
      <div class="result-actions">
        <span class="result-badge">${(simScore * 100).toFixed(0)}%</span>
        <button class="action-button get-details" title="Get track details">
          <span>Details</span>
        </button>
      </div>
    `;
    row.querySelector(".get-details").addEventListener("click", () => {
      getSpotifyTrackDetails(track.id);
    });
    resultsDiv.appendChild(row);
    updateSavedResults();
  } catch (error) {
    console.error(error);
    showLocalizedToast("errorBuildingResultRow", "error");
  }
}

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
  } catch (error) {
    console.error(error);
    showLocalizedToast("errorProcessingSpotifyLink", "error");
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
  try {
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
        <button class="action-button" data-value="${trackData.external_ids?.isrc}" title="Copy ISRC">
          📋 ISRC
        </button>
        <button class="action-button" data-value="${trackData.album?.external_ids?.upc}" title="Copy UPC">
          📋 UPC
        </button>
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
    resultsDiv.appendChild(container);
    updateSavedResults();
  } catch (error) {
    console.error(error);
    showLocalizedToast("errorBuildingDetailsCard", "error");
  }
}

clearResultsBtn.addEventListener("click", () => {
  try {
    resultsDiv.innerHTML = "";
    updateSavedResults();
    showLocalizedToast("resultsCleared", "success");
  } catch (error) {
    console.error(error);
    showLocalizedToast("errorClearingResults", "error");
  }
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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Load configuration
    const config = await loadConfig();
    
    // Load saved YouTube info from localStorage if it exists
    const savedTitle = localStorage.getItem("youtubeTitle");
    const savedDescription = localStorage.getItem("youtubeDescription");
    if (savedTitle || savedDescription) {
      youtubeInfoDiv.style.display = "block";
      videoTitleEl.textContent = savedTitle || "(No title)";
      videoDescriptionEl.textContent = savedDescription || "(No description)";
    }
    await autoFetchFromCurrentTab();

    // Load saved language preference
    chrome.storage.local.get('language', function(data) {
      const savedLang = data.language || 'en';
      updateLanguage(savedLang);
    });

    // Listen for language changes from options page
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.language) {
        updateLanguage(changes.language.newValue);
      }
    });

    // Initialize language selector
    const languageSelect = document.getElementById('languageSelect');
    
    // Load saved language preference
    chrome.storage.local.get('language', function(data) {
      const savedLang = data.language || 'en';
      languageSelect.value = savedLang;
      updateLanguage(savedLang);
    });

    // Handle language changes
    languageSelect.addEventListener('change', function() {
      const selectedLang = this.value;
      updateLanguage(selectedLang);
    });

  } catch (error) {
    console.error("DOMContentLoaded error:", error);
    showLocalizedToast("failedToInitializeExtension", "error");
  }
});

function showLocalizedToast(key, type = 'info') {
  const text = translations[currentLang][key] || key;
  showToast(text, type);
}
