class PerformanceMetricsDevTools {
  constructor() {
    this.currentTabId = null;
    this.port = null;
    this.panels = {};
    this.init();
    this.updatePageUrl();
  }

  updatePageUrl() {
    chrome.devtools.inspectedWindow.eval(
      'window.location.href',
      (result, error) => {
        if (!error) {
          document.getElementById('currentUrl').textContent = result;
        }
      }
    );

    // Update URL when page changes
    chrome.devtools.network.onNavigated.addListener((url) => {
      document.getElementById('currentUrl').textContent = url;
    });
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

      this.port = chrome.runtime.connect({ 
        name: "devtools"
      });

      // Send init message with tab ID
      this.port.postMessage({
        type: "init",
        tabId: chrome.devtools.inspectedWindow.tabId
      });

      this.port.onMessage.addListener((message) => {
        console.log('Devtools received message:', message);
        if (message.type === 'metrics-update') {
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
      Object.values(this.panels).forEach(panel => panel.destroy());
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
        this.panels.apiPerformance.update(data.apiPerformance);
      }
    } catch (e) {
      console.error("Error updating panels:", e);
    }
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