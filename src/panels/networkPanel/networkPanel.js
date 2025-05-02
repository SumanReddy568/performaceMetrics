class NetworkPanel {
  constructor(elementId) {
    this.container = document.getElementById(elementId);
    this.data = [];
    this.maxDataPoints = 60;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Network Activity</h3>
        <div class="network-stats">
          <span id="requestCount">0 requests</span>
          <span id="transferredData">0 KB</span>
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
          label: 'Requests/s',
          data: [],
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'requests'
        }, {
          label: 'Data Transferred (KB)',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true,
          yAxisID: 'transferred'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          requests: {
            type: 'linear',
            position: 'left',
            beginAtZero: true,
            title: {
              display: true,
              text: 'Requests/s'
            }
          },
          transferred: {
            type: 'linear',
            position: 'right',
            beginAtZero: true,
            title: {
              display: true,
              text: 'KB Transferred'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    });
  }

  update(dataPoint) {
    if (!dataPoint) return;

    this.data.push(dataPoint);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    // Convert timestamp to readable time
    const labels = this.data.map(d => {
      const date = new Date(d.timestamp);
      return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
    });

    // Update stats display
    document.getElementById('requestCount').textContent = 
      `${dataPoint.requests} requests`;
    document.getElementById('transferredData').textContent = 
      `${(dataPoint.transferred / 1024).toFixed(1)} KB`;

    // Update chart data
    this.chart.data.labels = labels;
    this.chart.data.datasets[0].data = this.data.map(d => d.requests);
    this.chart.data.datasets[1].data = this.data.map(d => 
      (d.transferred / 1024).toFixed(2)  // Convert to KB
    );

    // Request animation frame for smoother updates
    requestAnimationFrame(() => {
      this.chart.update('none'); // Use 'none' mode for better performance
    });
  }

  destroy() {
    try {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.container.innerHTML = '';
    } catch (e) {
      console.error("Error destroying Network chart:", e);
    }
  }
}
