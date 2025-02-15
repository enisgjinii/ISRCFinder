// background.js

async function getUserCredentials() {
  const { userCredentials } = await new Promise((resolve) =>
    chrome.storage.local.get("userCredentials", resolve)
  );

  if (!userCredentials) {
    throw new Error("Nuk ka kredenciale të Spotify të ruajtura.");
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

async function getSpotifyToken() {
  const { spotifyTokenData } = await new Promise((resolve) =>
    chrome.storage.local.get("spotifyTokenData", resolve)
  );
  const now = Date.now();

  // If token is valid, return it
  if (spotifyTokenData && spotifyTokenData.accessToken && now < spotifyTokenData.expiresAt) {
    return spotifyTokenData.accessToken;
  }

  // Otherwise, request a new token
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
    throw new Error(`Gabim në marrjen e token-it: ${data.error || response.statusText}`);
  }

  const expiresInMs = data.expires_in * 1000;
  const expiresAt = now + expiresInMs - 30000; // 30 sec buffer

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

// Listen for messages from popup.js / options.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "TEST_CREDENTIALS") {
    (async () => {
      try {
        // Just attempt to get a token
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

        // Get track
        const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!trackRes.ok) {
          throw new Error(`Gabim track: ${trackRes.status}`);
        }
        const trackData = await trackRes.json();

        // Audio features
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
        if (!albumRes.ok) {
          throw new Error(`Gabim album: ${albumRes.status}`);
        }
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
        if (!title) throw new Error("Mungon titulli i videos YouTube.");
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
});