class PerformanceCollector {
  constructor() {
    this.metrics = {
      fps: [],
      memory: [],
      network: [],
      cpu: [],
      dom: []
    };
    this.listeners = [];
    this.init();
  }

  init() {
    this.startFPSCounter();
    this.startMemoryMonitor();
    this.startNetworkMonitor();
    this.startCPUMonitor();
    this.startDOMMonitor();

    // Send updates every second
    setInterval(() => this.sendUpdates(), 1000);
  }

  addListener(callback) {
    this.listeners.push(callback);
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
      }
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

    // Monitor XMLHttpRequest
    const originalXHR = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.send = function(...args) {
      requests++;
      this.addEventListener('loadend', () => {
        try {
          const size = this.getResponseHeader('content-length');
          if (size) {
            transferred += parseInt(size);
          } else if (this.responseText) {
            transferred += this.responseText.length;
          }
        } catch (e) {
          console.warn('Error measuring response size:', e);
        }
      });
      return originalXHR.apply(this, args);
    };

    // Monitor Fetch API
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      requests++;
      try {
        const response = await originalFetch.apply(this, args);
        const clone = response.clone();
        const buffer = await clone.arrayBuffer();
        transferred += buffer.byteLength;
        return response;
      } catch (e) {
        console.warn('Error measuring fetch response size:', e);
        throw e;
      }
    };

    // Record metrics every second
    setInterval(() => {
      this.metrics.network.push({
        requests,
        transferred,
        timestamp: performance.now()
      });
      
      // Reset counters after recording
      requests = 0;
      transferred = 0;
      
      this.sendUpdates();
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
}