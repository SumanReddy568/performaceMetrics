class CPUPanel extends BasePanel {
  constructor(containerId) {
    super(containerId);
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.data = [];
    this.maxDataPoints = 60;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>CPU Usage</h3>
        <div class="cpu-usage" id="cpuUsage">0%</div>
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
          label: 'CPU Usage',
          data: [],
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
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
            max: 100,
            title: {
              display: true,
              text: 'Usage %'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  update(dataPoint) {
    if (!dataPoint) return;
    this.updateLastActivity();

    this.data.push(dataPoint);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    // Update current value
    document.getElementById('cpuUsage').textContent =
      `${dataPoint.usage.toFixed(1)}%`;

    // Update chart
    this.chart.data.labels = this.data.map((_, i) => `${i}s`);
    this.chart.data.datasets[0].data = this.data.map(d => d.usage);
    this.chart.update();
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
      console.error("Error destroying CPU chart:", e);
    }
  }
}
