async function getUserCredentials() {
  try {
    const { userCredentials } = await new Promise((resolve, reject) =>
      chrome.storage.local.get("userCredentials", (data) =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(data)
      )
    );
    if (!userCredentials) throw new Error("Spotify credentials are not set.");
    const now = Date.now();
    if (now > userCredentials.expiresAt) {
      await new Promise((resolve) => chrome.storage.local.remove("userCredentials", resolve));
      throw new Error("Spotify credentials have expired.");
    }
    return { clientId: userCredentials.clientId, clientSecret: userCredentials.clientSecret };
  } catch (error) {
    console.error("getUserCredentials:", error);
    throw error;
  }
}

async function getSpotifyToken() {
  try {
    const { spotifyTokenData } = await new Promise((resolve, reject) =>
      chrome.storage.local.get("spotifyTokenData", (data) =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(data)
      )
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
    if (!response.ok) throw new Error(`Spotify token error: ${response.status}`);
    const data = await response.json();
    if (!data.access_token) throw new Error("No access token returned.");
    const expiresAt = Date.now() + data.expires_in * 1000 - 30000;
    await new Promise((resolve, reject) =>
      chrome.storage.local.set({ spotifyTokenData: { accessToken: data.access_token, expiresAt } }, () =>
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve()
      )
    );
    return data.access_token;
  } catch (error) {
    console.error("getSpotifyToken:", error);
    throw error;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
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
    } else if (request.action === "GET_YOUTUBE_SNIPPET") {
      (async () => {
        try {
          const videoId = request.videoId;
          if (!videoId) throw new Error("Missing YouTube video ID.");
          const { youtubeApiKey } = await new Promise((resolve, reject) =>
            chrome.storage.local.get("youtubeApiKey", (data) =>
              chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(data)
            )
          );
          if (!youtubeApiKey) throw new Error("YouTube API Key is not set.");
          const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${youtubeApiKey}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
          const data = await res.json();
          sendResponse({ success: true, youtubeData: data });
        } catch (err) {
          console.error("GET_YOUTUBE_SNIPPET:", err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    } else if (request.action === "SEARCH_SPOTIFY_TRACKS") {
      (async () => {
        try {
          const query = request.query;
          if (!query) throw new Error("Missing search query.");
          const token = await getSpotifyToken();
          const url = `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=5`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) throw new Error(`Spotify search error: ${res.status}`);
          const data = await res.json();
          sendResponse({ success: true, searchData: data });
        } catch (err) {
          console.error("SEARCH_SPOTIFY_TRACKS:", err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    } else if (request.action === "GET_SPOTIFY_TRACK_DETAILS") {
      (async () => {
        try {
          const trackId = request.trackId;
          if (!trackId) throw new Error("Missing track ID.");
          const token = await getSpotifyToken();
          const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (!trackRes.ok) throw new Error(`Track fetch error: ${trackRes.status}`);
          const trackData = await trackRes.json();
          let audioFeatures = null;
          const featRes = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (featRes.ok) audioFeatures = await featRes.json();
          sendResponse({ success: true, trackData, audioFeatures });
        } catch (err) {
          console.error("GET_SPOTIFY_TRACK_DETAILS:", err);
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }
  } catch (ex) {
    console.error("Unhandled background error:", ex);
    sendResponse({ success: false, error: "Unhandled background error" });
  }
});
