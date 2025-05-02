class PerformanceCollector {
  constructor() {
    this.metrics = {
      fps: [],
      memory: [],
      network: [],
      cpu: [],
      dom: [],
      firstPaint: [],
      pageLoad: [],
      longTasks: [],
      apiPerformance: []
    };
    this._apiCalls = []; // Initialize API calls array
    this.listeners = []; // Add listeners array initialization
    this.init();
  }

  init() {
    this.startFPSCounter();
    this.startMemoryMonitor();
    this.startNetworkMonitor();
    this.startCPUMonitor();
    this.startDOMMonitor();
    this.startFirstPaintMonitor();
    this.startPageLoadMonitor();
    this.startLongTasksMonitor();

    // Send updates every second
    setInterval(() => this.sendUpdates(), 1000);
  }

  addListener(callback) {
    this.listeners.push(callback);
  }

  collectApiPerformance() {
    // Monitor XMLHttpRequest
    const originalXHR = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function (...args) {
      const startTime = performance.now();
      const method = this._method || 'GET';
      const url = this._url || 'Unknown URL';
      const xhr = this;

      this.addEventListener('loadend', function () {
        const duration = performance.now() - startTime;
        try {
          let size = 0;
          try {
            size = parseInt(xhr.getResponseHeader('content-length')) ||
              xhr.responseText?.length || 0;
          } catch (e) {
            size = xhr.responseText?.length || 0;
          }

          this._apiCalls.push({
            type: 'XHR',
            method,
            url,
            duration,
            size,
            status: xhr.status,
            timestamp: Date.now()
          });

          // Send immediately when we get new API data
          this.sendApiPerformanceUpdate();
        } catch (e) {
          console.warn('Error measuring XHR response:', e);
        }
      }.bind(this));

      return originalXHR.apply(this, args);
    }.bind(this);

    const originalOpen = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url) {
      this._method = method;
      this._url = url;
      return originalOpen.apply(this, arguments);
    };

    // Monitor Fetch API
    const originalFetch = window.fetch;
    window.fetch = async function (resource, options = {}) {
      const startTime = performance.now();
      const method = options.method || 'GET';
      const url = typeof resource === 'string' ? resource : resource.url;

      try {
        const response = await originalFetch.apply(this, arguments);
        const duration = performance.now() - startTime;

        try {
          const clone = response.clone();
          const buffer = await clone.arrayBuffer();
          const size = buffer.byteLength;

          this._apiCalls.push({
            type: 'Fetch',
            method,
            url,
            duration,
            size,
            status: response.status,
            timestamp: Date.now()
          });

          // Send immediately when we get new API data
          this.sendApiPerformanceUpdate();
        } catch (e) {
          this._apiCalls.push({
            type: 'Fetch',
            method,
            url,
            duration,
            size: 0,
            status: response.status,
            timestamp: Date.now(),
            error: 'CORS or Read Error'
          });
          this.sendApiPerformanceUpdate();
        }

        return response;
      } catch (e) {
        console.warn('Error measuring fetch response:', e);
        throw e;
      }
    }.bind(this);

    // Also send periodic updates in case we miss any
    setInterval(() => {
      if (this._apiCalls.length > 0) {
        this.sendApiPerformanceUpdate();
      }
    }, 1000);
  }

  sendApiPerformanceUpdate() {
    try {
      chrome.runtime.sendMessage({
        type: 'api-performance-update',
        data: [...this._apiCalls] // Send a copy of the array
      });

      // Keep only the last 50 API calls to prevent memory issues
      this._apiCalls = this._apiCalls.slice(-50);
    } catch (e) {
      console.error('Error sending API performance data:', e);
    }
  }

  sendUpdates() {
    const snapshot = {
      fps: this.metrics.fps.slice(-1)[0] || { value: 0, timestamp: Date.now() },
      memory: this.metrics.memory.slice(-1)[0] || {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        timestamp: Date.now()
      },
      network: this.metrics.network.slice(-1)[0] || {
        requests: 0,
        transferred: 0,
        timestamp: Date.now()
      },
      cpu: this.metrics.cpu.slice(-1)[0] || {
        usage: 0,
        timestamp: Date.now()
      },
      dom: this.metrics.dom[this.metrics.dom.length - 1] || {
        elements: 0,
        nodes: 0,
        listeners: 0,
        timestamp: Date.now()
      },
      firstPaint: this.metrics.firstPaint.slice(-1)[0] || {
        fp: 0,
        fcp: 0,
        timestamp: Date.now()
      },
      pageLoad: this.metrics.pageLoad.slice(-1)[0] || {
        domLoadTime: 0,
        windowLoadTime: 0,
        timestamp: Date.now()
      },
      longTasks: this.metrics.longTasks.slice(-1)[0] || {
        duration: 0,
        timestamp: Date.now()
      },
      apiPerformance: this.metrics.apiPerformance.slice(-1)[0] || []
    };

    this.listeners.forEach(callback => callback(snapshot));
  }

  startFPSCounter() {
    let lastTime = performance.now();
    let frames = 0;

    const tick = () => {
      const now = performance.now();
      frames++;

      if (now >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (now - lastTime));
        this.metrics.fps.push({
          value: fps,
          timestamp: now
        });

        frames = 0;
        lastTime = now;
      }

      requestAnimationFrame(tick);
    };

    tick();
  }

  startMemoryMonitor() {
    if (!window.performance?.memory) return;

    const collect = () => {
      const mem = performance.memory;
      this.metrics.memory.push({
        usedJSHeapSize: mem.usedJSHeapSize / (1024 * 1024),
        totalJSHeapSize: mem.totalJSHeapSize / (1024 * 1024),
        jsHeapSizeLimit: mem.jsHeapSizeLimit / (1024 * 1024),
        timestamp: performance.now()
      });

      setTimeout(collect, 1000);
    };

    collect();
  }

  startNetworkMonitor() {
    let requests = 0;
    let transferred = 0;
    let apiCalls = [];

    // Monitor XMLHttpRequest
    const originalXHR = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function (...args) {
      const startTime = performance.now();
      const url = this._url;

      this.addEventListener('loadend', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        try {
          const size = parseInt(this.getResponseHeader('content-length')) || this.responseText?.length || 0;
          const status = this.status;
          apiCalls.push({
            url,
            duration,
            size,
            status,
            type: 'XHR',
            timestamp: Date.now()
          });
          transferred += size;
          requests++;
        } catch (e) {
          console.warn('Error measuring XHR response:', e);
        }
      });

      return originalXHR.apply(this, args);
    };

    // Monitor Fetch API
    const originalFetch = window.fetch;
    window.fetch = async function (resource, options) {
      const startTime = performance.now();
      const url = typeof resource === 'string' ? resource : resource.url;

      try {
        const response = await originalFetch.apply(this, arguments);
        const endTime = performance.now();
        const duration = endTime - startTime;
        const clone = response.clone();

        // Process response asynchronously
        clone.arrayBuffer().then(buffer => {
          apiCalls.push({
            url,
            duration,
            size: buffer.byteLength,
            status: response.status,
            type: 'Fetch',
            timestamp: Date.now()
          });
          transferred += buffer.byteLength;
          requests++;
        });

        return response;
      } catch (e) {
        console.warn('Error measuring fetch response:', e);
        throw e;
      }
    };

    // Record metrics every second
    setInterval(() => {
      if (apiCalls.length > 0) {
        this.metrics.apiPerformance = apiCalls;
        this.metrics.network.push({
          requests,
          transferred,
          timestamp: performance.now()
        });

        console.log('API Performance collected:', apiCalls);
        console.log('Network metrics:', { requests, transferred });
      }

      // Reset counters
      requests = 0;
      transferred = 0;
      apiCalls = [];
    }, 1000);
  }

  startCPUMonitor() {
    // Simulate CPU usage (in a real extension, you'd use chrome.system.cpu)
    setInterval(() => {
      this.metrics.cpu.push({
        usage: Math.random() * 30 + 5, // 5-35%
        timestamp: performance.now()
      });
    }, 1000);
  }

  startDOMMonitor() {
    setInterval(() => {
      const metrics = {
        elements: document.querySelectorAll('*').length,
        nodes: document.getElementsByTagName('*').length,
        listeners: this.countEventListeners(),
        timestamp: performance.now()
      };

      this.metrics.dom.push(metrics);
      console.log('DOM Metrics:', metrics); // Debug log
    }, 1000);
  }

  countEventListeners() {
    let count = 0;
    const walker = document.createTreeWalker(
      document.documentElement,
      NodeFilter.SHOW_ELEMENT
    );

    while (walker.nextNode()) {
      const element = walker.currentNode;
      // Count standard event properties
      const events = getEventListeners ? getEventListeners(element) : {};
      count += Object.keys(events).reduce((acc, key) => acc + events[key].length, 0);
    }

    return count;
  }

  startFirstPaintMonitor() {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-paint') {
            this.metrics.firstPaint.push({
              fp: entry.startTime,
              fcp: 0,
              timestamp: Date.now()
            });
            console.log('First Paint collected:', entry.startTime);
          }
          if (entry.name === 'first-contentful-paint') {
            const lastEntry = this.metrics.firstPaint[this.metrics.firstPaint.length - 1];
            if (lastEntry) {
              lastEntry.fcp = entry.startTime;
              console.log('First Contentful Paint collected:', entry.startTime);
            }
          }
        });
      });
      observer.observe({ entryTypes: ['paint'] });
    } catch (e) {
      console.error('Error in startFirstPaintMonitor:', e);
    }
  }

  startPageLoadMonitor() {
    try {
      window.addEventListener('DOMContentLoaded', (event) => {
        const domLoadTime = performance.now();
        this.metrics.pageLoad.push({
          domLoadTime,
          windowLoadTime: 0,
          timestamp: Date.now()
        });
        console.log('DOM Load Time collected:', domLoadTime);
      });

      window.addEventListener('load', (event) => {
        const windowLoadTime = performance.now();
        const lastEntry = this.metrics.pageLoad[this.metrics.pageLoad.length - 1];
        if (lastEntry) {
          lastEntry.windowLoadTime = windowLoadTime;
          console.log('Window Load Time collected:', windowLoadTime);
        }
      });
    } catch (e) {
      console.error('Error in startPageLoadMonitor:', e);
    }
  }

  startLongTasksMonitor() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          const taskDetails = {
            duration: entry.duration,
            startTime: entry.startTime,
            name: 'Unknown Task',
            timestamp: Date.now()
          };

          // Extract task name from attribution
          if (entry.attribution && entry.attribution.length > 0) {
            const attribution = entry.attribution[0];
            if (attribution.containerType) {
              taskDetails.name = `${attribution.containerType}${attribution.containerName ? ': ' + attribution.containerName : ''}`;
            } else if (attribution.name) {
              taskDetails.name = attribution.name;
            }
          }

          this.metrics.longTasks.push(taskDetails);
          console.log('Long Task collected:', taskDetails);
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      console.error('Error in startLongTasksMonitor:', e);
    }
  }
}