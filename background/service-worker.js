let connections = new Map();
let refreshedTabs = new Set();

// Log active connections for debugging
function logConnections() {
  console.log('Active connections:', Array.from(connections.keys()));
}

chrome.runtime.onConnect.addListener(function(port) {
  console.log('New connection attempt:', port.name);
  
  if (port.name !== "devtools") return;

  const extensionListener = function(message) {
    if (message.type === "init") {
      connections.set(message.tabId, port);
      
      // Check if this tab needs to be refreshed
      if (message.shouldRefresh && !refreshedTabs.has(message.tabId)) {
        refreshedTabs.add(message.tabId);
        chrome.tabs.reload(message.tabId, { bypassCache: true });
      }
      
      console.log('Connection established for tab:', message.tabId);
      logConnections();
    }
  }

  port.onMessage.addListener(extensionListener);
  port.onDisconnect.addListener(function(port) {
    console.log('Port disconnected');
    port.onMessage.removeListener(extensionListener);
    for (let [tabId, conn] of connections.entries()) {
      if (conn === port) {
        console.log('Removing connection for tab:', tabId);
        connections.delete(tabId);

        // Notify the content script to deactivate
        chrome.tabs.sendMessage(tabId, { type: 'deactivate' });
        break;
      }
    }
    logConnections();
  });
});

// Clear refresh status when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  refreshedTabs.delete(tabId);
});

// Forward content script messages to devtools
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script message:', message, 'from tab:', sender.tab?.id);
  
  if (sender.tab) {
    const port = connections.get(sender.tab.id);
    if (port) {
      port.postMessage(message);
      sendResponse({ status: 'forwarded' });
    } else {
      console.log('No connection found for tab:', sender.tab.id);
      sendResponse({ status: 'no_connection' });
    }
  }
  return true;
});

// Set up a keep-alive mechanism
function keepAlive() {
  console.log("keep alive");
  setTimeout(keepAlive, 20 * 1000);  // Keep alive every 20 seconds
}

keepAlive();

// Optional: You can add event listeners for install and activate events
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Extension started');
});