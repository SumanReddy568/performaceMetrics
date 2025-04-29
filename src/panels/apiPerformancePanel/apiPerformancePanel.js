class APIPerformancePanel {
  constructor(containerId) {
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
    if (!Array.isArray(data)) {
      console.warn('API Performance data is not an array:', data);
      return;
    }

    // Update internal data store
    this.data = data.slice(-this.maxDataPoints);

    if (this.data.length === 0) return;

    // Sort APIs by duration
    const sortedData = [...this.data].sort((a, b) => b.duration - a.duration);
    const avgResponse = sortedData.reduce((acc, curr) => acc + curr.duration, 0) / sortedData.length;

    // Update stats
    document.getElementById('totalCalls').textContent = `Total: ${this.data.length}`;
    document.getElementById('slowestApi').textContent = sortedData[0] ? 
      `Slowest: ${this.formatUrl(sortedData[0].url)} (${sortedData[0].duration.toFixed(1)}ms)` : 
      'Slowest: --';
    document.getElementById('avgResponse').textContent = `Avg: ${avgResponse.toFixed(1)}ms`;

    // Update chart with last 10 calls
    const recentCalls = this.data.slice(-10);
    this.chart.data.labels = recentCalls.map(d => this.formatUrl(d.url));
    this.chart.data.datasets[0].data = recentCalls.map(d => d.duration);
    this.chart.update();

    // Update list
    const tbody = document.getElementById('apiList');
    tbody.innerHTML = sortedData.slice(0, 10).map(api => `
      <tr>
        <td>${api.method || 'GET'}</td>
        <td title="${api.url}">${this.formatUrl(api.url)}</td>
        <td>${api.status || '--'}</td>
        <td>${api.duration.toFixed(1)}ms</td>
        <td>${(api.size / 1024).toFixed(1)}KB</td>
        <td>${api.type || 'Unknown'}</td>
      </tr>
    `).join('');
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
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.innerHTML = '';
  }
}
