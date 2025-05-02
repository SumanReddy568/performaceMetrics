class FPSPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.data = [];
    this.maxDataPoints = 60; // Keep 1 minute of data at 1-second intervals
    this.init();
  }

  init() {
    // Create chart container
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Frames Per Second</h3>
        <div class="current-value" id="fpsCurrentValue">0</div>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
    `;

    // Initialize chart
    const ctx = this.container.querySelector('canvas').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'FPS',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: false,
            suggestedMin: 0,
            suggestedMax: 60,
            grid: {
              color: 'rgba(0, 0, 0, 0.1)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        animation: {
          duration: 300
        }
      }
    });
  }

  update(dataPoint) {
    // Add new data point
    this.data.push(dataPoint);

    // Trim data if exceeds max points
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    // Update current value display
    this.container.querySelector('#fpsCurrentValue').textContent =
      `${dataPoint.value.toFixed(1)} FPS`;

    // Update chart
    this.chart.data.labels = this.data.map((_, i) => {
      return `${i}s`;
    });
    this.chart.data.datasets[0].data = this.data.map(d => d.value);
    this.chart.update();
  }

  destroy() {
    try {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.container.innerHTML = '';
    } catch (e) {
      console.error("Error destroying FPS chart:", e);
    }
  }
}