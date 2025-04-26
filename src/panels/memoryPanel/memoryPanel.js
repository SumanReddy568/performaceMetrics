class MemoryPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.chart = null;
    this.data = [];
    this.maxDataPoints = 60;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Memory Usage</h3>
        <div class="memory-stats">
          <span class="used" id="memoryUsed">0 MB</span>
          <span class="total" id="memoryTotal">0 MB</span>
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
        datasets: [
          {
            label: 'Used',
            data: [],
            borderColor: 'rgba(153, 102, 255, 1)',
            backgroundColor: 'rgba(153, 102, 255, 0.2)',
            tension: 0.4,
            fill: true,
            borderWidth: 2
          },
          {
            label: 'Total',
            data: [],
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.4,
            fill: false,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'MB'
            },
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
            position: 'top',
            labels: {
              boxWidth: 12
            }
          }
        }
      }
    });
  }

  update(dataPoint) {
    this.data.push(dataPoint);

    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    // Update current values
    document.getElementById('memoryUsed').textContent =
      `${dataPoint.usedJSHeapSize.toFixed(1)} MB`;
    document.getElementById('memoryTotal').textContent =
      `${dataPoint.totalJSHeapSize.toFixed(1)} MB`;

    // Update chart
    this.chart.data.labels = this.data.map((_, i) => `${i}s`);
    this.chart.data.datasets[0].data = this.data.map(d => d.usedJSHeapSize);
    this.chart.data.datasets[1].data = this.data.map(d => d.totalJSHeapSize);
    this.chart.update();
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.innerHTML = '';
  }
}