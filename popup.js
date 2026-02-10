const currentYear = new Date().getFullYear();
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const folderInput = document.getElementById('folderName');

startDateInput.value = `${currentYear}-01-01`;
endDateInput.value = `${currentYear}-12-31`;

startDateInput.addEventListener('change', () => {
  endDateInput.min = startDateInput.value;
  if (endDateInput.value < startDateInput.value) endDateInput.value = startDateInput.value;
});

const DOCS_URL = "https://github.com/YOUR_USERNAME/procare-downloader";
document.getElementById('helpBtn').onclick = () => chrome.tabs.create({ url: DOCS_URL });

document.getElementById('purgeBtn').onclick = () => {
    if (confirm("⚠️ ARE YOU SURE?\nThis will wipe all scan memory.")) {
        chrome.storage.local.clear(() => alert("History Purged!"));
    }
};

async function trigger(type) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });

  chrome.tabs.sendMessage(tab.id, { 
    action: "start_scan", 
    startDate: startDateInput.value, 
    endDate: endDateInput.value, 
    mediaType: type,
    folder: folderInput.value.replace(/[^a-z0-9_\-\/]/gi, '_')
  });
  window.close();
}

document.getElementById("allBtn").onclick = () => trigger('all');
document.getElementById("photoBtn").onclick = () => trigger('photo');
document.getElementById("videoBtn").onclick = () => trigger('video');