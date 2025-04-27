class LongTasksPanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.data = [];
    this.maxDataPoints = 20;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Long Tasks</h3>
        <div class="longtask-stats">
          <span id="totalTasks">Count: 0</span>
          <span id="avgDuration">Avg: 0ms</span>
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
        labels: [],
        datasets: [{
          label: 'Task Duration (ms)',
          data: [],
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
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
              text: 'Duration (ms)'
            }
          }
        }
      }
    });
  }

  update(data) {
    this.data.push(data);
    if (this.data.length > this.maxDataPoints) {
      this.data.shift();
    }

    const avgDuration = data.duration.toFixed(1);
    document.getElementById('totalTasks').textContent = `Count: ${this.data.length}`;
    document.getElementById('avgDuration').textContent = `Avg: ${avgDuration}ms`;

    this.chart.data.labels = this.data.map((_, i) => `Task ${i + 1}`);
    this.chart.data.datasets[0].data = this.data.map(d => d.duration);
    this.chart.update();
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
    }
    this.container.innerHTML = '';
  }
}
