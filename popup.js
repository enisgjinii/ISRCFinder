// popup.js

const darkModeToggle = document.getElementById("darkModeToggle");
const expandViewBtn = document.getElementById("expandViewBtn");
const openOptionsBtn = document.getElementById("openOptionsBtn");

const detectCurrentTabBtn = document.getElementById("detectCurrentTabBtn");
const youtubeSimilarBtn = document.getElementById("youtubeSimilarBtn");

const spotifyLinksInput = document.getElementById("spotifyLinksInput");
const fetchLinksBtn = document.getElementById("fetchLinksBtn");
const clearResultsBtn = document.getElementById("clearResultsBtn");

const searchTrackInput = document.getElementById("searchTrackInput");
const searchTrackBtn = document.getElementById("searchTrackBtn");
const searchAlbumInput = document.getElementById("searchAlbumInput");
const searchAlbumBtn = document.getElementById("searchAlbumBtn");
const searchResultsDiv = document.getElementById("searchResults");

const resultsDiv = document.getElementById("results");
const toastContainer = document.getElementById("toastContainer");
const htmlRoot = document.documentElement;

// Toast
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.classList.add("toast", "fade-in");
  if (type === "success") toast.classList.add("toast-success");
  else if (type === "error") toast.classList.add("toast-error");
  toast.textContent = message;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove("fade-in");
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Dark Mode
async function loadDarkModePreference() {
  chrome.storage.local.get("darkModeEnabled", (data) => {
    if (data.darkModeEnabled) {
      darkModeToggle.checked = true;
      htmlRoot.classList.add("dark-mode");
    }
  });
}
function saveDarkModePreference(enabled) {
  chrome.storage.local.set({ darkModeEnabled: enabled });
}
darkModeToggle.addEventListener("change", () => {
  if (darkModeToggle.checked) {
    htmlRoot.classList.add("dark-mode");
    saveDarkModePreference(true);
  } else {
    htmlRoot.classList.remove("dark-mode");
    saveDarkModePreference(false);
  }
});

// Expand Popup
let isExpanded = false;
expandViewBtn.addEventListener("click", () => {
  isExpanded = !isExpanded;
  if (isExpanded) {
    htmlRoot.classList.add("expanded-popup");
    expandViewBtn.textContent = "Zvogëlo";
  } else {
    htmlRoot.classList.remove("expanded-popup");
    expandViewBtn.textContent = "Zgjero";
  }
});

// Open Options
openOptionsBtn.addEventListener("click", () => {
  // In MV2 cross-browser, we can just open the options page
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    // Fallback if not supported
    window.open(chrome.runtime.getURL("options.html"));
  }
});

// Detect Current Tab
detectCurrentTabBtn.addEventListener("click", () => {
  // 'tabs' permission used
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs.length) {
      showToast("Asnjë tab aktiv.", "error");
      return;
    }
    const url = tabs[0].url || "";
    if (url.includes("spotify.com/track/") || url.includes("spotify.com/album/")) {
      spotifyLinksInput.value = url;
      showToast("👍 U zbulua link Spotify!", "success");
    } else if (url.includes("youtube.com/watch")) {
      showToast("Jeni në YouTube. Provo 'Youtube → Spotify'!", "info");
    } else {
      showToast("Nuk është Spotify ose YouTube!", "error");
    }
  });
});

// YouTube → Spotify
youtubeSimilarBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) {
      showToast("Asnjë tab aktiv.", "error");
      return;
    }
    const tab = tabs[0];
    if (!tab.url.includes("youtube.com/watch")) {
      showToast("Faqja nuk është YouTube video!", "error");
      return;
    }
    const videoTitle = tab.title.replace(" - YouTube", "").trim();
    if (!videoTitle) {
      showToast("Nuk mund të marr titullin e videos.", "error");
      return;
    }
    chrome.runtime.sendMessage({ action: "GET_YOUTUBE_SIMILAR", title: videoTitle }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim: ${resp?.error || "No resp"}`, "error");
        return;
      }
      const items = resp.searchData.tracks?.items || [];
      if (!items.length) {
        showToast("Asnjë rezultat i ngjashëm me titullin.", "info");
        return;
      }
      searchResultsDiv.innerHTML = "";
      items.forEach((track) => {
        const row = document.createElement("div");
        row.classList.add("search-result-item");
        row.innerHTML = `
          <span>🎵 ${track.name} — ${track.artists?.[0]?.name || "?"}</span>
          <button class="btn btn-small btn-green">Merr Info</button>
        `;
        row.querySelector("button").addEventListener("click", () => {
          fetchTrackById(track.id);
        });
        searchResultsDiv.appendChild(row);
      });
      showToast("Rezultatet nga YouTube → Spotify", "success");
    });
  });
});

// Fetch Links (Track or Album)
fetchLinksBtn.addEventListener("click", async () => {
  resultsDiv.innerHTML = "";
  const raw = spotifyLinksInput.value.trim();
  if (!raw) {
    showToast("Vendosni të paktën një URL Spotify.", "error");
    return;
  }
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.includes("spotify.com/track/")) {
      const trackId = parseId(line, "track");
      if (!trackId) {
        showToast(`Link i pavlefshëm i track: ${line}`, "error");
        continue;
      }
      await fetchTrackById(trackId);
    } else if (line.includes("spotify.com/album/")) {
      const albumId = parseId(line, "album");
      if (!albumId) {
        showToast(`Link i pavlefshëm i albumit: ${line}`, "error");
        continue;
      }
      await fetchAlbumById(albumId);
    } else {
      showToast(`Nuk njihet si track ose album: ${line}`, "error");
    }
  }
  showToast("Përfundoi marrja e link-eve!", "success");
});
function parseId(link, type) {
  if (!link.includes(`spotify.com/${type}/`)) return "";
  const parts = link.split(`${type}/`);
  if (parts.length < 2) return "";
  return parts[1].split("?")[0];
}

async function fetchTrackById(trackId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "GET_TRACK_DATA", trackId }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim track: ${resp?.error || "No resp"}`, "error");
        return resolve();
      }
      const el = buildTrackEl(resp.trackData, resp.audioFeatures);
      resultsDiv.appendChild(el);
      resolve();
    });
  });
}
async function fetchAlbumById(albumId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "GET_ALBUM_DATA", albumId }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim album: ${resp?.error || "No resp"}`, "error");
        return resolve();
      }
      const el = buildAlbumEl(resp.albumData);
      resultsDiv.appendChild(el);
      resolve();
    });
  });
}

// Clear
clearResultsBtn.addEventListener("click", () => {
  resultsDiv.innerHTML = "";
  searchResultsDiv.innerHTML = "";
  showToast("Rezultatet u pastruan.", "success");
});

// Search Tracks
searchTrackBtn.addEventListener("click", () => {
  const query = searchTrackInput.value.trim();
  if (!query) {
    showToast("Vendosni emrin e këngës.", "error");
    return;
  }
  chrome.runtime.sendMessage({ action: "SEARCH_TRACKS", query }, (resp) => {
    if (!resp || !resp.success) {
      showToast(`Gabim: ${resp?.error || "No resp"}`, "error");
      return;
    }
    const items = resp.searchData.tracks?.items || [];
    if (!items.length) {
      showToast("Asnjë këngë e gjetur.", "info");
      return;
    }
    searchResultsDiv.innerHTML = "";
    items.forEach((track) => {
      const row = document.createElement("div");
      row.classList.add("search-result-item");
      row.innerHTML = `
        <span>🎶 ${track.name} – ${track.artists?.[0]?.name || "?"}</span>
        <button class="btn btn-small btn-green">Merr Info</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        fetchTrackById(track.id);
      });
      searchResultsDiv.appendChild(row);
    });
    showToast("Rezultate Këngësh", "success");
  });
});

// Search Albums
searchAlbumBtn.addEventListener("click", () => {
  const query = searchAlbumInput.value.trim();
  if (!query) {
    showToast("Vendosni emrin e albumit.", "error");
    return;
  }
  chrome.runtime.sendMessage({ action: "SEARCH_ALBUMS", query }, (resp) => {
    if (!resp || !resp.success) {
      showToast(`Gabim: ${resp?.error || "No resp"}`, "error");
      return;
    }
    const items = resp.searchData.albums?.items || [];
    if (!items.length) {
      showToast("Asnjë album i gjetur.", "info");
      return;
    }
    searchResultsDiv.innerHTML = "";
    items.forEach((album) => {
      const row = document.createElement("div");
      row.classList.add("search-result-item");
      row.innerHTML = `
        <span>💿 ${album.name} – ${album.artists?.[0]?.name || "?"}</span>
        <button class="btn btn-small btn-green">Merr Info</button>
      `;
      row.querySelector("button").addEventListener("click", () => {
        fetchAlbumById(album.id);
      });
      searchResultsDiv.appendChild(row);
    });
    showToast("Rezultate Albumesh", "success");
  });
});

// Build UI
function buildTrackEl(trackData, audioFeatures) {
  const container = document.createElement("div");
  container.classList.add("track-result", "slide-in");

  const trackName = trackData.name || "Pa Emër";
  const artistName = trackData.artists?.[0]?.name || "Pa Artist";
  const cover = trackData.album?.images?.[0]?.url || "";
  const isrc = trackData.external_ids?.isrc || "N/A";
  const upc = trackData.album?.external_ids?.upc || "N/A";
  const popularity = trackData.popularity ?? "N/A";
  const albumName = trackData.album?.name || "Pa Album";
  const releaseDate = trackData.album?.release_date || "N/A";

  const heading = document.createElement("h3");
  heading.classList.add("track-title");
  heading.textContent = `🎵 ${trackName} – ${artistName}`;
  container.appendChild(heading);

  if (cover) {
    const img = document.createElement("img");
    img.src = cover;
    img.alt = "Kopertina e Albumit";
    img.classList.add("album-cover");
    container.appendChild(img);
  }

  const info = document.createElement("div");
  info.classList.add("track-info");
  info.innerHTML = `
    <p><strong>Album:</strong> ${albumName}</p>
    <p><strong>Data Publikimit:</strong> ${releaseDate}</p>
    <p><strong>Popullariteti:</strong> ${popularity}</p>
    <p><strong>ISRC:</strong> ${isrc} <button class="copy-btn" data-value="${isrc}">📋</button></p>
    <p><strong>UPC Albumi:</strong> ${upc} <button class="copy-btn" data-value="${upc}">📋</button></p>
  `;
  container.appendChild(info);

  if (audioFeatures) {
    const feats = document.createElement("div");
    feats.classList.add("audio-features");
    feats.innerHTML = `
      <p><strong>Danceability:</strong> ${audioFeatures.danceability ?? "N/A"}</p>
      <p><strong>Energy:</strong> ${audioFeatures.energy ?? "N/A"}</p>
      <p><strong>Tempo:</strong> ${audioFeatures.tempo ?? "N/A"}</p>
    `;
    container.appendChild(feats);
  }

  container.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-value") || "";
      if (val && val !== "N/A") {
        navigator.clipboard.writeText(val)
          .then(() => showToast(`U kopjua: ${val}`, "success"))
          .catch(() => showToast("Nuk u kopjua.", "error"));
      } else {
        showToast("Asgjë për të kopjuar!", "error");
      }
    });
  });

  const jsonBtn = document.createElement("button");
  jsonBtn.classList.add("btn", "btn-small", "btn-blue", "margin-top");
  jsonBtn.textContent = "Shkarko JSON";
  jsonBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ trackData, audioFeatures }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = trackName.replace(/\s+/g, "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });
  container.appendChild(jsonBtn);

  return container;
}

function buildAlbumEl(albumData) {
  const container = document.createElement("div");
  container.classList.add("track-result", "slide-in");

  const albumName = albumData.name || "Pa Emër";
  const artist = albumData.artists?.[0]?.name || "Pa Artist";
  const cover = albumData.images?.[0]?.url || "";
  const releaseDate = albumData.release_date || "N/A";
  const label = albumData.label || "N/A";
  const upc = albumData.external_ids?.upc || "N/A";

  const heading = document.createElement("h3");
  heading.classList.add("track-title");
  heading.textContent = `💿 ${albumName} – ${artist}`;
  container.appendChild(heading);

  if (cover) {
    const img = document.createElement("img");
    img.src = cover;
    img.alt = "Kopertina e Albumit";
    img.classList.add("album-cover");
    container.appendChild(img);
  }

  const info = document.createElement("div");
  info.classList.add("track-info");
  info.innerHTML = `
    <p><strong>Data Publikimit:</strong> ${releaseDate}</p>
    <p><strong>Shtëpia Diskografike:</strong> ${label}</p>
    <p><strong>UPC:</strong> ${upc} <button class="copy-btn" data-value="${upc}">📋</button></p>
  `;
  container.appendChild(info);

  container.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-value") || "";
      if (val && val !== "N/A") {
        navigator.clipboard.writeText(val)
          .then(() => showToast(`U kopjua: ${val}`, "success"))
          .catch(() => showToast("Nuk u kopjua.", "error"));
      } else {
        showToast("Asgjë për të kopjuar!", "error");
      }
    });
  });

  const jsonBtn = document.createElement("button");
  jsonBtn.classList.add("btn", "btn-small", "btn-blue", "margin-top");
  jsonBtn.textContent = "Shkarko JSON";
  jsonBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify({ albumData }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = albumName.replace(/\s+/g, "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });
  container.appendChild(jsonBtn);

  return container;
}

// On load
loadDarkModePreference();
