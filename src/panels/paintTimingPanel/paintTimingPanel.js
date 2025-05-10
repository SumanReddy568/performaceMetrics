class PaintTimingPanel extends BasePanel {
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
        <h3>Paint Timing</h3>
        <div class="painttiming-stats">
          <span id="paintTimingFP">FP: --</span>
          <span id="paintTimingFCP">FCP: --</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
    `;
        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['FP', 'FCP'],
                datasets: [{
                    label: 'Paint Timing (ms)',
                    data: [0, 0],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.2)',
                        'rgba(75, 192, 192, 0.2)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
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
        // Accept both {fp, fcp} and {firstPaint, firstContentfulPaint}
        const fp = typeof data.fp === 'number' ? data.fp : (typeof data.firstPaint === 'number' ? data.firstPaint : 0);
        const fcp = typeof data.fcp === 'number' ? data.fcp : (typeof data.firstContentfulPaint === 'number' ? data.firstContentfulPaint : 0);
        this.data.push({ fp, fcp, timestamp: data.timestamp });
        if (this.data.length > this.maxDataPoints) this.data.shift();
        document.getElementById('paintTimingFP').textContent = `FP: ${fp.toFixed(1)}ms`;
        document.getElementById('paintTimingFCP').textContent = `FCP: ${fcp.toFixed(1)}ms`;
        this.chart.data.datasets[0].data = [fp, fcp];
        this.chart.update();
    }

    destroy() {
        super.destroy();
        if (this.chart) this.chart.destroy();
    }
}
