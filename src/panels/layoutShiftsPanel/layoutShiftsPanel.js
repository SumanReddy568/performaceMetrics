class LayoutShiftsPanel {
    constructor(containerId) {
      this.container = document.getElementById(containerId);
      this.data = [];
      this.maxDataPoints = 60;
      this.init();
    }
  
    init() {
      this.container.innerHTML = `
        <div class="panel-header">
          <h3>Layout Shifts</h3>
          <div class="layout-shifts-stats">
            <span id="cumulativeLayoutShift">CLS: 0</span>
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
            label: 'Cumulative Layout Shift',
            data: [],
            borderColor: 'rgba(255, 159, 64, 1)',
            backgroundColor: 'rgba(255, 159, 64, 0.2)',
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
  
      document.getElementById('cumulativeLayoutShift').textContent = 
        `CLS: ${data.cumulativeLayoutShift ? data.cumulativeLayoutShift.toFixed(3) : 0}`;
  
      this.chart.data.labels = this.data.map((_, i) => `${i}s`);
      this.chart.data.datasets[0].data = this.data.map(d => d.cumulativeLayoutShift || 0);
      
      this.chart.update('none');
    }
  
    destroy() {
      if (this.chart) {
        this.chart.destroy();
      }
      this.container.innerHTML = '';
    }
  }
  