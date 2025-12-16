class CacheUsagePanel extends BasePanel {
  constructor(containerId) {
    super(containerId);
    this.data = [];
    this.maxDataPoints = 60;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Cache Usage</h3>
        <div class="cache-stats">
          <span id="cacheSize">Size: 0 MB</span>
          <span id="cacheEntries">Items: 0</span>
          <span id="cacheHits">Hits: 0</span>
          <span id="cacheMisses">Misses: 0</span>
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
          label: 'Cache Size (MB)',
          data: [],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          yAxisID: 'size'
        }, {
          label: 'Hit Rate (%)',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          yAxisID: 'rate'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          size: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Cache Size (MB)'
            }
          },
          rate: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Hit Rate (%)'
            },
            grid: {
              drawOnChartArea: false
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

    // Update stats
    document.getElementById('cacheSize').textContent =
      `Size: ${(data.size / (1024 * 1024)).toFixed(1)} MB`;
    document.getElementById('cacheHits').textContent =
      `Hits: ${data.hits}`;
    document.getElementById('cacheMisses').textContent =
      `Misses: ${data.misses}`;

    const entriesEl = document.getElementById('cacheEntries');
    if (entriesEl) {
      entriesEl.textContent = `Items: ${data.entries || 0}`;
    }

    // Update chart
    this.chart.data.labels = this.data.map((_, i) => `${i}s`);
    this.chart.data.datasets[0].data = this.data.map(d => (d.size / (1024 * 1024)).toFixed(1));
    this.chart.data.datasets[1].data = this.data.map(d =>
      ((d.hits / (d.hits + d.misses)) * 100).toFixed(1)
    );

    this.chart.update('none');
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
      console.error("Error destroying CacheUsage chart:", e);
    }
  }
}