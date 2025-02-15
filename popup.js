// popup.js

const darkModeToggle = document.getElementById("darkModeToggle");
const expandViewBtn = document.getElementById("expandViewBtn");
const openOptionsBtn = document.getElementById("openOptionsBtn");

const detectCurrentTabBtn = document.getElementById("detectCurrentTabBtn");
const youtubeSimilarBtn = document.getElementById("youtubeSimilarBtn");

const spotifyLinksInput = document.getElementById("spotifyLinksInput");
const fetchLinksBtn = document.getElementById("fetchLinksBtn");

const searchTrackInput = document.getElementById("searchTrackInput");
const searchTrackBtn = document.getElementById("searchTrackBtn");
const searchAlbumInput = document.getElementById("searchAlbumInput");
const searchAlbumBtn = document.getElementById("searchAlbumBtn");
const searchResultsDiv = document.getElementById("searchResults");

const youtubeLinksInput = document.getElementById("youtubeLinksInput");
const fetchYoutubeBtn = document.getElementById("fetchYoutubeBtn");

const clearResultsBtn = document.getElementById("clearResultsBtn");
const resultsDiv = document.getElementById("results");
const toastContainer = document.getElementById("toastContainer");
const htmlRoot = document.documentElement;

/* ===== Persist Input Values ===== */
function loadUserInputs() {
  chrome.storage.local.get(
    ["spotifyLinks", "youtubeLinks", "searchTrack", "searchAlbum"],
    (data) => {
      if (data.spotifyLinks) {
        spotifyLinksInput.value = data.spotifyLinks;
      }
      if (data.youtubeLinks) {
        youtubeLinksInput.value = data.youtubeLinks;
      }
      if (data.searchTrack) {
        searchTrackInput.value = data.searchTrack;
      }
      if (data.searchAlbum) {
        searchAlbumInput.value = data.searchAlbum;
      }
    }
  );
}
function saveUserInput(key, value) {
  let obj = {};
  obj[key] = value;
  chrome.storage.local.set(obj);
}

// Add event listeners to save changes when user types
spotifyLinksInput.addEventListener("change", () => {
  saveUserInput("spotifyLinks", spotifyLinksInput.value);
});
youtubeLinksInput.addEventListener("change", () => {
  saveUserInput("youtubeLinks", youtubeLinksInput.value);
});
searchTrackInput.addEventListener("change", () => {
  saveUserInput("searchTrack", searchTrackInput.value);
});
searchAlbumInput.addEventListener("change", () => {
  saveUserInput("searchAlbum", searchAlbumInput.value);
});

/* ===== TOAST ===== */
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

/* ===== DARK MODE ===== */
function loadDarkModePreference() {
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

/* ===== EXPAND POPUP ===== */
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

/* ===== OPEN OPTIONS ===== */
openOptionsBtn.addEventListener("click", () => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  } else {
    window.open(chrome.runtime.getURL("options.html"));
  }
});

/* ===== DETECT CURRENT TAB ===== */
detectCurrentTabBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) {
      showToast("S'ka tab aktiv.", "error");
      return;
    }
    const url = tabs[0].url || "";
    if (url.includes("spotify.com/track/") || url.includes("spotify.com/album/")) {
      spotifyLinksInput.value = url;
      saveUserInput("spotifyLinks", url);
      showToast("Link Spotify u gjet!", "success");
    } else if (url.includes("youtube.com/watch")) {
      youtubeLinksInput.value = url;
      saveUserInput("youtubeLinks", url);
      showToast("Link YouTube u gjet!", "success");
    } else {
      showToast("Nuk është Spotify ose YouTube!", "error");
    }
  });
});

/* ===== YOUTUBE → SPOTIFY (from tab title) ===== */
youtubeSimilarBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) {
      showToast("S'ka tab aktiv.", "error");
      return;
    }
    const tab = tabs[0];
    if (!tab.url.includes("youtube.com/watch")) {
      showToast("Faqja nuk është video YouTube!", "error");
      return;
    }
    const videoTitle = tab.title.replace(" - YouTube", "").trim();
    if (!videoTitle) {
      showToast("S'ka titull videoje.", "error");
      return;
    }
    chrome.runtime.sendMessage({ action: "GET_YOUTUBE_SIMILAR", title: videoTitle }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim: ${resp?.error || "Asnjë përgjigje"}`, "error");
        return;
      }
      const items = resp.searchData.tracks?.items || [];
      if (!items.length) {
        showToast("Asnjë këngë e ngjashme u gjet.", "info");
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
      showToast("Rezultate nga YouTube → Spotify", "success");
    });
  });
});

/* ===== FETCH SPOTIFY LINKS ===== */
fetchLinksBtn.addEventListener("click", async () => {
  resultsDiv.innerHTML = "";
  const raw = spotifyLinksInput.value.trim();
  if (!raw) {
    showToast("Vendosni një link Spotify.", "error");
    return;
  }
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.includes("spotify.com/track/")) {
      const trackId = parseSpotifyId(line, "track");
      if (!trackId) {
        showToast(`Link i pavlefshëm (track): ${line}`, "error");
        continue;
      }
      await fetchTrackById(trackId);
    } else if (line.includes("spotify.com/album/")) {
      const albumId = parseSpotifyId(line, "album");
      if (!albumId) {
        showToast(`Link i pavlefshëm (album): ${line}`, "error");
        continue;
      }
      await fetchAlbumById(albumId);
    } else {
      showToast(`Nuk njihet si track ose album: ${line}`, "error");
    }
  }
  showToast("Marrja e link-eve Spotify përfundoi!", "success");
});
function parseSpotifyId(link, type) {
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

/* ===== FETCH YOUTUBE LINKS ===== */
fetchYoutubeBtn.addEventListener("click", async () => {
  const raw = youtubeLinksInput.value.trim();
  if (!raw) {
    showToast("Vendosni një link YouTube.", "error");
    return;
  }
  resultsDiv.innerHTML = "";
  const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  for (const line of lines) {
    const videoId = parseYoutubeVideoId(line);
    if (!videoId) {
      showToast(`Link i pavlefshëm YouTube: ${line}`, "error");
      continue;
    }
    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: "GET_YOUTUBE_VIDEO_DATA", videoId }, (resp) => {
        if (!resp || !resp.success) {
          showToast(`Gabim YouTube: ${resp?.error || "No resp"}`, "error");
          return resolve();
        }
        const el = buildYoutubeEl(resp.videoData);
        resultsDiv.appendChild(el);
        resolve();
      });
    });
  }
  showToast("Marrja e link-eve YouTube përfundoi!", "success");
});
function parseYoutubeVideoId(url) {
  try {
    if (url.includes("youtube.com/watch?v=")) {
      const parts = url.split("v=");
      return parts[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
      const parts = url.split("youtu.be/");
      return parts[1].split("?")[0];
    }
  } catch (e) {
    return "";
  }
  return "";
}

/* ===== BUILD UI ELEMENTS (SPOTIFY) ===== */
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
    <p><strong>ISRC:</strong> ${isrc} <button class="copy-btn" data-value="${isrc}">📋 Kopjo</button></p>
    <p><strong>UPC:</strong> ${upc} <button class="copy-btn" data-value="${upc}">📋 Kopjo</button></p>
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

  const jsonBtn = document.createElement("button");
  jsonBtn.classList.add("btn", "btn-small", "btn-blue", "margin-top");
  jsonBtn.textContent = "Shkarko JSON";
  jsonBtn.addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify({ trackData, audioFeatures }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = trackName.replace(/\s+/g, "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });
  container.appendChild(jsonBtn);

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
    <p><strong>UPC:</strong> ${upc} <button class="copy-btn" data-value="${upc}">📋 Kopjo</button></p>
  `;
  container.appendChild(info);

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

  return container;
}

function buildYoutubeEl(videoData) {
  const container = document.createElement("div");
  container.classList.add("track-result", "slide-in");

  const heading = document.createElement("h3");
  heading.classList.add("track-title");
  heading.textContent = `🎬 ${videoData.title}`;
  container.appendChild(heading);

  const info = document.createElement("div");
  info.classList.add("track-info");
  info.innerHTML = `
    <p><strong>ID e Videos:</strong> ${videoData.videoId}</p>
    <p><strong>Kohëzgjatja:</strong> ${videoData.duration}</p>
  `;
  container.appendChild(info);

  const descObj = videoData.descriptionLines;
  const linesEl = document.createElement("div");
  linesEl.classList.add("audio-features");
  linesEl.innerHTML = `
    <p><strong>Music & Produced:</strong> ${descObj.musicProduced || "N/A"}</p>
    <p><strong>Text:</strong> ${descObj.text || "N/A"}</p>
    <p><strong>Video:</strong> ${descObj.video || "N/A"}</p>
    <p><strong>Special Guest:</strong> ${descObj.specialGuest || "N/A"}</p>
    <p><strong>Thanks To:</strong> ${descObj.thanksTo || "N/A"}</p>
    <p><strong>Publisher:</strong> ${descObj.publisher || "N/A"}</p>
    <p><strong>Licensing:</strong> ${descObj.licensing || "N/A"}</p>
    <p><strong>ISRC:</strong> ${descObj.isrc || "N/A"}</p>
    <p><strong>UPC:</strong> ${descObj.upc || "N/A"}</p>
  `;
  container.appendChild(linesEl);

  const jsonBtn = document.createElement("button");
  jsonBtn.classList.add("btn", "btn-small", "btn-blue", "margin-top");
  jsonBtn.textContent = "Shkarko JSON (YT)";
  jsonBtn.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(videoData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = videoData.title.replace(/\s+/g, "_") + ".json";
    a.click();
    URL.revokeObjectURL(url);
  });
  container.appendChild(jsonBtn);

  return container;
}

loadDarkModePreference();
loadUserInputs();
