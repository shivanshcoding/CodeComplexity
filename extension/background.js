// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(function() {
  // Remove existing menu items to avoid duplicates
  chrome.contextMenus.removeAll(function() {
    // Create the context menu item
    chrome.contextMenus.create({
      id: "analyzeCode",
      title: "Analyze Selected Code",
      contexts: ["selection"],
      documentUrlPatterns: ["<all_urls>"]
    }, function() {
      // Check for any errors with menu creation
      if (chrome.runtime.lastError) {
        console.error("Error creating context menu:", chrome.runtime.lastError);
      } else {
        console.log("Context menu created successfully");
      }
    });
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "analyzeCode") {
    // Get the selected text from the content script
    chrome.tabs.sendMessage(tab.id, {action: "getSelectedText"}, function(response) {
      if (response && response.selectedText) {
        analyzeCode(response.selectedText);
      }
    });
  }
});

// Function to send code to backend for analysis
function analyzeCode(code) {
  // Store the code snippet
  chrome.storage.local.set({codeSnippet: code});
  
  // Update popup UI to show loading state
  chrome.storage.local.set({
    analysisStatus: 'loading'
  });
  
  // Send code to backend API
  fetch('http://localhost:5000/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: code
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    // Store analysis results
    chrome.storage.local.set({
      analysisResults: data,
      analysisStatus: 'complete'
    });
    
    // Notify user that analysis is complete
    chrome.action.setBadgeText({text: "✓"});
    chrome.action.setBadgeBackgroundColor({color: "#4CAF50"});
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({text: ""});
    }, 5000);
  })
  .catch(error => {
    console.error('Error:', error);
    chrome.storage.local.set({
      analysisStatus: 'error',
      analysisError: error.message
    });
    
    // Notify user that an error occurred
    chrome.action.setBadgeText({text: "!"});
    chrome.action.setBadgeBackgroundColor({color: "#F44336"});
    
    // Clear badge after 5 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({text: ""});
    }, 5000);
  });
}