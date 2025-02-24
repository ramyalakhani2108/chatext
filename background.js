chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Keep the service worker alive for Socket.IO
chrome.runtime.onConnect.addListener((port) => {
    console.log('Side panel connected');
});