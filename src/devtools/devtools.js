class PerformanceMetricsDevTools {
  constructor() {
    this.currentTabId = null;
    this.port = null;
    this.panels = {};
    this.init();
    this.updatePageUrl();
    this.refresh();
    this.initSystemMetrics();
    this.setupRefreshButton();
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
          console.log('Received API data in devtools:', message.data.apiPerformance); // ADD THIS LINE
          this.updatePanels(message.data);
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
      this.panels.apiPerformance = new APIPerformancePanel('apiPerformancePanel');
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
    try {
      console.log('Received metrics update:', data); // Debug log

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
      if (data.apiPerformance && this.panels.apiPerformance) {
        console.log('Updating API panel with:', data.apiPerformance); // ADD THIS LINE
        this.panels.apiPerformance.update(data.apiPerformance);
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
}

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