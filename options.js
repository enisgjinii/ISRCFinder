const spotifyAccordionHeader = document.getElementById("spotifyAccordionHeader");
const spotifyAccordionBody = document.getElementById("spotifyAccordionBody");
const youtubeAccordionHeader = document.getElementById("youtubeAccordionHeader");
const youtubeAccordionBody = document.getElementById("youtubeAccordionBody");
const spotifyClientId = document.getElementById("spotifyClientId");
const spotifyClientSecret = document.getElementById("spotifyClientSecret");
const spotifyDuration = document.getElementById("spotifyDuration");
const youtubeApiKey = document.getElementById("youtubeApiKey");
const saveBtn = document.getElementById("saveBtn");
const clearBtn = document.getElementById("clearBtn");
const testBtn = document.getElementById("testBtn");
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

function loadOptions() {
  try {
    chrome.storage.local.get(["userCredentials", "youtubeApiKey"], (data) => {
      if (data.userCredentials) {
        spotifyClientId.value = data.userCredentials.clientId;
        spotifyClientSecret.value = data.userCredentials.clientSecret;
        let hoursLeft = Math.floor((data.userCredentials.expiresAt - Date.now()) / 3600000);
        spotifyDuration.value = hoursLeft < 1 ? 8 : hoursLeft;
      } else {
        spotifyDuration.value = 8;
      }
      if (data.youtubeApiKey) youtubeApiKey.value = data.youtubeApiKey;
    });
    const states = JSON.parse(localStorage.getItem("accordionStates") || "{}");
    if (states.spotifyOpen) {
      spotifyAccordionBody.style.display = "block";
      spotifyAccordionHeader.querySelector(".accordion-toggle").textContent = "–";
    }
    if (states.youtubeOpen) {
      youtubeAccordionBody.style.display = "block";
      youtubeAccordionHeader.querySelector(".accordion-toggle").textContent = "–";
    }
  } catch (error) {
    console.error(error);
  }
}

function saveOptions() {
  try {
    const cId = spotifyClientId.value.trim();
    const cSecret = spotifyClientSecret.value.trim();
    let duration = parseInt(spotifyDuration.value.trim(), 10);
    if (!duration || duration < 1) duration = 8;
    if (!cId || !cSecret) {
      showToast("Enter your Spotify Client ID and Secret.", "error");
      return;
    }
    const now = Date.now();
    const expiresAt = now + duration * 3600000;
    const userCredentials = { clientId: cId, clientSecret: cSecret, expiresAt };
    const ytKey = youtubeApiKey.value.trim();
    chrome.storage.local.set({ userCredentials, youtubeApiKey: ytKey }, () => {
      if (chrome.runtime.lastError) {
        showToast("Error saving options.", "error");
      } else {
        chrome.storage.local.remove("spotifyTokenData", () => {
          showToast("Saved successfully! 🎉", "success");
        });
      }
    });
  } catch (error) {
    console.error(error);
    showToast("Error saving options.", "error");
  }
}

function clearAll() {
  try {
    chrome.storage.local.remove(["userCredentials", "spotifyTokenData", "youtubeApiKey"], () => {
      spotifyClientId.value = "";
      spotifyClientSecret.value = "";
      spotifyDuration.value = 8;
      youtubeApiKey.value = "";
      showToast("All credentials cleared. 🗑️", "success");
    });
  } catch (error) {
    console.error(error);
    showToast("Error clearing credentials.", "error");
  }
}

function testSpotify() {
  try {
    chrome.runtime.sendMessage({ action: "TEST_CREDENTIALS" }, (resp) => {
      if (!resp || !resp.success) {
        showToast(`Error: ${resp?.error || "No response"}`, "error");
      } else {
        showToast("Spotify credentials are valid! 👍", "success");
      }
    });
  } catch (error) {
    console.error(error);
    showToast("Error testing credentials.", "error");
  }
}

function toggleAccordion(header, body, key) {
  try {
    const isOpen = body.style.display === "block";
    body.style.display = isOpen ? "none" : "block";
    header.querySelector(".accordion-toggle").textContent = isOpen ? "+" : "–";
    const states = JSON.parse(localStorage.getItem("accordionStates") || "{}");
    states[key] = !isOpen;
    localStorage.setItem("accordionStates", JSON.stringify(states));
  } catch (error) {
    console.error(error);
  }
}

spotifyAccordionHeader.addEventListener("click", () => { toggleAccordion(spotifyAccordionHeader, spotifyAccordionBody, "spotifyOpen"); });
youtubeAccordionHeader.addEventListener("click", () => { toggleAccordion(youtubeAccordionHeader, youtubeAccordionBody, "youtubeOpen"); });
saveBtn.addEventListener("click", saveOptions);
clearBtn.addEventListener("click", clearAll);
testBtn.addEventListener("click", testSpotify);
loadOptions();
