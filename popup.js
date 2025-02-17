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
    showToast("Failed to get current tab", "error");
    return null;
  }
}

async function autoFetchFromCurrentTab() {
  try {
    const tab = await getCurrentTab();
    if (!tab) {
      showToast("Could not access current tab", "error");
      return;
    }
    if (!tab.url?.includes("youtube.com/watch")) {
      showToast("Please open a YouTube video first", "warning");
      return;
    }
    // Set the URL in the input and fetch info
    youtubeLinkInput.value = tab.url;
    await fetchYouTubeInfo(tab.url);
  } catch (error) {
    console.error("Auto-fetch error:", error);
    showToast("Failed to auto-fetch video info", "error");
  }
}

// Import toast utility
import { showToast } from './utils/toast.js';

// Configuration loading
async function loadConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'theme'], (config) => {
      if (chrome.runtime.lastError) {
        console.error('Config load error:', chrome.runtime.lastError);
        showToast('Failed to load configuration', 'error');
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

async function fetchYouTubeInfo(url) {
  try {
    if (!url) {
      showToast('Please provide a valid YouTube URL', 'error');
      return false;
    }
    
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      showToast("Invalid YouTube URL format", "error");
      return;
    }
    fetchYouTubeBtn.disabled = true;
    showToast("Fetching video info...", "info");
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_YOUTUBE_SNIPPET", videoId }, (resp) => {
        fetchYouTubeBtn.disabled = false;
        if (!resp || !resp.success) {
          showToast(`Error: ${resp?.error || "No response"}`, "error");
          resolve(false);
          return;
        }
        const items = resp.youtubeData.items || [];
        if (!items.length) {
          showToast("Video not found. 😕", "info");
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

        showToast("YouTube info fetched! 🎉", "success");
        // Auto-trigger Spotify search if a title exists
        if (snippet.title) {
          setTimeout(() => doSpotifySearch(snippet.title), 500);
        }
        resolve(true);
      });
    });
  } catch (error) {
    console.error("YouTube fetch error:", error);
    showToast("Error fetching YouTube info.", "error");
    fetchYouTubeBtn.disabled = false;
    return false;
  }
}

fetchYouTubeBtn.addEventListener("click", async () => {
  const link = youtubeLinkInput.value.trim();
  if (!link) {
    showToast("Please enter a YouTube URL", "error");
    return;
  }
  await fetchYouTubeInfo(link);
});

searchSpotifyBtn.addEventListener("click", () => {
  try {
    const query = spotifySearchInput.value.trim();
    if (!query) {
      showToast("Please enter a Spotify search query! 🔍", "error");
      return;
    }
    doSpotifySearch(query);
  } catch (error) {
    console.error(error);
    showToast("Error starting Spotify search.", "error");
  }
});

function doSpotifySearch(query) {
  try {
    if (!query || typeof query !== 'string') {
      showToast('Invalid search query', 'error');
      return;
    }
    
    resultsDiv.innerHTML = "";
    chrome.runtime.sendMessage({ action: "SEARCH_SPOTIFY_TRACKS", query }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Error: ${resp?.error || "No response"}`, "error");
        return;
      }
      const items = resp.searchData.tracks?.items || [];
      if (!items.length) {
        showToast("No songs found. 😕", "info");
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
        showToast("Low similarity. Try with description?", "info");
      }
      showToast(`Found ${items.length} songs! 🎶`, "success");
      items.forEach((track) => buildTrackSearchRow(track, query));
      updateSavedResults();
    });
  } catch (error) {
    console.error(error);
    showToast("Error during Spotify search.", "error");
  }
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
    showToast("Error building result row", "error");
  }
}

fetchSpotifyLinksBtn.addEventListener("click", () => {
  try {
    const raw = manualSpotifyInput.value.trim();
    if (!raw) {
      showToast("Please enter a Spotify link! 🔗", "error");
      return;
    }
    resultsDiv.innerHTML = "";
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    lines.forEach((line) => {
      if (line.includes("spotify.com/track/")) {
        const trackId = parseSpotifyId(line, "track");
        if (trackId) getSpotifyTrackDetails(trackId);
        else showToast(`Invalid link: ${line}`, "error");
      } else {
        showToast(`Unknown link: ${line}`, "error");
      }
    });
  } catch (error) {
    console.error(error);
    showToast("Error processing the Spotify link.", "error");
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
        showToast(`Error: ${resp?.error || "No response"}`, "error");
        return;
      }
      buildTrackDetailsCard(resp.trackData, resp.audioFeatures);
    });
  } catch (error) {
    console.error(error);
    showToast("Error fetching track details.", "error");
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
    showToast("Results cleared. 🗑️", "success");
  } catch (error) {
    console.error(error);
    showToast("Error clearing results.", "error");
  }
});

openOptionsBtn.addEventListener("click", () => {
  try {
    if (chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage();
    else window.open(chrome.runtime.getURL("options.html"));
  } catch (error) {
    console.error(error);
    showToast("Error opening options.", "error");
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
  } catch (error) {
    console.error("DOMContentLoaded error:", error);
    showToast("Failed to initialize extension", "error");
  }
});
