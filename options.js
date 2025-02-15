// options.js

const clientIdInput = document.getElementById("clientIdInput");
const clientSecretInput = document.getElementById("clientSecretInput");
const durationInput = document.getElementById("durationInput");

const saveOptionsBtn = document.getElementById("saveOptionsBtn");
const clearCredsBtn = document.getElementById("clearCredsBtn");
const testCredsBtn = document.getElementById("testCredsBtn");

const credsAccordionHeader = document.getElementById("credsAccordionHeader");
const credsAccordionBody = document.getElementById("credsAccordionBody");
const accordionToggle = credsAccordionHeader.querySelector(".accordion-toggle");

const toastContainer = document.getElementById("toastContainer");

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

function loadOptions() {
  chrome.storage.local.get("userCredentials", (data) => {
    const userCredentials = data.userCredentials;
    if (userCredentials) {
      clientIdInput.value = userCredentials.clientId;
      clientSecretInput.value = userCredentials.clientSecret;
      let hoursLeft = Math.floor((userCredentials.expiresAt - Date.now()) / (3600*1000));
      if (hoursLeft < 1) hoursLeft = 8;
      durationInput.value = hoursLeft;
    } else {
      durationInput.value = 8;
    }
  });
}

function saveOptions() {
  const cId = clientIdInput.value.trim();
  const cSecret = clientSecretInput.value.trim();
  let hrs = parseInt(durationInput.value.trim(), 10);
  if (!hrs || hrs < 1) hrs = 8;

  if (!cId || !cSecret) {
    showToast("Ju lutem vendosni Client ID dhe Secret.", "error");
    return;
  }
  const now = Date.now();
  const expiresAt = now + hrs * 3600 * 1000;

  const userCredentials = {
    clientId: cId,
    clientSecret: cSecret,
    expiresAt
  };

  chrome.storage.local.set({ userCredentials }, () => {
    // Remove old token so it refreshes
    chrome.storage.local.remove("spotifyTokenData", () => {
      showToast(`U ruajtën kredencialet për ${hrs} orë.`, "success");
    });
  });
}

function clearCredentials() {
  chrome.storage.local.remove(["userCredentials", "spotifyTokenData"], () => {
    clientIdInput.value = "";
    clientSecretInput.value = "";
    durationInput.value = "8";
    showToast("Kredencialet u fshinë.", "success");
  });
}

function testCredentials() {
  chrome.runtime.sendMessage({ action: "TEST_CREDENTIALS" }, (resp) => {
    if (!resp || !resp.success) {
      showToast(`Gabim: ${resp?.error || "Asnjë përgjigje"}`, "error");
      return;
    }
    showToast("Kredencialet funksionojnë! ✅", "success");
  });
}

// Accordion
let isAccordionOpen = false;
credsAccordionHeader.addEventListener("click", () => {
  isAccordionOpen = !isAccordionOpen;
  if (isAccordionOpen) {
    credsAccordionBody.style.display = "block";
    accordionToggle.textContent = "–";
  } else {
    credsAccordionBody.style.display = "none";
    accordionToggle.textContent = "+";
  }
});

saveOptionsBtn.addEventListener("click", saveOptions);
clearCredsBtn.addEventListener("click", clearCredentials);
testCredsBtn.addEventListener("click", testCredentials);

loadOptions();
