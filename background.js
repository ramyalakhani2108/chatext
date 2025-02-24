// Listen for messages from the side panel to update the badge
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateBadge') {
        const count = message.count;
        console.log('Background received updateBadge with count:', count);
        
        // Set badge text (max 4 characters, use '+' for larger numbers)
        const badgeText = count > 0 ? (count > 999 ? '999+' : count.toString()) : '';
        chrome.action.setBadgeText({ text: badgeText });

        // Set badge background color (e.g., red)
        chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    }
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onConnect.addListener((port) => {
    console.log('Side panel connected');
});