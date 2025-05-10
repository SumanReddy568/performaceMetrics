class EventLoopLagPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.container = document.getElementById(containerId);
        this.data = [];
        this.maxDataPoints = 60;
        this.init();
    }

    init() {
        this.container.innerHTML = `
      <div class="panel-header">
        <h3>Event Loop Lag</h3>
        <div class="eventlooplag-stats">
          <span id="eventLoopLagValue">Lag: 0 ms</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
    `;
        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Event Loop Lag (ms)',
                    data: [],
                    borderColor: 'rgba(255, 206, 86, 1)',
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    tension: 0.4,
                    fill: true
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
        // Accept both {lag, timestamp} and {value, timestamp}
        const lag = typeof data.lag === 'number' ? data.lag : (typeof data.value === 'number' ? data.value : 0);
        this.data.push({ lag, timestamp: data.timestamp });
        if (this.data.length > this.maxDataPoints) this.data.shift();
        document.getElementById('eventLoopLagValue').textContent = `Lag: ${lag.toFixed(1)} ms`;
        this.chart.data.labels = this.data.map((_, i) => `${i}s`);
        this.chart.data.datasets[0].data = this.data.map(d => d.lag);
        this.chart.update('none');
    }

    destroy() {
        super.destroy();
        if (this.chart) this.chart.destroy();
    }
}
