const connections = {};

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "devtools") return;

  const extensionListener = (message, sender, sendResponse) => {
    // The original connection event doesn't include the tab ID of the
    // DevTools page, so we need to send it explicitly.
    if (message.type === 'init') {
      connections[message.tabId] = port;
      return;
    }
  };

  // Listen to messages sent from the DevTools page
  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener((port) => {
    port.onMessage.removeListener(extensionListener);

    const tabs = Object.keys(connections);
    for (let i = 0, len = tabs.length; i < len; i++) {
      if (connections[tabs[i]] === port) {
        delete connections[tabs[i]];
        break;
      }
    }
  });
});

// Receive message from content script and relay to the devTools page for the current tab
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Messages from content scripts should have a sender.tab
  if (sender.tab) {
    const tabId = sender.tab.id;
    if (tabId in connections) {
      connections[tabId].postMessage(message);
    }
  } else {
    // console.log("sender.tab not defined");
  }
  return true;
});
