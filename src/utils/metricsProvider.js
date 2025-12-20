class MetricsProvider {
  constructor() {
    this.latestSnapshot = {};
    this.historicalData = {
      cpu: [],
      memory: [],
      network: [],
      fps: [],
      // Add new panels:
      eventLoopLag: [],
      paintTiming: [],
      navigationTiming: []
    };
    this.maxHistoryLength = 60; // Store 1 minute of data (assuming 1 data point per second)
  }

  updateMetrics(snapshot) {
    console.log("Updating metrics with snapshot:", snapshot); // Debug log
    this.latestSnapshot = snapshot;

    // Store historical data for trending analysis
    if (snapshot.cpu) {
      console.log("Updating CPU data:", snapshot.cpu); // Debug log
      this.historicalData.cpu.push({
        value: snapshot.cpu.usage,
        timestamp: snapshot.cpu.timestamp
      });
      this._trimHistory('cpu');
    }

    if (snapshot.memory) {
      console.log("Updating Memory data:", snapshot.memory); // Debug log
      this.historicalData.memory.push({
        used: snapshot.memory.usedJSHeapSize,
        total: snapshot.memory.totalJSHeapSize,
        timestamp: snapshot.memory.timestamp
      });
      this._trimHistory('memory');
    }

    if (snapshot.network) {
      console.log("Updating Network data:", snapshot.network); // Debug log
      this.historicalData.network.push({
        requests: snapshot.network.requests,
        transferred: snapshot.network.transferred,
        timestamp: snapshot.network.timestamp
      });
      this._trimHistory('network');
    }

    if (snapshot.fps) {
      console.log("Updating FPS data:", snapshot.fps); // Debug log
      this.historicalData.fps.push({
        value: snapshot.fps.value,
        timestamp: snapshot.fps.timestamp
      });
      this._trimHistory('fps');
    }

    // Event Loop Lag
    if (snapshot.eventLoopLag) {
      this.historicalData.eventLoopLag.push({
        lag: snapshot.eventLoopLag.lag ?? snapshot.eventLoopLag.value ?? 0,
        timestamp: snapshot.eventLoopLag.timestamp
      });
      this._trimHistory('eventLoopLag');
    }
    // Paint Timing
    if (snapshot.paintTiming) {
      this.historicalData.paintTiming.push({
        fp: snapshot.paintTiming.fp ?? snapshot.paintTiming.firstPaint ?? 0,
        fcp: snapshot.paintTiming.fcp ?? snapshot.paintTiming.firstContentfulPaint ?? 0,
        timestamp: snapshot.paintTiming.timestamp
      });
      this._trimHistory('paintTiming');
    }
    // Navigation Timing
    if (snapshot.navigationTiming) {
      this.historicalData.navigationTiming.push({
        metrics: snapshot.navigationTiming.metrics || [],
        domComplete: snapshot.navigationTiming.domComplete,
        loadEventEnd: snapshot.navigationTiming.loadEventEnd,
        timestamp: snapshot.navigationTiming.timestamp
      });
      this._trimHistory('navigationTiming');
    }
  }

  _trimHistory(metric) {
    if (this.historicalData[metric].length > this.maxHistoryLength) {
      this.historicalData[metric] = this.historicalData[metric].slice(-this.maxHistoryLength);
    }
  }

  getSnapshot() {
    console.log("Returning latest snapshot:", this.latestSnapshot); // Debug log
    if (!this.latestSnapshot || Object.keys(this.latestSnapshot).length === 0) {
      console.warn("MetricsProvider: No snapshot data available.");
    }
    return this.latestSnapshot;
  }

  getHistoricalData(metric, duration = 60000) {
    if (!this.historicalData[metric]) {
      return [];
    }

    const now = Date.now();
    const cutoff = now - duration;

    return this.historicalData[metric].filter(item => item.timestamp >= cutoff);
  }

  getAverageValue(metric, property = 'value', duration = 60000) {
    const data = this.getHistoricalData(metric, duration);

    if (data.length === 0) {
      return 0;
    }

    // For CPU data where the value might be directly in the object
    if (metric === 'cpu' && property === 'value') {
      const sum = data.reduce((total, item) => total + (item.value !== undefined ? item.value : 0), 0);
      return sum / data.length;
    }

    // For regular data structures
    const sum = data.reduce((total, item) => {
      const value = property && item[property] !== undefined ? item[property] : item;
      return total + (typeof value === 'number' ? value : 0);
    }, 0);
    return sum / data.length;
  }
}
