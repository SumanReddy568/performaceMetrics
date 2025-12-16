class PerformanceMetricsDevTools {
  constructor() {
    console.log("Initializing PerformanceMetricsDevTools..."); // Debug log
    this.currentTabId = null;
    this.port = null;
    this.panels = {};
    this.requestsCount = 0;
    this.lastRequestTime = Date.now();
    this.metricsProvider = new MetricsProvider();

    // Check dock position before initializing
    this.createErrorOverlay();
    this.checkDockPosition();

    this.init();
    this.updatePageUrl();
    this.refresh();
    this.initSystemMetrics();
    this.setupRefreshButton();
    this.initRequestsCounter();
    this.setupClearStorageButton();
    this.setupExportButton();
    this.setupLogoutButton(); // Add logout button listener

    // Check authentication immediately
    if (window.AuthModule && !window.AuthModule.requireAuth()) {
      return;
    }

    this.initChatBot(); // Re-enabled

    // Listen for dock position changes
    this.listenForDockChanges();
  }

  createErrorOverlay() {
    // Create error overlay element if it doesn't exist
    if (!document.getElementById('dockErrorOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'dockErrorOverlay';
      overlay.className = 'dock-error-overlay';

      const errorContent = document.createElement('div');
      errorContent.className = 'dock-error-content';

      const icon = document.createElement('div');
      icon.innerHTML = '⚠️';
      icon.className = 'dock-error-icon';

      const title = document.createElement('h2');
      title.textContent = 'Incorrect Dock Position';

      const message = document.createElement('p');
      message.innerHTML = 'This extension only works in <strong>bottom dock mode</strong>.<br>Please use the menu in the top-right corner to change the dock position.';

      const instructions = document.createElement('div');
      instructions.className = 'dock-instructions';
      instructions.innerHTML = `
        <p>How to change dock position:</p>
        <ol>
          <li>Click the three-dot menu in the top-right corner of DevTools</li>
          <li>Select "Dock to bottom"</li>
          <li>Refresh the DevTools panel</li>
        </ol>
      `;

      errorContent.appendChild(icon);
      errorContent.appendChild(title);
      errorContent.appendChild(message);
      errorContent.appendChild(instructions);
      overlay.appendChild(errorContent);

      // Add styles for the overlay
      const styles = document.createElement('style');
      styles.textContent = `
        .dock-error-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(30, 30, 30, 0.96);
          z-index: 10000;
          display: none;
          justify-content: center;
          align-items: center;
          color: white;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .dock-error-content {
          background-color: #2c2c2c;
          border-radius: 8px;
          padding: 24px;
          max-width: 500px;
          text-align: center;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .dock-error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .dock-instructions {
          background-color: #1d1d1d;
          border-radius: 6px;
          padding: 12px;
          margin-top: 16px;
          text-align: left;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .dock-instructions ol {
          margin-left: 20px;
          padding-left: 0;
        }
        .dock-instructions li {
          margin: 8px 0;
        }
        .dock-error-overlay.active {
          display: flex;
        }
      `;

      document.head.appendChild(styles);
      document.body.appendChild(overlay);
    }
  }

  checkDockPosition() {
    // Use chrome.devtools.panels API to get panel dimensions
    chrome.devtools.panels.elements.createSidebarPane('DockDetect', (sidebar) => {
      sidebar.setObject({ detecting: true });

      // Use the panel size to determine the dock position
      setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        console.log(`DevTools dimensions: ${width}x${height}`);

        // If width is significantly greater than height, it's likely in bottom dock
        // If height is significantly greater than width, it's likely in side dock
        const isBottomDock = width > height * 1.3;

        if (!isBottomDock) {
          this.showDockError(true);
        } else {
          this.showDockError(false);
        }

        // Clean up the temporary sidebar
        chrome.devtools.panels.elements.onSelectionChanged.removeListener(() => { });
        sidebar.setObject({ done: true });
      }, 500);
    });
  }

  listenForDockChanges() {
    // Check dock position whenever window is resized
    window.addEventListener('resize', () => {
      // Debounce the resize event
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.checkDockPosition();
      }, 250);
    });
  }

  showDockError(show) {
    const overlay = document.getElementById('dockErrorOverlay');
    if (overlay) {
      if (show) {
        overlay.classList.add('active');
        console.warn('Extension requires bottom dock mode');
      } else {
        overlay.classList.remove('active');
      }
    }
  }

  async refresh() {
    // Wait a bit to ensure everything is initialized
    setTimeout(() => {
      chrome.devtools.inspectedWindow.reload({
        ignoreCache: true
      });
    }, 1000);
  }

  setupRefreshButton() {
    const refreshButton = document.getElementById('refreshButton');
    refreshButton.addEventListener('click', () => {
      this.refreshPanels();
    });
  }

  setupClearStorageButton() {
    const clearStorageButton = document.getElementById('clearStorageButton');
    clearStorageButton.addEventListener('click', async () => {
      try {
        // Clear chrome.storage.local
        await chrome.storage.local.clear();

        // Clear chrome.storage.sync if used
        await chrome.storage.sync.clear();

        // Clear IndexedDB if used
        const dbs = await window.indexedDB.databases();
        for (const db of dbs) {
          window.indexedDB.deleteDatabase(db.name);
        }

        // Show success message
        alert('Extension storage cleared successfully!');

        // Refresh panels to reflect cleared state
        this.refreshPanels();
      } catch (error) {
        console.error('Error clearing storage:', error);
        alert('Error clearing storage: ' + error.message);
      }
    });
  }

  setupExportButton() {
    const exportButton = document.getElementById('exportButton');
    exportButton.addEventListener('click', () => {
      // Gather all panel data for full JSON export
      const allPanelData = {};
      for (const key in this.panels) {
        if (this.panels[key] && this.panels[key].data !== undefined) {
          allPanelData[key] = this.panels[key].data;
        }
      }
      const filename = `performance-metrics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      try {
        MetricsExporter.downloadJSON(allPanelData, filename);
        console.log('Metrics exported as JSON successfully');
      } catch (error) {
        console.error('Error exporting metrics as JSON:', error);
        alert('Error exporting metrics as JSON. Check console for details.');
      }
    });
  }

  refreshPanels() {
    this.clearPanels();
    this.loadPanels();
  }

  updatePageUrl() {
    chrome.devtools.inspectedWindow.eval(
      'window.location.href',
      (result, error) => {
        if (!error) {
          const urlElement = document.getElementById('currentUrl');
          urlElement.textContent = this.formatUrl(result);
          urlElement.title = result; // Set full URL as tooltip
        }
      }
    );



    // Update URL when page changes
    chrome.devtools.network.onNavigated.addListener((url) => {
      const urlElement = document.getElementById('currentUrl');
      urlElement.textContent = this.formatUrl(url);
      urlElement.title = url; // Set full URL as tooltip
    });
  }

  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      const maxLength = 75; // Maximum URL length to display

      let formatted = url;
      if (url.length > maxLength) {
        // Keep protocol and hostname
        const base = `${urlObj.protocol}//${urlObj.hostname}`;
        const path = urlObj.pathname + urlObj.search + urlObj.hash;

        if (base.length > maxLength - 3) {
          // If hostname itself is too long
          formatted = base.substring(0, maxLength - 3) + '...';
        } else {
          // Truncate the path part
          const availableLength = maxLength - base.length - 3;
          formatted = base + path.substring(0, availableLength) + '...';
        }
      }
      return formatted;
    } catch (e) {
      return url.substring(0, 75) + '...';
    }
  }

  async init() {
    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        this.currentTabId = tabs[0].id;
        this.connectToBackground();
        this.loadPanels();
      }
    });

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tabId === this.currentTabId && changeInfo.url) {
        this.clearPanels();
        this.loadPanels();
      }
    });

    this.setupMessageListeners();
  }

  async connectToBackground() {
    try {
      if (this.port) {
        this.port.disconnect();
      }

      this.port = chrome.runtime.connect({ name: "devtools" });

      // Send init message with tab ID and trigger refresh
      this.port.postMessage({
        type: "init",
        tabId: chrome.devtools.inspectedWindow.tabId,
        shouldRefresh: true
      });

      this.port.onMessage.addListener((message) => {
        console.log('Devtools received message:', message);
        if (message.type === 'metrics-update') {
          // Special handling for API performance data
          this.updatePanels(message.data);
        } else if (message.type === 'api-performance-update') {
          // Legacy support or removed feature
        }
      });

      this.port.onDisconnect.addListener(() => {
        console.log("Disconnected, attempting reconnect in 1s");
        this.port = null;
        setTimeout(() => this.connectToBackground(), 1000);
      });

    } catch (e) {
      console.error("Connection error:", e);
      setTimeout(() => this.connectToBackground(), 1000);
    }
  }

  loadPanels() {
    try {
      // Load FPS panel
      this.panels.fps = new FPSPanel('fpsPanel');

      // Load Memory panel
      this.panels.memory = new MemoryPanel('memoryPanel');

      // Load Network panel
      this.panels.network = new NetworkPanel('networkPanel');

      // Load CPU panel
      this.panels.cpu = new CPUPanel('cpuPanel');

      // Load DOM panel
      this.panels.dom = new DOMPanel('domPanel');
      this.panels.jsHeap = new JSHeapPanel('jsHeapPanel');
      this.panels.layoutShifts = new LayoutShiftsPanel('layoutShiftsPanel');
      this.panels.resourceTiming = new ResourceTimingPanel('resourceTimingPanel');
      this.panels.firstPaint = new FirstPaintPanel('firstPaintPanel');
      this.panels.pageLoad = new PageLoadPanel('pageLoadPanel');
      this.panels.longTasks = new LongTasksPanel('longTasksPanel');

      this.panels.pageErrors = new PageErrorsPanel('pageErrorsPanel');
      this.panels.cacheUsage = new CacheUsagePanel('cacheUsagePanel');



      // Initialize new panels
      this.panels.webVitals = new WebVitalsPanel('webVitalsPanel');
      this.panels.serverTiming = new ServerTimingPanel('serverTimingPanel');
      this.panels.websocket = new WebsocketPanel('websocketPanel');
      this.panels.storage = new StoragePanel('storagePanel');
      this.panels.performanceMetrics = new PerformanceMetricsPanel('performanceMetricsPanel');
      this.panels.userInteraction = new UserInteractionPanel('userInteractionPanel');
      this.panels.eventLoopLag = new EventLoopLagPanel('eventLoopLagPanel');
      this.panels.paintTiming = new PaintTimingPanel('paintTimingPanel');
      this.panels.navigationTiming = new NavigationTimingPanel('navigationTimingPanel');
      this.panels.e2e = new E2EPanel('e2ePanel');

    } catch (e) {
      console.error("Error loading panels:", e);
    }
  }

  clearPanels() {
    try {
      Object.values(this.panels).forEach(panel => {
        if (panel && panel.destroy) {
          panel.destroy();
        }
      });
      this.panels = {};
    } catch (e) {
      console.error("Error clearing panels:", e);
    }
  }

  updatePanels(data) {
    console.log("Updating panels with data:", data); // Debug log

    try {
      this.metricsProvider.updateMetrics(data);

      // Helper function to safely update a panel
      const safeUpdatePanel = (panel, panelData) => {
        if (panel && typeof panel.update === 'function' && panelData) {
          try {
            // Explicitly call updateLastActivity before update to reset timer
            if (typeof panel.updateLastActivity === 'function') {
              panel.updateLastActivity();
            }
            panel.update(panelData);
            return true;
          } catch (e) {
            console.error(`Error updating panel:`, e);
            return false;
          }
        }
        return false;
      };

      // Update each panel with its corresponding data
      if (data.fps) safeUpdatePanel(this.panels.fps, data.fps);
      if (data.memory) {
        safeUpdatePanel(this.panels.memory, data.memory);
        safeUpdatePanel(this.panels.jsHeap, data.memory);
      }
      if (data.network) safeUpdatePanel(this.panels.network, data.network);
      if (data.cpu) safeUpdatePanel(this.panels.cpu, data.cpu);
      if (data.dom) safeUpdatePanel(this.panels.dom, data.dom);
      if (data.layoutShifts) safeUpdatePanel(this.panels.layoutShifts, data.layoutShifts);
      if (data.resourceTiming) safeUpdatePanel(this.panels.resourceTiming, data.resourceTiming);
      if (data.firstPaint) safeUpdatePanel(this.panels.firstPaint, data.firstPaint);
      if (data.pageLoad) safeUpdatePanel(this.panels.pageLoad, data.pageLoad);
      if (data.longTasks) safeUpdatePanel(this.panels.longTasks, data.longTasks);

      if (data.pageErrors) {
        console.log('Updating page errors panel:', data.pageErrors);
        safeUpdatePanel(this.panels.pageErrors, {
          count: data.pageErrors.count || 0,
          errors: data.pageErrors.recentErrors || [],
          timestamp: data.pageErrors.timestamp
        });
      }

      if (data.cacheUsage) {
        console.log('Updating cache usage panel:', data.cacheUsage);
        safeUpdatePanel(this.panels.cacheUsage, {
          size: data.cacheUsage.size || 0,
          hits: data.cacheUsage.hits || 0,
          misses: data.cacheUsage.misses || 0,
          entries: data.cacheUsage.totalEntries || 0,
          timestamp: data.cacheUsage.timestamp
        });
      }



      // Update new panels - Ensure keys match the snapshot from contentScript.js
      if (data.webVitals) safeUpdatePanel(this.panels.webVitals, data.webVitals);
      if (data.serverTiming) safeUpdatePanel(this.panels.serverTiming, data.serverTiming);
      if (data.websocket) safeUpdatePanel(this.panels.websocket, data.websocket);
      if (data.storage) safeUpdatePanel(this.panels.storage, data.storage);
      if (data.performanceMetrics) safeUpdatePanel(this.panels.performanceMetrics, data.performanceMetrics);
      if (data.userInteraction) safeUpdatePanel(this.panels.userInteraction, data.userInteraction);
      if (data.eventLoopLag) safeUpdatePanel(this.panels.eventLoopLag, data.eventLoopLag);
      if (data.paintTiming) safeUpdatePanel(this.panels.paintTiming, data.paintTiming);
      if (data.navigationTiming) safeUpdatePanel(this.panels.navigationTiming, data.navigationTiming);
      if (data.e2e) safeUpdatePanel(this.panels.e2e, data.e2e);

      // Auto-arrange panels after updating
      this.autoArrangePanels(data);

      // Force check all panels after short delay to ensure timeout works
      setTimeout(() => {
        Object.values(this.panels).forEach(panel => {
          if (panel && typeof panel.startActivityCheck === 'function') {
            panel.startActivityCheck();
          }
        });
      }, 1000);

    } catch (e) {
      console.error("Error updating panels:", e);
    }
  }

  setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutButton');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        window.location.href = 'logout.html';
      });
    }
  }

  autoArrangePanels(data) {
    // Panel keys and their DOM ids (order as in HTML)
    const panelKeyToId = [
      ['fps', 'fpsPanel'],
      ['memory', 'memoryPanel'],
      ['network', 'networkPanel'],
      ['cpu', 'cpuPanel'],
      ['dom', 'domPanel'],
      ['jsHeap', 'jsHeapPanel'],
      ['layoutShifts', 'layoutShiftsPanel'],
      ['resourceTiming', 'resourceTimingPanel'],
      ['firstPaint', 'firstPaintPanel'],
      ['pageLoad', 'pageLoadPanel'],
      ['longTasks', 'longTasksPanel'],
      ['userInteraction', 'userInteractionPanel'],
      ['webVitals', 'webVitalsPanel'],
      ['performanceMetrics', 'performanceMetricsPanel'],
      ['storage', 'storagePanel'],
      ['cacheUsage', 'cacheUsagePanel'],
      ['pageErrors', 'pageErrorsPanel'],
      ['serverTiming', 'serverTimingPanel'],
      ['websocket', 'websocketPanel'],
      ['eventLoopLag', 'eventLoopLagPanel'],
      ['paintTiming', 'paintTimingPanel'],
      ['navigationTiming', 'navigationTimingPanel'],
    ];

    const panelContainer = document.querySelector('.panel-container');
    if (!panelContainer) return;

    const panelsWithData = [];
    const panelsWithoutData = [];

    panelKeyToId.forEach(([panelKey, panelId]) => {
      const panelData = data[panelKey];
      const panelElem = document.getElementById(panelId);
      if (!panelElem) return;



      // Heuristic: consider panel has data if it's not null/undefined/empty
      let hasData = false;
      if (panelData !== undefined && panelData !== null) {
        if (Array.isArray(panelData)) {
          hasData = panelData.length > 0;
        } else if (typeof panelData === 'object') {
          hasData = Object.values(panelData).some(
            v => v !== null && v !== undefined && v !== 0 && v !== '' && !(Array.isArray(v) && v.length === 0)
          );
        } else {
          hasData = !!panelData;
        }
      }

      if (hasData) {
        panelsWithData.push(panelElem);
      } else {
        panelsWithoutData.push(panelElem);
      }
    });

    // Reorder: with data at the top, without data next, API Performance always last
    [...panelsWithData, ...panelsWithoutData].forEach(panelElem => {
      if (panelElem && panelElem.parentNode === panelContainer) {
        panelContainer.appendChild(panelElem);
      }
    });

  }

  async initSystemMetrics() {
    // Get Chrome version
    chrome.runtime.getPlatformInfo(info => {
      const userAgent = navigator.userAgent;
      const chromeVersion = userAgent.match(/Chrome\/([0-9.]+)/)[1];
      document.getElementById('chrome-version').textContent = `v${chromeVersion}`;
    });

    // Setup periodic updates
    this.updateSystemMetrics();
    setInterval(() => this.updateSystemMetrics(), 5000);
  }

  async updateSystemMetrics() {
    try {
      // Get Chrome windows and tabs count
      chrome.windows.getAll({ populate: true }, windows => {
        const windowCount = windows.length;
        const tabCount = windows.reduce((count, window) => count + window.tabs.length, 0);
        document.getElementById('chrome-windows').textContent = windowCount;
        document.getElementById('chrome-tabs').textContent = tabCount;
      });

      // Get network status
      const networkStatus = navigator.onLine ? 'Online' : 'Offline';
      const indicator = document.getElementById('network-indicator');
      indicator.className = 'metric-indicator ' + (navigator.onLine ? 'indicator-good' : 'indicator-bad');
      document.getElementById('network-status').textContent = networkStatus;

      // Get system memory (if available)
      if (chrome.system?.memory) {
        chrome.system.memory.getInfo(info => {
          const usedMemory = ((info.capacity - info.availableCapacity) / info.capacity * 100).toFixed(1);
          const formattedMemory = `${usedMemory}% (${this.formatBytes(info.capacity - info.availableCapacity)} / ${this.formatBytes(info.capacity)})`;
          document.getElementById('system-memory').textContent = formattedMemory;
        });
      }

      // Get CPU info (if available)
      if (chrome.system?.cpu) {
        chrome.system.cpu.getInfo(info => {
          let totalUsage = 0;
          let validProcessors = 0;

          info.processors.forEach(p => {
            if (p.usage && typeof p.usage.user === 'number') {
              totalUsage += (p.usage.user + p.usage.kernel) / p.usage.total * 100;
              validProcessors++;
            }
          });

          const avgUsage = validProcessors > 0 ? (totalUsage / validProcessors).toFixed(1) : 0;
          document.getElementById('system-cpu').textContent = `${avgUsage}%`;
        });
      }
    } catch (e) {
      console.error('Error updating system metrics:', e);
    }
  }

  // Helper function to format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  // Add a listener for direct chrome.runtime messages for API data
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

      if (message.type === 'userInteraction') {
        this.panels.userInteraction.update(message.data);
      }
      return true; // Keep the messaging channel open for async responses
    });
  }

  initRequestsCounter() {
    // Listen to network requests
    chrome.devtools.network.onRequestFinished.addListener(() => {
      this.requestsCount++;
    });

    // Update requests per second every second
    setInterval(() => {
      const now = Date.now();
      const timeDiff = (now - this.lastRequestTime) / 1000;
      const reqPerSec = (this.requestsCount / timeDiff).toFixed(1);

      document.getElementById('requests-per-sec').textContent = `${reqPerSec}/s`;

      // Reset counter
      this.requestsCount = 0;
      this.lastRequestTime = now;
    }, 1000);
  }

  // Re-enable chatbot initialization
  initChatBot() {
    console.log("Initializing ChatBotPanel...");
    const chatContainerId = "chatbot-container";
    let chatContainer = document.getElementById(chatContainerId);

    if (!chatContainer) {
      chatContainer = document.createElement("div");
      chatContainer.id = chatContainerId;
      document.body.appendChild(chatContainer);
    }

    this.chatBot = new ChatBotPanel(chatContainerId, this.metricsProvider);
    console.log("ChatBotPanel initialized successfully.");
  }
}

// Add this near other performance measurements
let interactionData = {
  clicks: 0,
  scrolls: 0,
  keypresses: 0
};

// Add these event listeners
chrome.devtools.inspectedWindow.eval(`
  document.addEventListener('click', () => {
      window.postMessage({ type: 'interaction', action: 'click' }, '*');
  });
  document.addEventListener('scroll', () => {
      window.postMessage({ type: 'interaction', action: 'scroll' }, '*');
  });
  document.addEventListener('keypress', () => {
      window.postMessage({ type: 'interaction', action: 'keypress' }, '*');
  });
`);

// Add this in your message handler
window.addEventListener('message', function (event) {
  if (event.data.type === 'interaction') {
    switch (event.data.action) {
      case 'click':
        interactionData.clicks++;
        break;
      case 'scroll':
        interactionData.scrolls++;
        break;
      case 'keypress':
        interactionData.keypresses++;
        break;
    }
    panels.userInteraction.update(interactionData);
  }
});

// Reset interaction data when refreshing
function resetMeasurements() {
  interactionData = { clicks: 0, scrolls: 0, keypresses: 0 };
}

// Add dropdown menu handling
document.getElementById('menuButton').addEventListener('click', function (e) {
  e.stopPropagation();
  document.getElementById('dropdownMenu').classList.toggle('active');
});

document.addEventListener('click', function (e) {
  if (!e.target.closest('.menu-wrapper')) {
    document.getElementById('dropdownMenu').classList.remove('active');
  }
});

// Panel Classes
class FPSPanel {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.chart = new ChartRenderer(this.element, {
      title: 'Frames Per Second',
      type: 'line',
      backgroundColor: 'rgba(75, 192, 192, 0.2)',
      borderColor: 'rgba(75, 192, 192, 1)'
    });
  }

  update(data) {
    try {
      this.chart.render(data);
    } catch (e) {
      console.error("Error rendering FPS chart:", e);
    }
  }

  destroy() {
    try {
      this.chart.destroy();
    } catch (e) {
      console.error("Error destroying FPS chart:", e);
    }
  }
}

class MemoryPanel {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.chart = new ChartRenderer(this.element, {
      title: 'Memory Usage (MB)',
      type: 'line',
      backgroundColor: 'rgba(153, 102, 255, 0.2)',
      borderColor: 'rgba(153, 102, 255, 1)'
    });
  }

  update(data) {
    try {
      this.chart.render(data);
    } catch (e) {
      console.error("Error rendering Memory chart:", e);
    }
  }

  destroy() {
    try {
      this.chart.destroy();
    } catch (e) {
      console.error("Error destroying Memory chart:", e);
    }
  }
}

class NetworkPanel {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.chart = new ChartRenderer(this.element, {
      title: 'Network Activity',
      type: 'line',
      backgroundColor: 'rgba(255, 159, 64, 0.2)',
      borderColor: 'rgba(255, 159, 64, 1)'
    });
  }

  update(data) {
    try {
      this.chart.render(data);
    } catch (e) {
      console.error("Error rendering Network chart:", e);
    }
  }

  destroy() {
    try {
      this.chart.destroy();
    } catch (e) {
      console.error("Error destroying Network chart:", e);
    }
  }
}

class CPUPanel {
  constructor(elementId) {
    this.element = document.getElementById(elementId);
    this.chart = new ChartRenderer(this.element, {
      title: 'CPU Usage',
      type: 'line',
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)'
    });
  }

  update(data) {
    try {
      this.chart.render(data);
    } catch (e) {
      console.error("Error rendering CPU chart:", e);
    }
  }

  destroy() {
    try {
      this.chart.destroy();
    } catch (e) {
      console.error("Error destroying CPU chart:", e);
    }
  }
}

// Initialize the devtools
new PerformanceMetricsDevTools();

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
  // Release notes modal functionality
  const releaseNotesButton = document.getElementById('releaseNotesButton');
  if (releaseNotesButton) {
    releaseNotesButton.addEventListener('click', showReleaseNotes);
  }

  function showReleaseNotes() {
    // Create modal if it doesn't exist
    let modalOverlay = document.querySelector('.modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.className = 'modal-overlay';

      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';

      const modalHeader = document.createElement('div');
      modalHeader.className = 'modal-header';

      const modalTitle = document.createElement('h2');
      modalTitle.textContent = 'Release Notes';

      const closeButton = document.createElement('button');
      closeButton.className = 'modal-close';
      closeButton.innerHTML = '&times;';
      closeButton.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
      });

      modalHeader.appendChild(modalTitle);
      modalHeader.appendChild(closeButton);

      const releaseNotesContent = document.createElement('div');
      releaseNotesContent.className = 'release-notes-content';

      releaseNotesContent.innerHTML = `
                <h3>Version 1.0.5 (Current)</h3>
                <ul>
                    <li class="feature">New pannels</li>
                    <li class="improvement">Auto Arrange pannels based on data</li>
                    <li class="improvement">Export Functionality</li>
                </ul>
                <h3>Version 1.0.3</h3>
                <ul>
                    <li class="feature">Added server timing metrics visualization</li>
                    <li class="improvement">Improved memory usage tracking accuracy</li>
                    <li class="bugfix">Fixed network bandwidth calculation issues</li>
                    <li class="improvement">Enhanced CPU utilization measurements</li>
                    <li class="feature">Added export functionality for metrics data</li>
                </ul>
                
                <h3>Version 1.0.2</h3>
                <ul>
                    <li class="feature">Added WebSocket connection tracking</li>
                    <li class="improvement">Improved UI responsiveness</li>
                    <li class="bugfix">Fixed FPS calculation during page idle</li>
                    <li class="feature">Added storage usage monitoring</li>
                </ul>
                
                // <h3>Version 1.0.1</h3>
                // <ul>
                //     <li class="feature">Added Web Vitals metrics</li>
                //     <li class="improvement">Enhanced DOM metrics panel</li>
                //     <li class="bugfix">Fixed memory leak in performance monitoring</li>
                // </ul>
                
                // <h3>Version 1.0.0</h3>
                // <ul>
                //     <li class="feature">Initial release with core performance metrics</li>
                //     <li class="feature">Real-time FPS monitoring</li>
                //     <li class="feature">Memory usage tracking</li>
                //     <li class="feature">Network requests monitoring</li>
                // </ul>
            `;

      modalContent.appendChild(modalHeader);
      modalContent.appendChild(releaseNotesContent);
      modalOverlay.appendChild(modalContent);
      document.body.appendChild(modalOverlay);

      modalOverlay.addEventListener('click', function (e) {
        if (e.target === modalOverlay) {
          modalOverlay.classList.remove('active');
        }
      });
    }

    modalOverlay.classList.add('active');

    const dropdownMenu = document.getElementById('dropdownMenu');
    if (dropdownMenu) {
      dropdownMenu.classList.remove('active');
    }
  }
});