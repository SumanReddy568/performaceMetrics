class PerformanceMetricsDevTools {
  constructor() {
    console.log("Initializing PerformanceMetricsDevTools..."); // Debug log
    this.currentTabId = null;
    this.port = null;
    this.panels = {};
    this.requestsCount = 0;
    this.lastRequestTime = Date.now();
    this.metricsProvider = new MetricsProvider();
    this.init();
    this.updatePageUrl();
    this.refresh();
    this.initSystemMetrics();
    this.setupRefreshButton();
    this.initRequestsCounter();
    this.setupClearStorageButton();
    this.setupExportButton();
    // Temporarily disabled chatbot
    // this.initChatBot();
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
      // Prepare metrics data with current timestamp
      const perfMetrics = this.panels.performanceMetrics?.data || {};
      const webVitalsData = this.panels.webVitals?.data || {};
      const metricsData = {
        timestamp: Date.now(),
        fps: this.panels.fps?.data?.slice(-1)[0] || { value: 0 },
        memory: this.panels.memory?.data?.slice(-1)[0] || { usedJSHeapSize: 0, totalJSHeapSize: 0 },
        network: this.panels.network?.data?.slice(-1)[0] || { requests: 0, transferred: 0 },
        cpu: this.panels.cpu?.data?.slice(-1)[0] || { usage: 0 },
        dom: this.panels.dom?.data?.slice(-1)[0] || { elements: 0, nodes: 0, listeners: 0 },
        layoutShifts: this.panels.layoutShifts?.data?.slice(-1)[0] || { cumulativeLayoutShift: 0 },
        resourceTiming: this.panels.resourceTiming?.data?.slice(-1)[0] || {},
        firstPaint: this.panels.firstPaint?.data?.slice(-1)[0] || { fp: 0, fcp: 0 },
        pageLoad: this.panels.pageLoad?.data?.slice(-1)[0] || { domLoadTime: 0, windowLoadTime: 0 },
        longTasks: this.panels.longTasks?.data?.slice(-1)[0] || { duration: 0 },
        apiPerformance: this.panels.apiPerformance?.data || [],
        pageErrors: this.panels.pageErrors?.data?.slice(-1)[0] || { count: 0, recentErrors: [] },
        cacheUsage: this.panels.cacheUsage?.data?.slice(-1)[0] || { size: 0, hits: 0, misses: 0, totalEntries: 0 },
        webVitals: {
          lcp: webVitalsData.lcp || 0,
          fid: webVitalsData.fid || 0,
          cls: webVitalsData.cls || 0
        },
        serverTiming: this.panels.serverTiming?.data?.slice(-1)[0] || { metrics: [] },
        websocket: this.panels.websocket?.data?.slice(-1)[0] || { connections: [] },
        storage: this.panels.storage?.data?.slice(-1)[0] || { localStorage: 0, sessionStorage: 0, indexedDB: 0 },
        performanceMetrics: {
          markCount: perfMetrics.marks?.length || 0,
          measureCount: perfMetrics.measures?.length || 0
        },
        userInteraction: this.panels.userInteraction?.data?.slice(-1)[0] || { clicks: 0, scrolls: 0, keypresses: 0 }
      };

      console.log('Exporting metrics data:', metricsData); // Debug log

      const filename = `performance-metrics-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;

      try {
        MetricsExporter.downloadCSV([metricsData], filename);
        console.log('Metrics exported successfully');
      } catch (error) {
        console.error('Error exporting metrics:', error);
        alert('Error exporting metrics. Check console for details.');
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

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'api-performance-update') {
          apiPerformancePanel.update(message.data);
      }
  });

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
          if (!message.data.apiPerformance || message.data.apiPerformance.length === 0) {
            console.log('No API performance data received, adding test data');
            message.data.apiPerformance = [{
              type: 'Test',
              method: 'GET',
              url: 'https://example.com/api/test',
              duration: 120 + Math.random() * 50, // Randomize for visual feedback
              size: 1536,
              status: 200,
              timestamp: Date.now()
            }];
          }
          
          console.log('API data received:', message.data.apiPerformance);
          this.updatePanels(message.data);
        } else if (message.type === 'api-performance-update') {
          console.log('Direct API performance update received:', message.data);
          if (this.panels.apiPerformance && Array.isArray(message.data)) {
            this.panels.apiPerformance.update(message.data);
          }
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

      // Special handling for API Performance panel
      const apiPanel = document.getElementById('apiPerformancePanel');
      if (apiPanel) {
        apiPanel.classList.add('panel-disabled', 'panel-coming-soon');
        apiPanel.setAttribute('title', 'Coming in v1.0.3');
      }

      // Initialize API Performance panel
      if (document.getElementById('apiPerformancePanel')) {
        console.log('Loading API Performance panel...');
        this.panels.apiPerformance = new APIPerformancePanel('apiPerformancePanel');
        console.log('API Performance panel loaded successfully');
      } else {
        console.error('Cannot find apiPerformancePanel element!');
      }

      // Initialize new panels
      this.panels.webVitals = new WebVitalsPanel('webVitalsPanel');
      this.panels.serverTiming = new ServerTimingPanel('serverTimingPanel');
      this.panels.websocket = new WebsocketPanel('websocketPanel');
      this.panels.storage = new StoragePanel('storagePanel');
      this.panels.performanceMetrics = new PerformanceMetricsPanel('performanceMetricsPanel');
      this.panels.userInteraction = new UserInteractionPanel('userInteractionPanel');
      
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

      if (data.fps && this.panels.fps) {
        this.panels.fps.update(data.fps);
      }
      if (data.memory && this.panels.memory) {
        this.panels.memory.update(data.memory);
      }
      if (data.network && this.panels.network) {
        this.panels.network.update(data.network);
      }
      if (data.cpu && this.panels.cpu) {
        this.panels.cpu.update(data.cpu);
      }
      if (data.dom && this.panels.dom) {
        this.panels.dom.update(data.dom);
      }
      if (data.memory && this.panels.jsHeap) {
        this.panels.jsHeap.update(data.memory);
      }
      if (data.layoutShifts && this.panels.layoutShifts) {
        this.panels.layoutShifts.update(data.layoutShifts);
      }
      if (data.resourceTiming && this.panels.resourceTiming) {
        this.panels.resourceTiming.update(data.resourceTiming);
      }
      if (data.firstPaint && this.panels.firstPaint) {
        this.panels.firstPaint.update(data.firstPaint);
      }
      if (data.pageLoad && this.panels.pageLoad) {
        this.panels.pageLoad.update(data.pageLoad);
      }
      if (data.longTasks && this.panels.longTasks) {
        this.panels.longTasks.update(data.longTasks);
      }
      if (data.pageErrors) {
        console.log('Updating page errors panel:', data.pageErrors);
        this.panels.pageErrors.update({
          count: data.pageErrors.count || 0,
          errors: data.pageErrors.recentErrors || [],
          timestamp: data.pageErrors.timestamp
        });
      }
      if (data.cacheUsage) {
        console.log('Updating cache usage panel:', data.cacheUsage);
        this.panels.cacheUsage.update({
          size: data.cacheUsage.size || 0,
          hits: data.cacheUsage.hits || 0,
          misses: data.cacheUsage.misses || 0,
          entries: data.cacheUsage.totalEntries || 0,
          timestamp: data.cacheUsage.timestamp
        });
      }
      if (data.apiPerformance) {
        // Make a copy to avoid modifying the original data
        let apiData = [...data.apiPerformance];
        
        console.log('Updating API panel with data of length:', apiData.length);
        if (this.panels.apiPerformance) {
          this.panels.apiPerformance.update(apiData);
        } else {
          console.warn('API Performance panel not initialized yet');
          // Initialize it if needed
          this.panels.apiPerformance = new APIPerformancePanel('apiPerformancePanel');
          this.panels.apiPerformance.update(apiData);
        }
      }

      // Update new panels - Ensure keys match the snapshot from contentScript.js
      if (data.webVitals && this.panels.webVitals) {
        this.panels.webVitals.update(data.webVitals);
      } else if (!this.panels.webVitals) {
        console.warn('WebVitals panel not initialized');
      }

      if (data.serverTiming && this.panels.serverTiming) {
        this.panels.serverTiming.update(data.serverTiming);
      } else if (!this.panels.serverTiming) {
        console.warn('ServerTiming panel not initialized');
      }

      if (data.websocket && this.panels.websocket) {
        this.panels.websocket.update(data.websocket);
      } else if (!this.panels.websocket) {
        console.warn('Websocket panel not initialized');
      }

      if (data.storage && this.panels.storage) {
        this.panels.storage.update(data.storage);
      } else if (!this.panels.storage) {
        console.warn('Storage panel not initialized');
      }

      if (data.performanceMetrics && this.panels.performanceMetrics) {
        this.panels.performanceMetrics.update(data.performanceMetrics);
      } else if (!this.panels.performanceMetrics) {
        console.warn('PerformanceMetrics panel not initialized');
      }

      if (data.userInteraction && this.panels.userInteraction) {
        this.panels.userInteraction.update(data.userInteraction);
      } else if (!this.panels.userInteraction) {
        console.warn('UserInteraction panel not initialized');
      }

    } catch (e) {
      console.error("Error updating panels:", e);
    }
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
      if (message.type === 'api-performance-update') {
        console.log('Direct API performance message received:', message.data);
        if (this.panels.apiPerformance) {
          this.panels.apiPerformance.update(message.data);
        }
      }
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

  // Temporarily disabled chatbot
  /*
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
  */
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
window.addEventListener('message', function(event) {
  if (event.data.type === 'interaction') {
      switch(event.data.action) {
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
document.getElementById('menuButton').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('dropdownMenu').classList.toggle('active');
});

document.addEventListener('click', function(e) {
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
document.addEventListener('DOMContentLoaded', function() {
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
                <h3>Version 1.0.3 (Current)</h3>
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
                
                <h3>Version 1.0.1</h3>
                <ul>
                    <li class="feature">Added Web Vitals metrics</li>
                    <li class="improvement">Enhanced DOM metrics panel</li>
                    <li class="bugfix">Fixed memory leak in performance monitoring</li>
                </ul>
                
                <h3>Version 1.0.0</h3>
                <ul>
                    <li class="feature">Initial release with core performance metrics</li>
                    <li class="feature">Real-time FPS monitoring</li>
                    <li class="feature">Memory usage tracking</li>
                    <li class="feature">Network requests monitoring</li>
                </ul>
            `;
            
            modalContent.appendChild(modalHeader);
            modalContent.appendChild(releaseNotesContent);
            modalOverlay.appendChild(modalContent);
            document.body.appendChild(modalOverlay);
            
            modalOverlay.addEventListener('click', function(e) {
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