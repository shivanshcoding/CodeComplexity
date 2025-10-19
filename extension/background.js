// Service worker: orchestrates side panel opening and data relay

// Initial setup for side panel behavior
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
});

// Relay messages between content and side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  if (message.action === 'code-selected') {
    const code = message.code || '';
    chrome.storage.local.set({ selectedCode: code }, () => {
      if (chrome.sidePanel && chrome.sidePanel.open && sender && sender.tab && sender.tab.id !== undefined) {
        chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
      }
      // The side panel will notify when it's ready; then we'll trigger analysis
    });
    return; // async
  }

  if (message.action === 'panel-ready') {
    // Instruct side panel to start analysis
    chrome.runtime.sendMessage({ action: 'start-analysis' });
    return;
  }
});
