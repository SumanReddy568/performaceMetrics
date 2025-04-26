class PerformanceCollector {
    constructor() {
      this.performanceData = {
        fps: [],
        memory: [],
        network: [],
        cpu: [],
        dom: [],
        layoutShifts: [],
        resourceTiming: []
      };
      this.init();
    }
  
    init() {
      this.collectFPS();
      this.collectMemory();
      this.collectNetwork();
      this.collectCPU();
      this.collectDOM();
      this.collectLayoutShifts();
      this.collectResourceTiming();

      setInterval(() => {
        const currentData = {
          fps: {
            value: this.performanceData.fps[this.performanceData.fps.length - 1]?.value || 0,
            timestamp: Date.now()
          },
          memory: {
            usedJSHeapSize: this.performanceData.memory[this.performanceData.memory.length - 1]?.usedJSHeapSize || 0,
            totalJSHeapSize: this.performanceData.memory[this.performanceData.memory.length - 1]?.totalJSHeapSize || 0,
            timestamp: Date.now()
          },
          network: {
            requests: this.performanceData.network[this.performanceData.network.length - 1]?.requests || 0,
            transferred: this.performanceData.network[this.performanceData.network.length - 1]?.transferred || 0,
            timestamp: Date.now()
          },
          cpu: {
            usage: this.performanceData.cpu[this.performanceData.cpu.length - 1]?.usage || 0,
            timestamp: Date.now()
          },
          dom: {
            elements: this.performanceData.dom[this.performanceData.dom.length - 1]?.elements || 0,
            nodes: this.performanceData.dom[this.performanceData.dom.length - 1]?.nodes || 0,
            listeners: this.performanceData.dom[this.performanceData.dom.length - 1]?.listeners || 0,
            timestamp: Date.now()
          },
          layoutShifts: {
            cumulativeLayoutShift: this.performanceData.layoutShifts[this.performanceData.layoutShifts.length - 1]?.value || 0,
            timestamp: Date.now()
          },
          resourceTiming: {
            resourceCount: this.performanceData.resourceTiming[this.performanceData.resourceTiming.length - 1]?.resourceCount || 0,
            transferSize: this.performanceData.resourceTiming[this.performanceData.resourceTiming.length - 1]?.transferSize || 0,
            timestamp: Date.now()
          }
        };
  
        chrome.runtime.sendMessage({
          type: 'metrics-update',
          data: currentData
        });
  
      }, 1000);
    }
  
    collectFPS() {
      let lastTime = performance.now();
      let frames = 0;
  
      const measure = () => {
        const now = performance.now();
        frames++;
  
        if (now >= lastTime + 1000) {
          const fps = Math.round((frames * 1000) / (now - lastTime));
          this.performanceData.fps.push({
            value: fps,
            timestamp: now
          });
          frames = 0;
          lastTime = now;
        }
  
        requestAnimationFrame(measure);
      };
  
      measure();
    }
  
    collectMemory() {
      if (!performance.memory) return;
  
      setInterval(() => {
        try {
          const memory = performance.memory;
          this.performanceData.memory.push({
            usedJSHeapSize: memory.usedJSHeapSize / (1024 * 1024),
            totalJSHeapSize: memory.totalJSHeapSize / (1024 * 1024),
            jsHeapSizeLimit: memory.jsHeapSizeLimit / (1024 * 1024),
            timestamp: performance.now()
          });
        } catch (e) {
          console.error("Error collecting memory metrics:", e);
        }
      }, 1000);
    }
  
    collectNetwork() {
      let requests = 0;
      let transferred = 0;
  
      // Monitor fetch requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        requests++;
        const start = performance.now();
        try {
          const response = await originalFetch(...args);
          const size = response.headers.get('content-length') || 0;
          transferred += parseInt(size) || 0;
          return response;
        } catch (e) {
          console.error("Error during fetch:", e);
          return Promise.reject(e);
        }
      };
  
      // Monitor XHR requests
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
  
      XMLHttpRequest.prototype.open = function (...args) {
        this._startTime = performance.now();
        return originalOpen.apply(this, args);
      };
  
      XMLHttpRequest.prototype.send = function (...args) {
        requests++;
        this.addEventListener('load', () => {
          try {
            const size = this.getResponseHeader('content-length') || 0;
            transferred += parseInt(size) || 0;
          } catch (e) {
            console.error("Error getting XHR response header:", e);
          }
        });
        return originalSend.apply(this, args);
      };
  
      // Record metrics
      setInterval(() => {
        this.performanceData.network.push({
          requests,
          transferred,
          timestamp: performance.now()
        });
        console.log(this.performanceData.network); // ADD THIS LINE
        requests = 0;
        transferred = 0;
      }, 1000);
    }
  
    collectCPU() {
      // Simulate CPU usage (in a real extension, you'd use chrome.system.cpu)
      setInterval(() => {
        try {
          this.performanceData.cpu.push({
            usage: Math.random() * 30 + 5, // Simulated CPU usage between 5-35%
            timestamp: performance.now()
          });
        } catch (e) {
          console.error("Error collecting CPU metrics:", e);
        }
      }, 1000);
    }
  
    collectDOM() {
      setInterval(() => {
        try {
          const elements = document.querySelectorAll('*').length;
          const nodes = document.getElementsByTagName('*').length;
          const listeners = this.countEventListeners();
  
          this.performanceData.dom.push({
            elements,
            nodes,
            listeners,
            timestamp: performance.now()
          });
          console.log('DOM Metrics:', { elements, nodes, listeners }); // Debug log
        } catch (e) {
          console.error("Error collecting DOM metrics:", e);
        }
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
        try {
          if (typeof getEventListeners === 'function') {
            const events = getEventListeners(element);
            count += Object.keys(events).reduce((acc, key) => acc + events[key].length, 0);
          } else {
            console.warn("getEventListeners is not a function");
            return 0;
          }
        } catch (e) {
          console.warn("Error getting event listeners:", e);
        }
      }
      return count;
    }

    collectLayoutShifts() {
      let observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.performanceData.layoutShifts.push({
            value: entry.value,
            timestamp: performance.now()
          });
        }
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    }

    collectResourceTiming() {
      let observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const resourceCount = entries.length;
        const transferSize = entries.reduce((total, entry) => total + (entry.transferSize || 0), 0);
        
        this.performanceData.resourceTiming.push({
          resourceCount,
          transferSize,
          timestamp: performance.now()
        });
      });
      observer.observe({ entryTypes: ['resource'] });
    }
  }
  
  // Initialize immediately
  new PerformanceCollector();