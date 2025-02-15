// background.js

async function getUserCredentials() {
  const { userCredentials } = await new Promise((resolve) =>
    chrome.storage.local.get("userCredentials", resolve)
  );
  if (!userCredentials) {
    throw new Error("S'ka kredenciale Spotify të ruajtura.");
  }
  const now = Date.now();
  if (now > userCredentials.expiresAt) {
    await new Promise((resolve) =>
      chrome.storage.local.remove("userCredentials", resolve)
    );
    throw new Error("Kredencialet Spotify kanë skaduar.");
  }
  return {
    clientId: userCredentials.clientId,
    clientSecret: userCredentials.clientSecret
  };
}

async function getSpotifyToken() {
  const { spotifyTokenData } = await new Promise((resolve) =>
    chrome.storage.local.get("spotifyTokenData", resolve)
  );
  const now = Date.now();

  if (
    spotifyTokenData &&
    spotifyTokenData.accessToken &&
    now < spotifyTokenData.expiresAt
  ) {
    return spotifyTokenData.accessToken;
  }

  const { clientId, clientSecret } = await getUserCredentials();
  const tokenUrl = "https://accounts.spotify.com/api/token";
  const authHeader = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`
    },
    body: "grant_type=client_credentials"
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Gabim në marrjen e token-it Spotify: ${data.error || response.statusText}`);
  }
  const expiresInMs = data.expires_in * 1000;
  const nowMs = Date.now();
  const expiresAt = nowMs + expiresInMs - 30000;

  await new Promise((resolve) =>
    chrome.storage.local.set(
      {
        spotifyTokenData: {
          accessToken: data.access_token,
          expiresAt
        }
      },
      resolve
    )
  );
  return data.access_token;
}

async function getYoutubeApiKey() {
  const { youtubeApiKey } = await new Promise((resolve) =>
    chrome.storage.local.get("youtubeApiKey", resolve)
  );
  if (!youtubeApiKey) {
    throw new Error("S'ka vendosur YouTube API Key.");
  }
  return youtubeApiKey;
}

// Helper: Parse ISO 8601 duration (e.g., "PT1H2M10S") to "HH:MM:SS"
function parseIso8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "00:00:00";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// Helper: Parse description lines for specific fields
function parseYoutubeDescription(desc) {
  const lines = desc.split("\n").map(l => l.trim()).filter(Boolean);
  const parsed = {
    musicProduced: null,
    text: null,
    video: null,
    specialGuest: null,
    thanksTo: null,
    publisher: null,
    licensing: null,
    isrc: "N/A",
    upc: "N/A"
  };
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.startsWith("music") && lower.includes("produced")) {
      parsed.musicProduced = line.split(":")[1]?.trim() || line.trim();
    } else if (lower.startsWith("text")) {
      parsed.text = line.split(":")[1]?.trim() || line.trim();
    } else if (lower.startsWith("video")) {
      parsed.video = line.split(":")[1]?.trim() || line.trim();
    } else if (lower.startsWith("special guest")) {
      parsed.specialGuest = line.split(":")[1]?.trim() || line.trim();
    } else if (lower.startsWith("thanks to")) {
      parsed.thanksTo = line.split(":")[1]?.trim() || line.trim();
    } else if (lower.startsWith("publisher")) {
      parsed.publisher = line.split(":")[1]?.trim() || line.trim();
    } else if (lower.startsWith("licensing")) {
      parsed.licensing = line.split(":")[1]?.trim() || line.trim();
    }
    // Try to find ISRC or UPC explicitly in the description
    if (lower.includes("isrc")) {
      const after = line.split("ISRC")[1] || "";
      parsed.isrc = after.replace(":", "").trim() || parsed.isrc;
    }
    if (lower.includes("upc")) {
      const after = line.split("UPC")[1] || "";
      parsed.upc = after.replace(":", "").trim() || parsed.upc;
    }
  }
  return parsed;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TEST_CREDENTIALS") {
    (async () => {
      try {
        await getSpotifyToken();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  else if (request.action === "GET_TRACK_DATA") {
    (async () => {
      try {
        const trackId = request.trackId;
        if (!trackId) throw new Error("Mungon ID e këngës.");
        const token = await getSpotifyToken();
        const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!trackRes.ok) throw new Error(`Gabim track: ${trackRes.status}`);
        const trackData = await trackRes.json();
        let audioFeatures = null;
        const featRes = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (featRes.ok) {
          audioFeatures = await featRes.json();
        }
        sendResponse({ success: true, trackData, audioFeatures });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  else if (request.action === "GET_ALBUM_DATA") {
    (async () => {
      try {
        const albumId = request.albumId;
        if (!albumId) throw new Error("Mungon ID e albumit.");
        const token = await getSpotifyToken();
        const albumRes = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!albumRes.ok) throw new Error(`Gabim album: ${albumRes.status}`);
        const albumData = await albumRes.json();
        sendResponse({ success: true, albumData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  else if (request.action === "SEARCH_TRACKS") {
    (async () => {
      try {
        const { query } = request;
        if (!query) throw new Error("Mungon teksti i kërkimit të këngës.");
        const token = await getSpotifyToken();
        const url = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=5`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Gabim track search: ${res.status}`);
        const searchData = await res.json();
        sendResponse({ success: true, searchData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  else if (request.action === "SEARCH_ALBUMS") {
    (async () => {
      try {
        const { query } = request;
        if (!query) throw new Error("Mungon teksti i kërkimit të albumit.");
        const token = await getSpotifyToken();
        const url = `https://api.spotify.com/v1/search?type=album&q=${encodeURIComponent(query)}&limit=5`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Gabim album search: ${res.status}`);
        const searchData = await res.json();
        sendResponse({ success: true, searchData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  else if (request.action === "GET_YOUTUBE_SIMILAR") {
    (async () => {
      try {
        const { title } = request;
        if (!title) throw new Error("Mungon titulli i videos.");
        const token = await getSpotifyToken();
        const url = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(title)}&limit=5`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(`Gabim YT->Spotify search: ${res.status}`);
        const searchData = await res.json();
        sendResponse({ success: true, searchData });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
  else if (request.action === "GET_YOUTUBE_VIDEO_DATA") {
    (async () => {
      try {
        const { videoId } = request;
        if (!videoId) throw new Error("Mungon ID e videos.");
        const apiKey = await getYoutubeApiKey();
        const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
        const resp = await fetch(endpoint);
        if (!resp.ok) throw new Error(`Gabim YouTube API: ${resp.status}`);
        const data = await resp.json();
        if (!data.items || !data.items.length) throw new Error("Video nuk u gjet nga YouTube.");
        const video = data.items[0];
        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};
        const title = snippet.title || "Pa Titull";
        const description = snippet.description || "";
        const isoDuration = contentDetails.duration || "PT0S";
        const durationFormatted = parseIso8601Duration(isoDuration);
        let parsedDesc = parseYoutubeDescription(description);

        // If ISRC is missing, search Spotify by the cleaned title.
        if (!parsedDesc.isrc || parsedDesc.isrc === "N/A") {
          // Remove any bracketed parts from title
          const cleanedTitle = title.replace(/\(.*?\)/g, "").trim();
          const token = await getSpotifyToken();
          const searchUrl = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(cleanedTitle)}&limit=1`;
          const searchRes = await fetch(searchUrl, { headers: { Authorization: `Bearer ${token}` } });
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.tracks && searchData.tracks.items.length > 0) {
              const trackData = searchData.tracks.items[0];
              parsedDesc.isrc = trackData.external_ids?.isrc || "N/A";
              parsedDesc.upc = trackData.album?.external_ids?.upc || "N/A";
            }
          }
        }
        sendResponse({
          success: true,
          videoData: {
            videoId,
            title,
            duration: durationFormatted,
            descriptionLines: parsedDesc
          }
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
