class FirstPaintPanel extends BasePanel {
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
        <h3>Paint Timing</h3>
        <div class="paint-stats">
          <span id="firstPaint">FP: --</span>
          <span id="firstContentfulPaint">FCP: --</span>
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
        labels: ['First Paint', 'First Contentful Paint'],
        datasets: [{
          label: 'Time (ms)',
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
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'milliseconds'
            }
          }
        }
      }
    });
  }

  update(data) {
    if (!data) return;
    this.updateLastActivity();
    document.getElementById('firstPaint').textContent = 
      `FP: ${data.fp.toFixed(1)}ms`;
    document.getElementById('firstContentfulPaint').textContent = 
      `FCP: ${data.fcp.toFixed(1)}ms`;

    this.chart.data.datasets[0].data = [data.fp, data.fcp];
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
      console.error("Error destroying FirstPaint chart:", e);
    }
  }
}
