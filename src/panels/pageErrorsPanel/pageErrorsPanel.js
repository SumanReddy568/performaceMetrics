class PageErrorsPanel extends BasePanel {
  constructor(containerId) {
    super(containerId, { timeoutDuration: 30000 });
    console.log(`PageErrorsPanel initialized with containerId: ${containerId}`); // Debug log
    this.data = [];
    this.maxDataPoints = 50;
    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="panel-header">
        <h3>Page Errors</h3>
        <div class="error-stats">
          <span id="totalErrors">Total: 0</span>
          <span id="errorRate">Rate: 0/min</span>
        </div>
      </div>
      <div class="chart-container">
        <canvas></canvas>
      </div>
      <div class="error-list">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Message</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody id="errorList"></tbody>
        </table>
      </div>
    `;

    const ctx = this.container.querySelector('canvas').getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [{
          label: 'Errors per Minute',
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
            ticks: {
              stepSize: 1
            }
          }
        }
      }
    });
  }

  formatTime(timestamp) {
    try {
      if (!timestamp) return 'N/A';
      
      // Handle ISO string or timestamp number
      const date = typeof timestamp === 'string' ? 
        new Date(timestamp) : 
        new Date(parseInt(timestamp));

      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting time:', e);
      return 'Invalid Time';
    }
  }

  update(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.errors)) {
        console.warn('PageErrorsPanel received invalid or no data:', data); // Debugging log
        super.setDisabled(true);
        document.getElementById('errorList').innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">No errors to display</td>
            </tr>
        `;
        return;
    }

    data.errors = data.errors.filter(error => 
        error && 
        typeof error === 'object' && 
        error.message && 
        !isNaN(error.timestamp)
    );

    if (data.errors.length === 0) {
        console.warn('PageErrorsPanel: No valid errors found.');
        super.setDisabled(true);
        document.getElementById('errorList').innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">No errors to display</td>
            </tr>
        `;
        return;
    }

    this.updateLastActivity();
    this.data.push(data);
    if (this.data.length > this.maxDataPoints) {
        this.data.shift();
    }

    // Update stats
    const totalErrors = this.data.reduce((sum, d) => sum + d.count, 0);
    const errorRate = (totalErrors / this.data.length).toFixed(1);
    
    document.getElementById('totalErrors').textContent = `Total: ${totalErrors}`;
    document.getElementById('errorRate').textContent = `Rate: ${errorRate}/min`;

    // Update chart
    if (this.data.length === 0) {
        this.chart.data.labels = ['No Data'];
        this.chart.data.datasets[0].data = [0];
    } else {
        this.chart.data.labels = this.data.map(d => {
            const time = new Date(d.timestamp);
            return `${time.getHours()}:${time.getMinutes()}`;
        });
        this.chart.data.datasets[0].data = this.data.map(d => d.count);
    }
    this.chart.update('none');

    // Update error list
    const tbody = document.getElementById('errorList');
    if (data.errors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center;">No errors to display</td>
            </tr>
        `;
    } else {
        tbody.innerHTML = data.errors.map(error => `
            <tr>
                <td>${this.formatTime(error.timestamp)}</td>
                <td>${error.type || 'Unknown'}</td>
                <td>${this.truncateText(error.message, 100)}</td>
                <td>${error.location || 'Unknown location'}</td>
            </tr>
        `).join('');
    }
  }

  truncateText(text, maxLength) {
    if (!text) return 'N/A';
    return text.length > maxLength ? 
      `${text.substring(0, maxLength - 3)}...` : 
      text;
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
      console.error("Error destroying PageErrors chart:", e);
    }
  }
}
