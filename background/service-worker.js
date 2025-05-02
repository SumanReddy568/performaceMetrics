let connections = new Map();
let refreshedTabs = new Set();

function logConnections() {
    console.log('Active connections:', Array.from(connections.keys()));
}

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name !== "devtools") return;

    const extensionListener = function(message) {
        if (message.type === "init") {
            const tabId = message.tabId;
            connections.set(tabId, port);

            if (message.shouldRefresh && !refreshedTabs.has(tabId)) {
                refreshedTabs.add(tabId);
                chrome.tabs.reload(tabId, { bypassCache: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("Error reloading tab:", chrome.runtime.lastError.message);
                    }
                });
            }
            logConnections();
        }
    };

    port.onMessage.addListener(extensionListener);
    port.onDisconnect.addListener(function(port) {
        port.onMessage.removeListener(extensionListener);
        for (let [tabId, conn] of connections.entries()) {
            if (conn === port) {
                connections.delete(tabId);
                chrome.tabs.sendMessage(tabId, { type: 'deactivate' });
                break;
            }
        }
        logConnections();
    });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (sender.tab) {
        const port = connections.get(sender.tab.id);
        if (port) {
            port.postMessage(message);
            sendResponse({ status: 'forwarded' });
        } else {
            sendResponse({ status: 'no_connection' });
        }
    }
    return true;
});

function keepAlive() {
    setTimeout(keepAlive, 20 * 1000);
}

keepAlive();

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

chrome.runtime.onStartup.addListener(() => {
    console.log('Extension started');
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'api-performance-update') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, message);
            }
        });
    }
});