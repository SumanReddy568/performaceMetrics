class PerformanceMetricsChatBot {
  constructor(metricsProvider) {
    console.log("Initializing PerformanceMetricsChatBot..."); // Debug log

    // Ensure metricsProvider is defined
    if (!metricsProvider) {
      throw new Error("metricsProvider is required to initialize PerformanceMetricsChatBot.");
    }

    this.metricsProvider = metricsProvider;

    // Bind methods to ensure proper 'this' context
    this.getCpuUsage = this.getCpuUsage.bind(this);
    this.getMemoryUsage = this.getMemoryUsage.bind(this);
    this.getFpsMetrics = this.getFpsMetrics.bind(this);
    this.getNetworkMetrics = this.getNetworkMetrics.bind(this);
    this.getWebVitals = this.getWebVitals.bind(this);
    this.getDomMetrics = this.getDomMetrics.bind(this);
    this.getJsHeapMetrics = this.getJsHeapMetrics.bind(this);
    this.getLayoutShifts = this.getLayoutShifts.bind(this);
    this.getPageLoad = this.getPageLoad.bind(this);
    this.getLongTasks = this.getLongTasks.bind(this);
    this.getUserInteractions = this.getUserInteractions.bind(this);
    this.getStorageInfo = this.getStorageInfo.bind(this);
    this.getResourceTiming = this.getResourceTiming.bind(this);
    this.getPaintTiming = this.getPaintTiming.bind(this);
    this.getPerformanceMarks = this.getPerformanceMarks.bind(this);
    this.getCacheInfo = this.getCacheInfo.bind(this);
    this.getResourceDetails = this.getResourceDetails.bind(this);

    this.questionPatterns = [
      {
        regex: /cpu|processor|processing|show.*cpu/i,
        handler: this.getCpuUsage
      },
      {
        regex: /memory|ram|heap|allocated|show.*memory|memory consumption/i,
        handler: this.getMemoryUsage
      },
      {
        regex: /fps|frame|show.*fps|frames per second|animation/i,
        handler: this.getFpsMetrics
      },
      {
        regex: /network|show.*network|requests|traffic|bandwidth|data transfer/i,
        handler: this.getNetworkMetrics
      },
      {
        regex: /vitals|show.*vitals|show.*web vitals|core vitals|performance score/i,
        handler: this.getWebVitals
      },
      {
        regex: /dom|show.*dom|elements|nodes|document/i,
        handler: this.getDomMetrics
      },
      {
        regex: /heap|show.*heap|javascript memory|heap size/i,
        handler: this.getJsHeapMetrics
      },
      {
        regex: /layout|show.*layout|cls|visual stability/i,
        handler: this.getLayoutShifts
      },
      {
        regex: /resource|timing|resources loaded|resource timing/i,
        handler: this.getResourceTiming
      },
      {
        regex: /paint|first paint|fcp|loading visual|paint timing/i,
        handler: this.getPaintTiming
      },
      {
        regex: /page load|show.*page|loading time|dom load/i,
        handler: this.getPageLoad
      },
      {
        regex: /interactions|user actions|clicks|scrolls|user interactions/i,
        handler: this.getUserInteractions
      },
      {
        regex: /marks|performance marks|timing marks/i,
        handler: this.getPerformanceMarks
      },
      {
        regex: /cache|cached|browser cache/i,
        handler: this.getCacheInfo
      }
    ];

    // Define follow-up questions for each metric type
    this.followUpQuestions = {
      cpu: [
        "Compare with last hour",
        "Is this CPU usage normal?",
        "What's causing high CPU?"
      ],
      memory: [
        "Check for memory leaks",
        "Show memory timeline",
        "What's using most memory?"
      ],
      network: [
        "Show failed requests",
        "Bandwidth usage trend",
        "Largest transfers"
      ],
      webVitals: [
        "Compare to industry standards",
        "How to improve these metrics?",
        "Show detailed breakdown"
      ],
      resourceTiming: [
        "Show slowest resources",
        "Check resource load times",
        "Which resources are cached?"
      ],
      paintTiming: [
        "Compare paint metrics",
        "Show paint timeline",
        "First paint analysis"
      ],
      userInteractions: [
        "Show interaction delays",
        "Most common interactions",
        "Interaction patterns"
      ],
      performanceMarks: [
        "Show all marks",
        "Custom mark analysis",
        "Timing breakdown"
      ],
      cache: [
        "Cache hit ratio",
        "Cache size details",
        "Cached resources"
      ]
    };

    // Define one default question for each panel
    this.defaultQuestions = [
      "What's my current FPS?",               // fpsPanel
      "Show memory consumption",              // memoryPanel
      "Show network statistics",              // networkPanel
      "What's the CPU usage?",               // cpuPanel
      "How many DOM elements?",              // domPanel
      "Show JS heap usage",                  // jsHeapPanel
      "Any layout shifts detected?",          // layoutShiftsPanel
      "Show resource timing",                 // resourceTimingPanel
      "When was first paint?",               // firstPaintPanel
      "Show page load times",                // pageLoadPanel
      "Any long tasks detected?",            // longTasksPanel
      "Show user interactions",              // userInteractionPanel
      "Show web vitals metrics",             // webVitalsPanel
      "Show performance metrics",            // performanceMetricsPanel
      "Show storage usage",                  // storagePanel
      "Show cache usage",                    // cacheUsagePanel
      "Any page errors?",                    // pageErrorsPanel
      "Show server timing",                  // serverTimingPanel
      "Check websocket status",              // websocketPanel
      "Show API performance"                 // apiPerformancePanel
    ];
    
    // Track help panel state
    this.helpPanelOpen = false;

    // Update default response to be empty
    this.getDefaultResponse = () => ({
      type: 'default',
      message: "Click the help button to see available options.",
    });
    
    // Create a response for when help is clicked
    this.getHelpResponse = () => ({
      type: 'suggestions',
      message: "I can help you monitor these metrics. Choose a category:",
      suggestions: this.defaultQuestions,
      isHelp: true
    });

    // Initialize typing indicator state
    this.isTyping = false;

    console.log("PerformanceMetricsChatBot initialized."); // Debug log
  }

  /**
   * Handle help button click to show available questions
   * @returns {Object} Help response with suggestion questions
   */
  handleHelpClick() {
    this.helpPanelOpen = true;
    return this.getHelpResponse();
  }
  
  /**
   * Handle question selection to close help panel
   */
  handleQuestionSelected() {
    this.helpPanelOpen = false;
    return {
      type: 'helpClosed',
      status: true
    };
  }

  /**
   * Shows typing indicator to indicate the bot is processing a response
   * @returns {Object} Typing indicator state object
   */
  showTypingIndicator() {
    this.isTyping = true;
    return {
      type: 'typing',
      status: true
    };
  }

  /**
   * Hides the typing indicator when response is ready
   * @returns {Object} Typing indicator state object
   */
  hideTypingIndicator() {
    this.isTyping = false;
    return {
      type: 'typing',
      status: false
    };
  }

  async processQuestion(question) {
    console.log("Processing question:", question);

    // Show typing indicator immediately
    this.showTypingIndicator();
    
    try {
      // Ensure question is a string
      if (typeof question !== 'string') {
        this.hideTypingIndicator();
        return "Invalid question format. Please provide a valid string.";
      }

      if (!question.trim()) {
        this.hideTypingIndicator();
        // Don't show suggestions by default anymore
        return this.getDefaultResponse();
      }

      // Mark that a question was selected - close help panel if open
      if (this.helpPanelOpen) {
        this.handleQuestionSelected();
      }

      if (!this.metricsProvider || !this.metricsProvider.getSnapshot) {
        this.hideTypingIndicator();
        return "I'm still collecting metrics data. Please try again in a few seconds.";
      }

      const normalizedQuestion = question.toLowerCase().trim();

      // Try to match question with regex patterns
      for (const pattern of this.questionPatterns) {
        if (pattern.regex.test(normalizedQuestion)) {
          try {
            // Add slight delay to make typing indicator visible (optional)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const response = await pattern.handler();
            this.hideTypingIndicator();
            
            // Handle case where handler didn't return a response
            if (!response) {
              return {
                type: 'message',
                message: "I don't have enough data to answer that question right now."
              };
            }
            
            return response;
          } catch (error) {
            console.error("Error processing pattern match:", error);
            continue;
          }
        }
      }

      // No matches found, provide default response
      this.hideTypingIndicator();
      // Return a simple message rather than suggestions
      return {
        type: 'message',
        message: "I'm not sure how to answer that. Click the help button to see what I can help with."
      };
    } catch (error) {
      console.error("Error in processQuestion:", error);
      this.hideTypingIndicator();
      return {
        type: 'message',
        message: "Sorry, I encountered an error while processing your question."
      };
    }
  }

  getCpuUsage() {
    try {
      const snapshot = this.metricsProvider.getSnapshot();
      console.log("CPU Snapshot:", snapshot); // Debug log

      if (!snapshot || !snapshot.cpu) {
        return "CPU usage data is not available yet. Still collecting data...";
      }

      // Get current CPU data
      const currentUsage = snapshot.cpu.usage || 0;

      // Get historical CPU data
      const historicalData = this.metricsProvider.getHistoricalData('cpu');
      console.log("Historical CPU data:", historicalData); // Debug log

      if (!historicalData || historicalData.length === 0) {
        return `Current CPU usage: ${currentUsage.toFixed(1)}%\nNot enough historical data yet for average.`;
      }

      // Calculate average from historical data
      const sum = historicalData.reduce((acc, item) => acc + (item.value || 0), 0);
      const average = sum / historicalData.length;

      return {
        type: 'metrics',
        metricType: 'cpu',
        message: `CPU Metrics:\n` +
                `• Current Usage: ${currentUsage.toFixed(1)}%\n` +
                `• Average Usage: ${average.toFixed(1)}%\n` +
                `• Samples: ${historicalData.length}`,
        data: {
          current: currentUsage,
          average: average,
          samples: historicalData.length,
          history: historicalData
        }
      };
    } catch (error) {
      console.error("Error getting CPU usage:", error);
      return "Sorry, there was an error retrieving CPU metrics.";
    }
  }

  getMemoryUsage() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.memory) {
      return "Memory usage data is not available.";
    }

    const used = snapshot.memory.usedJSHeapSize || 0;
    const total = snapshot.memory.totalJSHeapSize || 0;

    return {
      type: 'metrics',
      metricType: 'memory',
      message: `Memory usage: ${used.toFixed(1)} MB used out of ${total.toFixed(1)} MB.`,
      data: {
        used: used,
        total: total
      }
    };
  }

  getFpsMetrics() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.fps) {
      return "FPS data is not available.";
    }

    const currentFps = snapshot.fps.value || 0;
    const avgFps = this.metricsProvider.getAverageValue("fps", "value") || 0;

    return {
      type: 'metrics',
      metricType: 'fps',
      message: `Current FPS: ${currentFps.toFixed(1)}\nAverage FPS: ${avgFps.toFixed(1)}`,
      data: {
        current: currentFps,
        average: avgFps
      }
    };
  }

  getNetworkMetrics() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.network) {
      return "Network data is not available.";
    }

    const requests = snapshot.network.requests || 0;
    const transferred = snapshot.network.transferred || 0;
    const avgRequests = this.metricsProvider.getAverageValue("network", "requests") || 0;

    return {
      type: 'metrics',
      metricType: 'network',
      message: `Active Requests: ${requests}\nData Transferred: ${(transferred/1024).toFixed(2)} KB\nAvg Requests/min: ${avgRequests.toFixed(1)}`,
      data: {
        requests: requests,
        transferred: transferred,
        averageRequests: avgRequests
      }
    };
  }

  getWebVitals() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.webVitals) {
      return "Web Vitals data is not available.";
    }

    const { lcp, fid, cls } = snapshot.webVitals;
    return {
      type: 'metrics',
      metricType: 'webVitals',
      message: `Web Vitals:\n- LCP: ${lcp}ms\n- FID: ${fid}ms\n- CLS: ${cls}`,
      data: snapshot.webVitals
    };
  }

  getDomMetrics() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.dom) {
      return "DOM metrics are not available.";
    }

    return {
      type: 'metrics',
      metricType: 'dom',
      message: `DOM Metrics:\n` +
              `• Total Elements: ${snapshot.dom.elements}\n` +
              `• Total Nodes: ${snapshot.dom.nodes}\n` +
              `• Event Listeners: ${snapshot.dom.listeners}`,
      data: snapshot.dom
    };
  }

  getJsHeapMetrics() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.memory) {
      return "JS Heap metrics are not available.";
    }

    const used = (snapshot.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
    const total = (snapshot.memory.totalJSHeapSize / 1024 / 1024).toFixed(1);
    const limit = (snapshot.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(1);

    return {
      type: 'metrics',
      metricType: 'jsHeap',
      message: `JS Heap Usage:\n` +
              `• Used: ${used} MB\n` +
              `• Total: ${total} MB\n` +
              `• Limit: ${limit} MB`,
      data: {
        used: parseFloat(used),
        total: parseFloat(total),
        limit: parseFloat(limit)
      }
    };
  }

  getLayoutShifts() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.layoutShifts) {
      return "Layout shifts data is not available.";
    }

    return {
      type: 'metrics',
      metricType: 'layoutShifts',
      message: `Layout Stability:\n` +
              `• CLS Score: ${snapshot.layoutShifts.cumulativeLayoutShift}\n` +
              `• Recent Shifts: ${snapshot.layoutShifts.recentShifts || 0}`,
      data: snapshot.layoutShifts
    };
  }

  getPageLoad() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.pageLoad) {
      return "Page load metrics are not available.";
    }

    return {
      type: 'metrics',
      metricType: 'pageLoad',
      message: `Page Load Times:\n` +
              `• DOM Load: ${snapshot.pageLoad.domLoadTime}ms\n` +
              `• Window Load: ${snapshot.pageLoad.windowLoadTime}ms`,
      data: snapshot.pageLoad
    };
  }

  getLongTasks() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.longTasks) {
      return "Long tasks data is not available.";
    }

    return {
      type: 'metrics',
      metricType: 'longTasks',
      message: `Long Tasks:\n` +
              `• Count: ${snapshot.longTasks.count}\n` +
              `• Average Duration: ${snapshot.longTasks.avgDuration}ms\n` +
              `• Total Blocking Time: ${snapshot.longTasks.totalBlockingTime}ms`,
      data: snapshot.longTasks
    };
  }

  getUserInteractions() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.userInteraction) {
      return "User interaction data is not available.";
    }

    return {
      type: 'metrics',
      metricType: 'userInteractions',
      message: `User Interactions:\n` +
              `• Clicks: ${snapshot.userInteraction.clicks}\n` +
              `• Scrolls: ${snapshot.userInteraction.scrolls}\n` +
              `• Keypresses: ${snapshot.userInteraction.keypresses}`,
      data: snapshot.userInteraction
    };
  }

  getStorageInfo() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.storage) {
      return "Storage metrics are not available.";
    }

    return {
      type: 'metrics',
      metricType: 'storage',
      message: `Storage Usage:\n` +
              `• LocalStorage: ${(snapshot.storage.localStorage / 1024).toFixed(2)} KB\n` +
              `• SessionStorage: ${(snapshot.storage.sessionStorage / 1024).toFixed(2)} KB\n` +
              `• IndexedDB: ${(snapshot.storage.indexedDB / 1024 / 1024).toFixed(2)} MB`,
      data: snapshot.storage
    };
  }

  getResourceTiming() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.resourceTiming) {
      return "Resource timing data is not available.";
    }

    const resources = snapshot.resourceTiming.resources || [];
    const count = resources.length || 0;
    
    // If no resources are loaded yet
    if (count === 0) {
      return {
        type: 'metrics',
        metricType: 'resourceTiming',
        message: "No resources have been loaded yet.",
        data: {
          count: 0,
          resources: []
        }
      };
    }

    // Calculate metrics from available resources
    const loadTimes = resources.map(r => r.duration || 0);
    const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / count;
    
    // Sort resources by duration to find slowest
    const sortedResources = [...resources].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    const slowestResource = sortedResources[0];
    
    // Get cached resources
    const cachedResources = resources.filter(r => r.transferSize === 0 || r.fromCache);
    const cachedCount = cachedResources.length;

    return {
      type: 'metrics',
      metricType: 'resourceTiming',
      message: `Resource Timing:\n` +
              `• Total Resources: ${count}\n` +
              `• Average Load Time: ${averageLoadTime.toFixed(2)}ms\n` +
              `• Slowest Resource: ${slowestResource ? slowestResource.name : 'None'} (${slowestResource ? slowestResource.duration.toFixed(2) : 0}ms)\n` +
              `• Cached Resources: ${cachedCount} of ${count}`,
      data: {
        count,
        averageLoadTime,
        slowestResource,
        cachedCount,
        resources: sortedResources.map(r => ({
          name: r.name || 'Unknown',
          duration: r.duration || 0,
          size: r.transferSize || 0,
          cached: r.transferSize === 0 || r.fromCache
        }))
      }
    };
  }

  getResourceDetails(resourceType) {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.resourceTiming || !snapshot.resourceTiming.resources) {
      return "Resource details are not available.";
    }

    const resources = snapshot.resourceTiming.resources;
    let filteredResources = resources;

    // Filter resources based on type if specified
    if (resourceType) {
      filteredResources = resources.filter(r => r.type === resourceType);
    }

    if (filteredResources.length === 0) {
      return `No ${resourceType || ''} resources found.`;
    }

    const details = filteredResources.map(r => ({
      name: r.name || 'Unknown',
      duration: r.duration || 0,
      size: r.transferSize || 0,
      cached: r.transferSize === 0 || r.fromCache
    }));

    return {
      type: 'metrics',
      metricType: 'resourceDetails',
      message: `Resource Details (${resourceType || 'All'}):\n` +
              details.slice(0, 5).map(r => 
                `• ${r.name.slice(-30)}: ${r.duration.toFixed(2)}ms ${r.cached ? '(cached)' : ''}`
              ).join('\n') +
              (details.length > 5 ? '\n...and ' + (details.length - 5) + ' more' : ''),
      data: {
        type: resourceType,
        resources: details
      }
    };
  }

  getPaintTiming() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.paintTiming) {
      return "Paint timing data is not available.";
    }

    return {
      type: 'metrics',
      metricType: 'paintTiming',
      message: `Paint Timing:\n` +
              `• First Paint: ${snapshot.paintTiming.firstPaint}ms\n` +
              `• First Contentful Paint: ${snapshot.paintTiming.firstContentfulPaint}ms\n` +
              `• Largest Contentful Paint: ${snapshot.paintTiming.largestContentfulPaint}ms`,
      data: snapshot.paintTiming
    };
  }

  getPerformanceMarks() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.performanceMarks) {
      return "Performance marks data is not available.";
    }

    return {
      type: 'metrics',
      metricType: 'performanceMarks',
      message: `Performance Marks:\n` +
              `• Total Marks: ${snapshot.performanceMarks.count}\n` +
              `• Latest Mark: ${snapshot.performanceMarks.latestMark}\n` +
              `• Average Duration: ${snapshot.performanceMarks.averageDuration}ms`,
      data: snapshot.performanceMarks
    };
  }

  getCacheInfo() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.cache) {
      return "Cache information is not available.";
    }

    return {
      type: 'metrics',
      metricType: 'cache',
      message: `Cache Info:\n` +
              `• Cache Size: ${(snapshot.cache.size / 1024 / 1024).toFixed(2)} MB\n` +
              `• Cached Items: ${snapshot.cache.itemCount}\n` +
              `• Hit Rate: ${snapshot.cache.hitRate}%`,
      data: snapshot.cache
    };
  }
}
