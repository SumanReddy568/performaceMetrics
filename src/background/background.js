// ... existing code ...

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (message.type === 'metrics-update' && tabId && connections[tabId]) {
    // console.log(`Background received metrics-update from tab ${tabId}:`, message.data); // Optional: Add for debugging
    connections[tabId].postMessage({
      type: 'metrics-update',
      data: message.data
    });
  } else if (message.type === 'api-performance-update' && tabId && connections[tabId]) {
    // Forward API updates directly if needed (though they should be in metrics-update now)
    connections[tabId].postMessage({
        type: 'api-performance-update',
        data: message.data
    });
  }
  // Handle other message types if necessary
  return true; // Keep message channel open for async response if needed
});

// ... existing code ...
