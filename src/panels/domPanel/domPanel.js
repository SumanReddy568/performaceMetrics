class DOMPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [];
    this.maxDataPoints = 60;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>DOM Metrics</h3>
        <div class="dom-stats">
          <span id="elementCount">Elements: 0</span>
          <span id="nodeCount">Nodes: 0</span>
          <span id="listenerCount">Event Listeners: 0</span>
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
          label: 'Elements',
          data: [],
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Nodes',
          data: [],
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4,
          fill: true
        }, {
          label: 'Listeners',
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

    // Update stats display
    document.getElementById('elementCount').textContent = 
      `Elements: ${data.elements || 0}`;
    document.getElementById('nodeCount').textContent = 
      `Nodes: ${data.nodes || 0}`;
    document.getElementById('listenerCount').textContent = 
      `Listeners: ${data.listeners || 0}`;

    // Update chart
    this.chart.data.labels = this.data.map((_, i) => `${i}s`);
    this.chart.data.datasets[0].data = this.data.map(d => d.elements || 0);
    this.chart.data.datasets[1].data = this.data.map(d => d.nodes || 0);
    this.chart.data.datasets[2].data = this.data.map(d => d.listeners || 0);
    
    this.chart.update('none');
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.innerHTML = '';
  }
}
