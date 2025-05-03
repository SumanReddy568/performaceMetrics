class APIPerformancePanel extends BasePanel {
  constructor(containerId) {
    super(containerId);
    this.container = document.getElementById(containerId);
    this.data = [];
    this.maxDataPoints = 20;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>API Performance</h3>
        <div class="api-stats">
          <span id="totalCalls">Total: 0</span>
          <span id="slowestApi">Slowest: --</span>
          <span id="avgResponse">Avg: --</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
      <div class="api-list">
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Endpoint</th>
              <th>Status</th>
              <th>Duration</th>
              <th>Size</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody id="apiList"></tbody>
        </table>
      </div>
    `;

    const ctx = this.container.querySelector('canvas').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Response Time (ms)',
          data: [],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Duration (ms)'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const api = this.data[context.dataIndex];
                return [
                  `Duration: ${api.duration}ms`,
                  `Method: ${api.method}`,
                  `Status: ${api.status}`,
                  `Size: ${(api.size / 1024).toFixed(1)}KB`
                ];
              }
            }
          }
        }
      }
    });
  }

  update(data) {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No API Performance data available');
      return;
    }
    this.updateLastActivity();

    console.log('API Performance panel update called with data:', data);

    // Update internal data store
    this.data = data.slice(-this.maxDataPoints);
    console.log('Updated internal data store with', this.data.length, 'items');

    // Sort APIs by duration
    const sortedData = [...this.data].sort((a, b) => b.duration - a.duration);
    const avgResponse = sortedData.reduce((acc, curr) => acc + curr.duration, 0) / sortedData.length;

    // Update stats
    document.getElementById('totalCalls').textContent = `Total: ${this.data.length}`;
    document.getElementById('slowestApi').textContent = sortedData[0] ? 
      `Slowest: ${this.formatUrl(sortedData[0].url)} (${sortedData[0].duration.toFixed(1)}ms)` : 
      'Slowest: --';
    document.getElementById('avgResponse').textContent = `Avg: ${avgResponse.toFixed(1)}ms`;

    // Update chart with last 10 calls - add colors based on performance
    const recentCalls = this.data.slice(-10);
    this.chart.data.labels = recentCalls.map(d => this.formatUrl(d.url));
    this.chart.data.datasets[0].data = recentCalls.map(d => d.duration);
    
    // Add color based on duration
    this.chart.data.datasets[0].backgroundColor = recentCalls.map(d => {
      if (d.duration < 100) return 'rgba(75, 192, 192, 0.2)'; // Fast (green)
      if (d.duration < 300) return 'rgba(255, 205, 86, 0.2)'; // Medium (yellow)
      return 'rgba(255, 99, 132, 0.2)'; // Slow (red)
    });
    
    this.chart.data.datasets[0].borderColor = recentCalls.map(d => {
      if (d.duration < 100) return 'rgba(75, 192, 192, 1)'; // Fast (green)
      if (d.duration < 300) return 'rgba(255, 205, 86, 1)'; // Medium (yellow)
      return 'rgba(255, 99, 132, 1)'; // Slow (red)
    });
    
    try {
      this.chart.update();
      console.log('Chart updated successfully');
    } catch (e) {
      console.error('Error updating chart:', e);
    }

    // Update list with colored performance indicators
    try {
      const tbody = document.getElementById('apiList');
      tbody.innerHTML = sortedData.slice(0, 10).map(api => {
        // Determine performance class
        let performanceClass = '';
        if (api.duration < 100) performanceClass = 'perf-good';
        else if (api.duration < 300) performanceClass = 'perf-medium';
        else performanceClass = 'perf-poor';

        return `
        <tr>
          <td>${api.method || 'GET'}</td>
          <td title="${api.url}">${this.formatUrl(api.url)}</td>
          <td>${api.status || '--'}</td>
          <td class="${performanceClass}">${api.duration.toFixed(1)}ms</td>
          <td>${(api.size / 1024).toFixed(1)}KB</td>
          <td>${api.type || 'Unknown'}</td>
        </tr>
      `;
      }).join('');
      
      // Add styles for performance indicators if they don't exist
      if (!document.getElementById('api-performance-styles')) {
        const style = document.createElement('style');
        style.id = 'api-performance-styles';
        style.textContent = `
          .perf-good { color: #4caf50; font-weight: bold; }
          .perf-medium { color: #ff9800; font-weight: bold; }
          .perf-poor { color: #f44336; font-weight: bold; }
        `;
        document.head.appendChild(style);
      }
      
      console.log('API list updated successfully, this is working');
    } catch (e) {
      console.error('Error updating API list:', e);
    }
  }

  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.length > 30 ? 
        urlObj.pathname.substring(0, 27) + '...' : 
        urlObj.pathname;
    } catch (e) {
      return url.split('?')[0].substring(0, 30);
    }
  }

  destroy() {
    super.destroy();
    try {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.container.innerHTML = '';
    } catch (e) {
      console.error("Error destroying APIPerformance chart:", e);
    }
  }
}
