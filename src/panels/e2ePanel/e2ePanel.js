class E2EPanel extends BasePanel {
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
        <h3>E2E Metrics</h3>
        <div class="e2e-stats">
          <span id="e2eLastEvent">Last: --</span>
          <span id="e2eAvgTime">Avg: --</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
      <div class="e2e-list">
        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Duration (ms)</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody id="e2eList"></tbody>
        </table>
      </div>
    `;
        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'E2E Duration (ms)',
                    data: [],
                    backgroundColor: 'rgba(255, 205, 86, 0.2)',
                    borderColor: 'rgba(255, 205, 86, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    update(data) {
        if (!Array.isArray(data) || data.length === 0) return;
        this.updateLastActivity();
        this.data = data.slice(-this.maxDataPoints);

        // Stats
        const avg = this.data.reduce((sum, d) => sum + d.duration, 0) / this.data.length;
        document.getElementById('e2eLastEvent').textContent = `Last: ${this.data[this.data.length - 1].event || '--'}`;
        document.getElementById('e2eAvgTime').textContent = `Avg: ${avg.toFixed(1)}ms`;

        // Chart
        this.chart.data.labels = this.data.map(d => d.event);
        this.chart.data.datasets[0].data = this.data.map(d => d.duration);
        this.chart.update();

        // Table
        const tbody = document.getElementById('e2eList');
        tbody.innerHTML = this.data.map(d => `
      <tr>
        <td>${d.event}</td>
        <td>${d.duration.toFixed(1)}</td>
        <td>${new Date(d.timestamp).toLocaleTimeString()}</td>
      </tr>
    `).join('');
    }

    destroy() {
        super.destroy();
        if (this.chart) this.chart.destroy();
    }
}
