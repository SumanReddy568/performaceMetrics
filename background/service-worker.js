let connections = new Map();
let refreshedTabs = new Set();
let monitoringInterval = null;
let isMonitoring = false;
let showCPU = true; // alternates between CPU and Memory

console.log("Service Worker: Starting initialization");

// -----------------------------
// KEEP ALIVE (service worker stays awake)
// -----------------------------
function keepAlive() {
  setTimeout(keepAlive, 20 * 1000);
}
keepAlive();

// -----------------------------
// LOG CONNECTIONS (devtools linkage)
// -----------------------------
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "devtools") return;

  const extensionListener = (message) => {
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
    }
  };

  port.onMessage.addListener(extensionListener);

  port.onDisconnect.addListener(() => {
    port.onMessage.removeListener(extensionListener);
    for (const [tabId, conn] of connections.entries()) {
      if (conn === port) {
        connections.delete(tabId);
        chrome.tabs.sendMessage(tabId, { type: "deactivate" });
        break;
      }
    }
  });
});

// -----------------------------
// MESSAGE RELAY
// -----------------------------
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.tab) {
    const port = connections.get(sender.tab.id);
    if (port) {
      port.postMessage(message);
      sendResponse({ status: "forwarded" });
    } else {
      sendResponse({ status: "no_connection" });
    }
  }
  return true;
});

// -----------------------------
// METRICS UPDATE RELAY
// -----------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "metrics-update") {
    chrome.runtime.sendMessage({
      type: "metrics-update",
      data: { ...msg.data },
    });
  }
});

// -----------------------------
// API PERFORMANCE RELAY
// -----------------------------
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "api-performance-update") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, message);
      }
    });
  }
});

// -----------------------------
// SYSTEM INFO HELPER
// -----------------------------
async function getSystemInfo() {
  try {
    // Check if system APIs are available
    if (!chrome.system || !chrome.system.cpu || !chrome.system.memory) {
      console.warn("System APIs not available");
      return null;
    }
    
    const [cpuInfo, memoryInfo] = await Promise.all([
      chrome.system.cpu.getInfo(),
      chrome.system.memory.getInfo(),
    ]);
    
    return { cpuInfo, memoryInfo };
  } catch (error) {
    console.error("System info error:", error);
    return null;
  }
}

// -----------------------------
// ENSURE ICON VISIBILITY - CRITICAL (DEFINED FIRST)
// -----------------------------
async function ensureIconVisible() {
  try {
    // Use default icon paths from manifest
    const defaultIcon = {
      16: "icons/icon16.png",
      32: "icons/icon32.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png"
    };
    
    // Set icon using path (most reliable method)
    await chrome.action.setIcon({
      path: defaultIcon
    });
    
    // Check for runtime errors (Chrome API sometimes throws but still works)
    if (chrome.runtime.lastError) {
      // Only log if it's a real error, not just a warning
      const errorMsg = chrome.runtime.lastError.message;
      if (errorMsg && !errorMsg.includes("Failed to fetch")) {
        console.warn("Icon setting warning:", errorMsg);
      }
    }
    
    // Also set title to ensure extension is recognized
    await chrome.action.setTitle({
      title: "Performance Metrics - CPU & Memory Monitor"
    });
    
  } catch (err) {
    // Only log if it's a real error that prevents functionality
    const errorMsg = err.message || String(err);
    if (errorMsg && !errorMsg.includes("Failed to fetch")) {
      console.error("Error ensuring icon visibility:", err);
    }
    // Don't try fallback - if main method fails, manifest default icon will be used
  }
}

// -----------------------------
// ICON UPDATER - SIMPLIFIED APPROACH
// -----------------------------
async function updatePinnedIcon() {
  try {
    // ALWAYS ensure default icon is set first
    await ensureIconVisible();
    
    const systemInfo = await getSystemInfo();
    
    if (!systemInfo) {
      // Show error badge if system APIs not available
      await chrome.action.setBadgeText({ text: "ERR" });
      await chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
      return;
    }

    const { cpuInfo, memoryInfo } = systemInfo;

    // ---- CPU Calculation ----
    let totalCPUUsage = 0;
    cpuInfo.processors.forEach((proc) => {
      const { user, kernel, idle } = proc.usage;
      const total = user + kernel + idle;
      if (total > 0) {
        totalCPUUsage += ((user + kernel) / total) * 100;
      }
    });
    const avgCPU = Math.round(totalCPUUsage / Math.max(cpuInfo.processors.length, 1));

    // ---- MEMORY Calculation ----
    const memUsage = Math.round(
      ((memoryInfo.capacity - memoryInfo.availableCapacity) / memoryInfo.capacity) * 100
    );

    // Use badge to show metrics (simpler and more reliable)
    const value = showCPU ? avgCPU : memUsage;
    const metricType = showCPU ? "CPU" : "Memory";
    
    // Format badge text: just percentage "6%" or "58%"
    const badgeText = `${value}%`;
    
    // Set badge text
    await chrome.action.setBadgeText({ text: badgeText });
    
    // Set tooltip/title to show what metric it is on hover
    await chrome.action.setTitle({
      title: `${metricType}: ${value}%`
    });
    
    // Set badge color based on usage
    let badgeColor;
    if (value > 90) {
      badgeColor = "#ff4444"; // Red for high usage
    } else if (value > 70) {
      badgeColor = "#ffa500"; // Orange for medium usage
    } else {
      badgeColor = showCPU ? "#00BFFF" : "#FFD700"; // Blue for CPU, Yellow for Memory
    }
    
    await chrome.action.setBadgeBackgroundColor({ color: badgeColor });

    // Toggle between CPU and Memory for next update
    showCPU = !showCPU;
    
  } catch (err) {
    console.error("Icon update error:", err);
    // Final fallback - ensure default icon is visible
    try {
      await ensureIconVisible();
      await chrome.action.setBadgeText({ text: "ERR" });
      await chrome.action.setBadgeBackgroundColor({ color: "#ff4444" });
    } catch (finalError) {
      console.error("Final fallback failed:", finalError);
    }
  }
}

// -----------------------------
// MONITORING CONTROL
// -----------------------------
function startMonitoring() {
  if (isMonitoring) return;
  isMonitoring = true;
  console.log("Starting performance monitoring");
  
  // Ensure default icon is visible first
  ensureIconVisible();
  
  // Then try to update with dynamic icon
  updatePinnedIcon(); // initial draw
  monitoringInterval = setInterval(updatePinnedIcon, 3000); // every 3s
}

function stopMonitoring() {
  if (!isMonitoring) return;
  isMonitoring = false;
  console.log("Stopping performance monitoring");
  clearInterval(monitoringInterval);
  monitoringInterval = null;
}

// -----------------------------
// INITIALIZATION - PRIORITY: ICON FIRST
// -----------------------------

// CRITICAL: Set icon IMMEDIATELY when service worker loads
(async () => {
  console.log("Service Worker: IMMEDIATE icon initialization");
  await ensureIconVisible();
  console.log("Service Worker: Icon initialized");
})();

chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension started - initializing");
  await ensureIconVisible();
  setTimeout(startMonitoring, 500);
});

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);
  // CRITICAL: Set icon FIRST before anything else
  await ensureIconVisible();
  setTimeout(startMonitoring, 500);
});

// Start monitoring after a short delay to ensure icon is set
setTimeout(() => {
  console.log("Service Worker: Starting monitoring");
  startMonitoring();
}, 200);