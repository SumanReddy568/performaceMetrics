class MetricsExporter {
  static convertToCSV(metricsData) {
    console.log('Converting metrics data to CSV:', metricsData); // Debug log

    const headers = [
      'Timestamp',
      'FPS',
      'Memory Used (MB)',
      'Memory Total (MB)',
      'Network Requests',
      'Network Transfer (KB)',
      'CPU Usage (%)',
      'DOM Elements',
      'DOM Nodes',
      'Event Listeners',
      'First Paint (ms)',
      'First Contentful Paint (ms)',
      'DOM Load Time (ms)',
      'Window Load Time (ms)',
      'Long Tasks Duration (ms)',
      'API Calls Count',
      'API Response Time (ms)',
      'Page Errors Count',
      'Recent Error Types',
      'Cache Size (MB)',
      'Cache Hits',
      'Cache Misses',
      'Cache Hit Rate (%)',
      'Cache Entries',
      'Web Vitals LCP (ms)',
      'Web Vitals FID (ms)',
      'Web Vitals CLS',
      'Server Timing Count',
      'Server Timing Avg Duration (ms)',
      'WebSocket Connections',
      'WebSocket Messages/s',
      'WebSocket Data Transfer (KB)',
      'LocalStorage Usage (KB)',
      'SessionStorage Usage (KB)',
      'IndexedDB Usage (KB)',
      'Performance Marks Count',
      'Performance Measures Count',
      'User Clicks',
      'User Scrolls',
      'User Keypresses'
    ];

    const rows = metricsData.map(data => [
      new Date(data.timestamp).toISOString(),
      data.fps?.value || 0,
      data.memory?.usedJSHeapSize?.toFixed(2) || 0,
      data.memory?.totalJSHeapSize?.toFixed(2) || 0,
      data.network?.requests || 0,
      ((data.network?.transferred || 0) / 1024).toFixed(2),
      data.cpu?.usage?.toFixed(2) || 0,
      data.dom?.elements || 0,
      data.dom?.nodes || 0,
      data.dom?.listeners || 0,
      data.firstPaint?.fp?.toFixed(2) || 0,
      data.firstPaint?.fcp?.toFixed(2) || 0,
      data.pageLoad?.domLoadTime?.toFixed(2) || 0,
      data.pageLoad?.windowLoadTime?.toFixed(2) || 0,
      data.longTasks?.duration?.toFixed(2) || 0,
      data.apiPerformance?.length || 0,
      data.apiPerformance?.reduce((avg, call) => avg + call.duration, 0) / (data.apiPerformance?.length || 1),
      data.pageErrors?.count || 0,
      data.pageErrors?.recentErrors?.map(e => e.type).join(';') || '',
      ((data.cacheUsage?.size || 0) / (1024 * 1024)).toFixed(2),
      data.cacheUsage?.hits || 0,
      data.cacheUsage?.misses || 0,
      data.cacheUsage?.hits && data.cacheUsage?.misses ? 
        ((data.cacheUsage.hits / (data.cacheUsage.hits + data.cacheUsage.misses)) * 100).toFixed(2) : 0,
      data.cacheUsage?.totalEntries || 0,
      data.webVitals?.lcp || 0,
      data.webVitals?.fid || 0,
      data.webVitals?.cls || 0,
      data.serverTiming?.metrics?.length || 0,
      data.serverTiming?.metrics?.reduce((avg, m) => avg + m.duration, 0) / (data.serverTiming?.metrics?.length || 1),
      data.websocket?.connections?.length || 0,
      data.websocket?.connections?.reduce((sum, c) => sum + c.messages, 0) || 0,
      ((data.websocket?.connections?.reduce((sum, c) => sum + c.bytes, 0) || 0) / 1024).toFixed(2),
      ((data.storage?.localStorage || 0) / 1024).toFixed(2),
      ((data.storage?.sessionStorage || 0) / 1024).toFixed(2),
      ((data.storage?.indexedDB || 0) / 1024).toFixed(2),
      data.performanceMetrics?.markCount || 0,
      data.performanceMetrics?.measureCount || 0,
      data.userInteraction?.clicks || 0,
      data.userInteraction?.scrolls || 0,
      data.userInteraction?.keypresses || 0
    ]);

    console.log('Generated CSV rows:', rows); // Debug log

    return [headers].concat(rows)
      .map(row => row.join(','))
      .join('\n');
  }

  static downloadCSV(data, filename = 'performance-metrics.csv') {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, filename);
      return;
    }

    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static formatErrorsForExport(errors) {
    return errors
      .map(e => `${e.type}: ${e.message}`)
      .join(' | ');
  }
}
