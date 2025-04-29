class PerformanceCollector {
    constructor() {
        this.performanceData = {
            fps: [],
            memory: [],
            network: [],
            cpu: [],
            dom: [],
            layoutShifts: [],
            resourceTiming: [],
            firstPaint: [],
            pageLoad: [],
            longTasks: [],
            apiPerformance: []
        };
        this.isActive = true; // Add a flag to track if the collector is active
        this._trackedListeners = new WeakMap(); // Add tracker for event listeners
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
        this.collectFirstPaint();
        this.collectPageLoad();
        this.collectLongTasks();
        this.collectApiPerformance();

        setInterval(() => {
            if (!this.isActive) return; // Stop sending data if the collector is inactive

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
                },
                firstPaint: this.performanceData.firstPaint[this.performanceData.firstPaint.length - 1] || {
                    fp: 0,
                    fcp: 0,
                    timestamp: Date.now()
                },
                pageLoad: this.performanceData.pageLoad[this.performanceData.pageLoad.length - 1] || {
                    domLoadTime: 0,
                    windowLoadTime: 0,
                    timestamp: Date.now()
                },
                longTasks: this.performanceData.longTasks[this.performanceData.longTasks.length - 1] || {
                    duration: 0,
                    timestamp: Date.now()
                },
                apiPerformance: this.performanceData.apiPerformance || [] // Change this line
            };

            try {
                chrome.runtime.sendMessage({
                    type: 'metrics-update',
                    data: currentData
                });
            } catch (e) {
                console.error('Error sending message to extension:', e);
                this.isActive = false; // Deactivate the collector if the context is invalidated
            }
        }, 1000);

        // Listen for messages from the background script
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'deactivate') {
                this.isActive = false; // Deactivate the collector
                console.log('PerformanceCollector deactivated');
            }
        });

        // Detect page navigation and deactivate the collector
        window.addEventListener('beforeunload', () => {
            this.isActive = false;
        });
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
            } catch (e) {
                console.error("Error collecting DOM metrics:", e);
            }
        }, 1000);
    }

    countEventListeners() {
        // Return an estimated count based on common event types
        const commonEvents = [
            'click', 'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout', 'mouseenter', 'mouseleave',
            'keydown', 'keyup', 'keypress', 'submit', 'change', 'focus', 'blur', 'scroll', 'resize',
            'touchstart', 'touchend', 'touchmove'
        ];
        
        let count = 0;
        const elements = document.getElementsByTagName('*');
        
        for (const element of elements) {
            // Count inline event handlers
            for (const event of commonEvents) {
                if (element[`on${event}`]) {
                    count++;
                }
            }
            
            // Count jQuery events if jQuery is present
            if (window.jQuery && jQuery._data) {
                const events = jQuery._data(element, 'events');
                if (events) {
                    count += Object.values(events).reduce((acc, val) => acc + val.length, 0);
                }
            }
            
            // Count tracked listeners
            const tracked = this._trackedListeners.get(element);
            if (tracked) {
                count += tracked.size;
            }
        }
        
        return count;
    }

    // Add method to track new event listeners
    monitorEventListeners() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;
        const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
        const self = this;

        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (!self._trackedListeners.has(this)) {
                self._trackedListeners.set(this, new Set());
            }
            self._trackedListeners.get(this).add(type);
            return originalAddEventListener.call(this, type, listener, options);
        };

        EventTarget.prototype.removeEventListener = function(type, listener, options) {
            if (self._trackedListeners.has(this)) {
                self._trackedListeners.get(this).delete(type);
            }
            return originalRemoveEventListener.call(this, type, listener, options);
        };
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

    collectFirstPaint() { // ADD THIS FUNCTION
        try { // ADD THIS LINE
            const observer = new PerformanceObserver((list) => { // ADD THIS LINE
                const entries = list.getEntries(); // ADD THIS LINE
                entries.forEach(entry => { // ADD THIS LINE
                    if (entry.name === 'first-paint') { // ADD THIS LINE
                        this.performanceData.firstPaint.push({ // ADD THIS LINE
                            fp: entry.startTime, // ADD THIS LINE
                            fcp: 0, // ADD THIS LINE
                            timestamp: Date.now() // ADD THIS LINE
                        }); // ADD THIS LINE
                        console.log('First Paint collected:', entry.startTime); // ADD THIS LINE
                    } // ADD THIS LINE
                    if (entry.name === 'first-contentful-paint') { // ADD THIS LINE
                        const lastEntry = this.performanceData.firstPaint[this.performanceData.firstPaint.length - 1]; // ADD THIS LINE
                        if (lastEntry) { // ADD THIS LINE
                            lastEntry.fcp = entry.startTime; // ADD THIS LINE
                            console.log('First Contentful Paint collected:', entry.startTime); // ADD THIS LINE
                        } // ADD THIS LINE
                    } // ADD THIS LINE
                }); // ADD THIS LINE
            }); // ADD THIS LINE
            observer.observe({ entryTypes: ['paint'] }); // ADD THIS LINE
        } catch (e) { // ADD THIS LINE
            console.error('Error in collectFirstPaint:', e); // ADD THIS LINE
        } // ADD THIS LINE
    } // ADD THIS LINE

    collectPageLoad() { // ADD THIS FUNCTION
        try { // ADD THIS LINE
            window.addEventListener('DOMContentLoaded', (event) => { // ADD THIS LINE
                const domLoadTime = performance.now(); // ADD THIS LINE
                this.performanceData.pageLoad.push({ // ADD THIS LINE
                    domLoadTime, // ADD THIS LINE
                    windowLoadTime: 0, // ADD THIS LINE
                    timestamp: Date.now() // ADD THIS LINE
                }); // ADD THIS LINE
                console.log('DOM Load Time collected:', domLoadTime); // ADD THIS LINE
            }); // ADD THIS LINE

            window.addEventListener('load', (event) => { // ADD THIS LINE
                const windowLoadTime = performance.now(); // ADD THIS LINE
                const lastEntry = this.performanceData.pageLoad[this.performanceData.pageLoad.length - 1]; // ADD THIS LINE
                if (lastEntry) { // ADD THIS LINE
                    lastEntry.windowLoadTime = windowLoadTime; // ADD THIS LINE
                    console.log('Window Load Time collected:', windowLoadTime); // ADD THIS LINE
                } // ADD THIS LINE
            }); // ADD THIS LINE
        } catch (e) { // ADD THIS LINE
            console.error('Error in collectPageLoad:', e); // ADD THIS LINE
        } // ADD THIS LINE
    } // ADD THIS LINE

    collectLongTasks() {
        try {
            const observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    const taskDetails = {
                        duration: entry.duration,
                        startTime: entry.startTime,
                        timestamp: Date.now()
                    };

                    // Extract meaningful task name
                    if (entry.attribution && entry.attribution.length > 0) {
                        const attr = entry.attribution[0];
                        const details = [];

                        if (attr.containerType) details.push(attr.containerType);
                        if (attr.containerName) details.push(attr.containerName);
                        if (attr.containerId) details.push(`id:${attr.containerId}`);
                        if (attr.name && attr.name !== 'unknown') details.push(attr.name);
                        
                        // Include script source if available
                        if (attr.scriptName) {
                            const scriptParts = attr.scriptName.split('/');
                            details.push(scriptParts[scriptParts.length - 1]); // Get just the filename
                        }

                        taskDetails.name = details.length > 0 
                            ? details.join(' - ')
                            : `Task (${Math.round(entry.duration)}ms)`;
                    } else {
                        taskDetails.name = `Long Task (${Math.round(entry.duration)}ms)`;
                    }

                    this.performanceData.longTasks.push(taskDetails);
                    console.log('Long Task collected:', taskDetails);
                });
            });
            observer.observe({ entryTypes: ['longtask'] });
        } catch (e) {
            console.error('Error in collectLongTasks:', e);
        }
    }

    collectApiPerformance() {
        let apiCalls = [];

        // Monitor XMLHttpRequest
        const originalXHR = window.XMLHttpRequest.prototype.send;
        window.XMLHttpRequest.prototype.send = function (...args) {
            const startTime = performance.now();
            const method = this._method || 'GET';
            const url = this._url || 'Unknown URL';

            this.addEventListener('loadend', () => {
                const duration = performance.now() - startTime;
                try {
                    const size = parseInt(this.getResponseHeader('content-length')) || this.responseText?.length || 0;
                    const status = this.status;
                    apiCalls.push({
                        type: 'XHR',
                        method,
                        url,
                        duration,
                        size,
                        status,
                        timestamp: Date.now()
                    });
                } catch (e) {
                    console.warn('Error measuring XHR response:', e);
                }
            });

            return originalXHR.apply(this, args);
        };

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
                
                // Clone response to avoid consuming it
                const clone = response.clone();
                const size = parseInt(clone.headers.get('content-length')) || 0;
                
                apiCalls.push({
                    type: 'Fetch',
                    method,
                    url,
                    duration,
                    size,
                    status: response.status,
                    timestamp: Date.now()
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
                // Keep only the last 50 API calls
                this.performanceData.apiPerformance = apiCalls.slice(-50);
                console.log('API Performance collected:', this.performanceData.apiPerformance);
                
                // Reset the array but keep the reference
                apiCalls.length = 0;
            }
        }, 1000);
    }
}

// Initialize immediately
try {
    new PerformanceCollector();
} catch (e) {
    console.error('Error initializing PerformanceCollector:', e);
}