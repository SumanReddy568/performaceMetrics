class PageLoadPanel extends BasePanel {
  constructor(containerId) {
    super(containerId);
    this.container = document.getElementById(containerId);
    this.data = [];
    this.maxDataPoints = 10;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Page Load Metrics</h3>
        <div class="load-stats">
          <span id="domLoad">DOM: --</span>
          <span id="windowLoad">Load: --</span>
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
          label: 'DOM Load Time',
          data: [],
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Window Load Time',
          data: [],
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
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
            title: {
              display: true,
              text: 'Time (ms)'
            }
          }
        }
      }
    });
  }

  update(data) {
    if (!data) return;
    this.updateLastActivity();

    this.data.push(data);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    document.getElementById('domLoad').textContent = 
      `DOM: ${data.domLoadTime.toFixed(0)}ms`;
    document.getElementById('windowLoad').textContent = 
      `Load: ${data.windowLoadTime.toFixed(0)}ms`;

    this.chart.data.labels = this.data.map((_, i) => `Load ${i + 1}`);
    this.chart.data.datasets[0].data = this.data.map(d => d.domLoadTime);
    this.chart.data.datasets[1].data = this.data.map(d => d.windowLoadTime);
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
      console.error("Error destroying PageLoad chart:", e);
    }
  }
}
