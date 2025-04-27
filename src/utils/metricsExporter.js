class MetricsExporter {
  static convertToCSV(metricsData) {
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
      'API Response Time (ms)'
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
      data.apiPerformance?.reduce((avg, call) => avg + call.duration, 0) / (data.apiPerformance?.length || 1)
    ]);

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
}
