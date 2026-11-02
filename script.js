const sampleWebsites = [
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "twitter.com",
  "netflix.com"
];

const domainPattern = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const blockListForm = document.getElementById("block-list-form");
const websiteInput = document.getElementById("website-to-block");
const blockListTable = document.getElementById("block-list");
const loadSampleSitesButton = document.getElementById("load-sample-sites");
const focusDurationInput = document.getElementById("focus-duration");
const startFocusButton = document.getElementById("start-focus");
const stopFocusButton = document.getElementById("stop-focus");
const focusStatus = document.getElementById("focus-status");
const websiteAccessForm = document.getElementById("website-access-form");
const websiteToTestInput = document.getElementById("website-to-test");
const accessNotification = document.getElementById("access-notification");
const accessLogTable = document.getElementById("access-log");
const blockedCount = document.getElementById("blocked-count");
const allowedCount = document.getElementById("allowed-count");

let blockList = loadBlockList();
let focusTimerId = null;
let focusEndTime = 0;
let blockedAccessCount = 0;
let allowedAccessCount = 0;

function loadBlockList() {
  const savedBlockList = localStorage.getItem("blockList");

  if (!savedBlockList) {
    return [...sampleWebsites];
  }

  try {
    const storedWebsites = JSON.parse(savedBlockList);

    if (Array.isArray(storedWebsites)) {
      return storedWebsites.filter(
        (website) => typeof website === "string" && domainPattern.test(website)
      );
    }
  } catch (error) {
    console.error("Could not restore the block list.", error);
  }

  return [...sampleWebsites];
}

function saveBlockList() {
  localStorage.setItem("blockList", JSON.stringify(blockList));
}

function normalizeDomain(value) {
  let domain = value.trim().toLowerCase();

  if (!domain) {
    return "";
  }

  if (!domain.startsWith("http://") && !domain.startsWith("https://")) {
    domain = `http://${domain}`;
  }

  try {
    const parsedUrl = new URL(domain);
    return parsedUrl.hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
}

function displayBlockList() {
  blockListTable.innerHTML = "";

  blockList.forEach((website, index) => {
    const row = document.createElement("tr");
    const numberCell = document.createElement("td");
    const websiteCell = document.createElement("td");
    const actionCell = document.createElement("td");
    const removeButton = document.createElement("button");

    numberCell.textContent = index + 1;
    websiteCell.textContent = website;
    removeButton.type = "button";
    removeButton.textContent = "Remove";
    removeButton.dataset.index = index;

    actionCell.appendChild(removeButton);
    row.append(numberCell, websiteCell, actionCell);
    blockListTable.appendChild(row);
  });
}

function addWebsite(event) {
  event.preventDefault();

  const normalizedDomain = normalizeDomain(websiteInput.value);

  if (!domainPattern.test(normalizedDomain)) {
    window.alert("Please enter a valid domain name.");
    return;
  }

  if (blockList.includes(normalizedDomain)) {
    window.alert("This website is already in the block list.");
    return;
  }

  blockList.push(normalizedDomain);
  saveBlockList();
  displayBlockList();
  websiteInput.value = "";
}

function removeWebsite(event) {
  const removeButton = event.target.closest("button[data-index]");

  if (!removeButton) {
    return;
  }

  blockList.splice(Number(removeButton.dataset.index), 1);
  saveBlockList();
  displayBlockList();
}

function loadSampleSites() {
  blockList = [...sampleWebsites];
  saveBlockList();
  displayBlockList();
}

function formatTimeLeft(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateFocusStatus(secondsLeft) {
  focusStatus.textContent = `Focus Mode: ON  Time Left: ${formatTimeLeft(secondsLeft)}`;
  focusStatus.classList.add("active");
}

function stopFocusMode() {
  if (focusTimerId !== null) {
    clearInterval(focusTimerId);
    focusTimerId = null;
  }

  focusEndTime = 0;
  focusStatus.textContent = "Focus Mode: OFF";
  focusStatus.classList.remove("active");
}

function updateFocusTimer() {
  const secondsLeft = Math.max(0, Math.ceil((focusEndTime - Date.now()) / 1000));

  if (secondsLeft === 0) {
    stopFocusMode();
    return;
  }

  updateFocusStatus(secondsLeft);
}

function startFocusMode() {
  const duration = Number(focusDurationInput.value);

  if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
    window.alert("Please enter a duration between 1 and 180 minutes.");
    focusDurationInput.value = 25;
    return;
  }

  stopFocusMode();
  focusEndTime = Date.now() + duration * 60 * 1000;
  updateFocusTimer();
  focusTimerId = setInterval(updateFocusTimer, 1000);
}

function isBlockedDomain(domain) {
  return blockList.some(
    (blockedDomain) =>
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
  );
}

function showAccessNotification(message, statusClass) {
  accessNotification.textContent = message;
  accessNotification.className = statusClass;
}

function addAccessLog(domain, status) {
  const row = document.createElement("tr");
  const timeCell = document.createElement("td");
  const websiteCell = document.createElement("td");
  const statusCell = document.createElement("td");

  timeCell.textContent = new Date().toLocaleTimeString();
  websiteCell.textContent = domain;
  statusCell.textContent = status;
  statusCell.className = status.toLowerCase();

  if (accessLogTable.textContent.includes("No requests yet")) {
    accessLogTable.innerHTML = "";
  }

  row.append(timeCell, websiteCell, statusCell);
  accessLogTable.prepend(row);

  if (status === "BLOCKED") {
    blockedAccessCount += 1;
  } else {
    allowedAccessCount += 1;
  }

  blockedCount.textContent = blockedAccessCount;
  allowedCount.textContent = allowedAccessCount;
}

function testWebsiteAccess(event) {
  event.preventDefault();

  const domain = normalizeDomain(websiteToTestInput.value);

  if (!domainPattern.test(domain)) {
    showAccessNotification("Please enter a valid website URL.", "error");
    return;
  }

  const blocked = isBlockedDomain(domain);
  const focusModeIsOn = focusStatus.classList.contains("active");

  if (blocked && focusModeIsOn) {
    addAccessLog(domain, "BLOCKED");
    showAccessNotification(
      `ACCESS BLOCKED: ${domain} is in your block list. Request redirected to 127.0.0.1. Stay focused!`,
      "blocked"
    );
    return;
  }

  if (blocked && !focusModeIsOn) {
    addAccessLog(domain, "ALLOWED");
    showAccessNotification(
      `ACCESS ALLOWED: ${domain} is in your block list, but Focus Mode is inactive.`,
      "allowed"
    );
    return;
  }

  addAccessLog(domain, "ALLOWED");
  showAccessNotification(
    `ACCESS ALLOWED: ${domain} is not blocked. Request sent to web server.`,
    "allowed"
  );
}

blockListForm.addEventListener("submit", addWebsite);
blockListTable.addEventListener("click", removeWebsite);
loadSampleSitesButton.addEventListener("click", loadSampleSites);
startFocusButton.addEventListener("click", startFocusMode);
stopFocusButton.addEventListener("click", stopFocusMode);
websiteAccessForm.addEventListener("submit", testWebsiteAccess);

displayBlockList();
