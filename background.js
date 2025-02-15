// background.js

async function getUserCredentials() {
  const { userCredentials } = await new Promise((resolve) =>
    chrome.storage.local.get("userCredentials", resolve)
  );
  if (!userCredentials) {
    throw new Error("S'ka kredenciale të Spotify të ruajtura.");
  }
  const now = Date.now();
  if (now > userCredentials.expiresAt) {
    await new Promise((resolve) => chrome.storage.local.remove("userCredentials", resolve));
    throw new Error("Kredencialet e Spotify kanë skaduar.");
  }
  return {
    clientId: userCredentials.clientId,
    clientSecret: userCredentials.clientSecret
  };
}

// For Spotify
async function getSpotifyToken() {
  const { spotifyTokenData } = await new Promise((resolve) =>
    chrome.storage.local.get("spotifyTokenData", resolve)
  );
  const now = Date.now();

  if (spotifyTokenData && spotifyTokenData.accessToken && now < spotifyTokenData.expiresAt) {
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

// For YouTube
async function getYoutubeApiKey() {
  const { youtubeApiKey } = await new Promise((resolve) =>
    chrome.storage.local.get("youtubeApiKey", resolve)
  );
  if (!youtubeApiKey) {
    throw new Error("S'ka vendosur YouTube API Key.");
  }
  return youtubeApiKey;
}

// Helper to parse ISO 8601 Duration (e.g. "PT4M13S") -> "HH:MM:SS"
function parseIso8601Duration(duration) {
  // Typically like "PT4M13S", or "PT1H2M10S"
  // We'll create a simple parse
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "00:00:00";

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");

  return `${hh}:${mm}:${ss}`;
}

// Helper to parse description lines
// We want: 
// Music & Produced : ...
// Text : ...
// Video : ...
// Special Guest : ...
// Thanks to : ...
// Publisher : ...
// Licensing : ...
// Also want to see if "ISRC" or "UPC" appear
function parseYoutubeDescription(desc) {
  // We'll look line by line
  const lines = desc.split("\n").map((l) => l.trim()).filter(Boolean);

  // We'll store the final object
  const parsed = {
    musicProduced: null,
    text: null,
    video: null,
    specialGuest: null,
    thanksTo: null,
    publisher: null,
    licensing: null,
    isrc: null,
    upc: null
  };

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith("music & produced")) {
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

    // Try to find "ISRC" or "UPC" in lines
    if (lower.includes("isrc")) {
      // E.g. "ISRC : US-ABC-20-12345"
      const after = line.split("ISRC")[1] || "";
      parsed.isrc = after.replace(":", "").trim() || "Found mention of ISRC but not parseable";
    }
    if (lower.includes("upc")) {
      const after = line.split("UPC")[1] || "";
      parsed.upc = after.replace(":", "").trim() || "Found mention of UPC but not parseable";
    }
  }

  // Now we return it
  return parsed;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TEST_CREDENTIALS") {
    (async () => {
      try {
        // Try to get Spotify token
        await getSpotifyToken();
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // ========== SPOTIFY ACTIONS ==========
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

        const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`Gabim album: ${res.status}`);
        const albumData = await res.json();

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
      // same logic from previous example for YouTube→Spotify
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

  // ========== YOUTUBE ACTION FOR VIDEO DATA ==========
  else if (request.action === "GET_YOUTUBE_VIDEO_DATA") {
    (async () => {
      try {
        const { videoId } = request;
        if (!videoId) throw new Error("Mungon ID i videos.");
        const apiKey = await getYoutubeApiKey();

        // e.g. "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=VIDEO_ID&key=YOUR_API_KEY"
        const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
        const resp = await fetch(endpoint);
        if (!resp.ok) {
          throw new Error(`Gabim YouTube Data API: ${resp.status}`);
        }
        const data = await resp.json();
        if (!data.items || !data.items.length) {
          throw new Error("Video nuk u gjet nga YouTube Data API.");
        }
        const video = data.items[0];
        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};

        const title = snippet.title || "Pa Titull";
        const description = snippet.description || "";
        const isoDuration = contentDetails.duration || "PT0S";
        const hhmmss = parseIso8601Duration(isoDuration);

        // Parse the lines from the description
        const parsedDesc = parseYoutubeDescription(description);

        sendResponse({
          success: true,
          videoData: {
            videoId,
            title,
            duration: hhmmss,
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
