class JSHeapPanel {
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
        <h3>JS Heap Size (MB)</h3>
        <div class="jsheap-stats">
          <span id="usedJSHeapSize">Used: 0</span>
          <span id="jsHeapSizeLimit">Limit: 0</span>
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
          label: 'Used JS Heap Size',
          data: [],
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          tension: 0.4,
          fill: true
        }, {
          label: 'JS Heap Size Limit',
          data: [],
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4,
          fill: false
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

    document.getElementById('usedJSHeapSize').textContent = 
      `Used: ${data.usedJSHeapSize ? data.usedJSHeapSize.toFixed(2) : 0}`;
    document.getElementById('jsHeapSizeLimit').textContent = 
      `Limit: ${data.jsHeapSizeLimit ? data.jsHeapSizeLimit.toFixed(2) : 0}`;

    this.chart.data.labels = this.data.map((_, i) => `${i}s`);
    this.chart.data.datasets[0].data = this.data.map(d => d.usedJSHeapSize || 0);
    this.chart.data.datasets[1].data = this.data.map(d => d.jsHeapSizeLimit || 0);
    
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
      console.error("Error destroying JSHeap chart:", e);
    }
  }
}
