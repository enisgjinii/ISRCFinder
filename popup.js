const darkModeToggle = document.getElementById("darkModeToggle");
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

function showToast(message, type = "info") {
  try {
    const toast = document.createElement("div");
    toast.classList.add("toast", "fade-in");
    toast.classList.add(type === "success" ? "toast-success" : type === "error" ? "toast-error" : "");
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove("fade-in");
      toast.classList.add("fade-out");
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  } catch (error) {
    console.error(error);
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
darkModeToggle.addEventListener("change", () => {
  if (darkModeToggle.checked) {
    document.documentElement.classList.add("dark-mode");
    saveDarkModePreference(true);
  } else {
    document.documentElement.classList.remove("dark-mode");
    saveDarkModePreference(false);
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

fetchYouTubeBtn.addEventListener("click", () => {
  try {
    const link = youtubeLinkInput.value.trim();
    if (!link) {
      showToast("Ju lutem vendosni një lidhje YouTube! 🔗", "error");
      return;
    }
    const videoId = parseYouTubeId(link);
    if (!videoId) {
      showToast("Lidhje e pavlefshme YouTube.", "error");
      return;
    }
    chrome.runtime.sendMessage({ action: "GET_YOUTUBE_SNIPPET", videoId }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Gabim: ${resp?.error || "Nuk ka përgjigje"}`, "error");
        return;
      }
      const items = resp.youtubeData.items || [];
      if (!items.length) {
        showToast("Video nuk u gjet. 😕", "info");
        return;
      }
      const snippet = items[0].snippet || {};
      youtubeInfoDiv.style.display = "block";
      videoTitleEl.textContent = snippet.title || "(Pa titull)";
      videoDescriptionEl.textContent = snippet.description || "(Pa përshkrim)";
      spotifySearchInput.value = snippet.title || "";
      showToast("Informacioni i YouTube u mor! 🎉", "success");
    });
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë marrjes së informacionit nga YouTube.", "error");
  }
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

function buildTrackSearchRow(track, query) {
  try {
    const row = document.createElement("div");
    row.classList.add("search-result-row");

    const img = document.createElement("img");
    img.src = track.album.images[0]?.url || "";
    img.alt = "Kopertinë e Albumit";
    img.classList.add("album-cover");

    const text = document.createElement("span");
    text.textContent = `${track.name} — ${track.artists?.[0]?.name || "?"}`;

    const simScore = computeSimilarity(query, track.name);
    const simText = document.createElement("div");
    simText.classList.add("similarity");
    simText.textContent = `Similari: ${(simScore * 100).toFixed(0)}%`;

    const btn = document.createElement("button");
    btn.classList.add("btn", "btn-small", "btn-green");
    btn.textContent = "Merr Detaje";
    btn.addEventListener("click", () => getSpotifyTrackDetails(track.id));

    row.appendChild(img);
    row.appendChild(text);
    row.appendChild(simText);
    row.appendChild(btn);

    resultsDiv.appendChild(row);
    updateSavedResults();
  } catch (error) {
    console.error(error);
  }
}
document.addEventListener("DOMContentLoaded", function () {
  // Check the active tab when popup is opened
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let currentTab = tabs[0];

    if (currentTab && currentTab.url.includes("youtube.com/watch")) {
      document.getElementById("youtubeLinkInput").value = currentTab.url;
      document.getElementById("fetchYouTubeBtn").click(); // Auto-click to fetch data
    }
  });
});

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

function buildTrackDetailsCard(trackData, audioFeatures) {
  try {
    const container = document.createElement("div");
    container.classList.add("detail-card");
    const trackName = trackData.name || "E panjohur";
    const artist = trackData.artists?.[0]?.name || "E panjohur";
    const albumName = trackData.album?.name || "E panjohur";
    const isrc = trackData.external_ids?.isrc || "Nuk ka";
    const upc = trackData.album?.external_ids?.upc || "Nuk ka";
    const popularity = trackData.popularity ?? "Nuk dihet";
    const cover = trackData.album?.images?.[0]?.url || "";
    container.innerHTML = `
      <h3 class="detail-title">🎵 ${trackName} — ${artist}</h3>
      <div class="detail-body">
        <div class="cover-col">
          ${cover ? `<img src="${cover}" alt="Kopertinë" class="cover-img">` : `<div class="cover-placeholder">Pa Kopertinë</div>`}
        </div>
        <div class="info-col">
          <p><strong>Album:</strong> ${albumName}</p>
          <p><strong>Popullariteti:</strong> ${popularity}</p>
          <p><strong>ISRC:</strong> ${isrc} <button class="btn-copy" data-value="${isrc}">📋</button></p>
          <p><strong>UPC:</strong> ${upc} <button class="btn-copy" data-value="${upc}">📋</button></p>
        </div>
      </div>
    `;
    if (audioFeatures) {
      const feats = document.createElement("div");
      feats.classList.add("audio-features");
      feats.innerHTML = `
        <p><strong>Danceability:</strong> ${audioFeatures.danceability ?? "Nuk ka"}</p>
        <p><strong>Energy:</strong> ${audioFeatures.energy ?? "Nuk ka"}</p>
        <p><strong>Tempo:</strong> ${audioFeatures.tempo ?? "Nuk ka"}</p>
      `;
      container.appendChild(feats);
    }
    container.querySelectorAll(".btn-copy").forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-value") || "";
        if (val && val !== "Nuk ka") {
          navigator.clipboard.writeText(val)
            .then(() => showToast(`Kopjua: ${val}`, "success"))
            .catch(() => showToast("Kopjimi dështoi.", "error"));
        } else {
          showToast("Asgjë për të kopjuar!", "error");
        }
      });
    });
    resultsDiv.appendChild(container);
    updateSavedResults();
  } catch (error) {
    console.error(error);
    showToast("Gabim gjatë shfaqjes së detajeve.", "error");
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

loadDarkModePreference();
