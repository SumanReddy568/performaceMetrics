class NavigationTimingPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.container = document.getElementById(containerId);
        this.data = [];
        this.init();
    }

    init() {
        this.container.innerHTML = `
      <div class="panel-header">
        <h3>Navigation Timing</h3>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
      <div class="navigation-details">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Time (ms)</th>
            </tr>
          </thead>
          <tbody id="navigationTimingList"></tbody>
        </table>
      </div>
    `;
        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Navigation Timing (ms)',
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
                    y: { beginAtZero: true }
                }
            }
        });
    }

    update(data) {
        if (!data) return;
        this.updateLastActivity();
        // Accept both {metrics: [...]}, or {domComplete, loadEventEnd}
        let metrics = [];
        if (Array.isArray(data.metrics)) {
            metrics = data.metrics;
        } else if (typeof data.domComplete === 'number' || typeof data.loadEventEnd === 'number') {
            metrics = [
                { name: 'domComplete', value: data.domComplete || 0 },
                { name: 'loadEventEnd', value: data.loadEventEnd || 0 }
            ];
        }
        this.data = metrics;
        const tbody = document.getElementById('navigationTimingList');
        tbody.innerHTML = this.data.map(m =>
            `<tr><td>${m.name}</td><td>${m.value.toFixed(1)}</td></tr>`
        ).join('');
        this.chart.data.labels = this.data.map(m => m.name);
        this.chart.data.datasets[0].data = this.data.map(m => m.value);
        this.chart.update();
    }

    destroy() {
        super.destroy();
        if (this.chart) this.chart.destroy();
    }
}
