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
              <th>Endpoint</th>
              <th>Duration</th>
              <th>Size</th>
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
        }
      }
    });
  }

  update(data) {
    if (!Array.isArray(data) || !data.length) return;

    // Sort APIs by duration
    const sortedData = [...data].sort((a, b) => b.duration - a.duration);
    const avgResponse = sortedData.reduce((acc, curr) => acc + curr.duration, 0) / sortedData.length;

    // Update stats
    document.getElementById('slowestApi').textContent = 
      `Slowest: ${sortedData[0].url.split('?')[0]} (${sortedData[0].duration}ms)`;
    document.getElementById('avgResponse').textContent = 
      `Avg: ${avgResponse.toFixed(1)}ms`;

    // Update chart
    this.chart.data.labels = sortedData.slice(0, 10).map(d => d.url.split('?')[0]);
    this.chart.data.datasets[0].data = sortedData.slice(0, 10).map(d => d.duration);
    this.chart.update();

    // Update list
    const tbody = document.getElementById('apiList');
    tbody.innerHTML = sortedData.slice(0, 10).map(api => `
      <tr>
        <td title="${api.url}">${api.url.split('?')[0]}</td>
        <td>${api.duration}ms</td>
        <td>${(api.size / 1024).toFixed(1)}KB</td>
      </tr>
    `).join('');
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.innerHTML = '';
  }
}
