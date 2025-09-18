// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString();
    sendResponse({selectedText: selectedText});
  }
});

// Add a message listener to handle custom events from the page
window.addEventListener('message', function(event) {
  // Only accept messages from the same frame
  if (event.source !== window) return;

  // Check if the message is from a code editor (like CodeMirror used by many coding sites)
  if (event.data.type && event.data.type === 'codeSelected') {
    chrome.runtime.sendMessage({
      action: 'codeSelected',
      code: event.data.code
    });
  }
}, false);