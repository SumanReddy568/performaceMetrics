class ResourceTimingPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [];
    this.maxDataPoints = 60;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Resource Timing</h3>
        <div class="resource-timing-stats">
          <span id="resourceCount">Resources: 0</span>
          <span id="transferSize">Transfer Size: 0 KB</span>
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
          label: 'Resource Count',
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
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
  }

  update(data) {
    if (!data) return;

    this.data.push(data);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    document.getElementById('resourceCount').textContent = 
      `Resources: ${data.resourceCount || 0}`;
    document.getElementById('transferSize').textContent = 
      `Transfer Size: ${(data.transferSize / 1024).toFixed(2)} KB`;

    this.chart.data.labels = this.data.map((_, i) => `${i}s`);
    this.chart.data.datasets[0].data = this.data.map(d => d.resourceCount || 0);
    
    this.chart.update('none');
  }

  destroy() {
    try {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.container.innerHTML = '';
    } catch (e) {
      console.error("Error destroying ResourceTiming chart:", e);
    }
  }
}
