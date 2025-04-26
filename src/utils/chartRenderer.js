class ChartRenderer {
  constructor(container, options) {
    this.container = container;
    this.options = options;
    this.chart = null;
    this.init();
  }

  init() {
    // Create canvas element
    const canvas = document.createElement('canvas');
    this.container.appendChild(canvas);

    // Initialize chart
    this.chart = new Chart(canvas.getContext('2d'), {
      type: this.options.type || 'line',
      data: {
        labels: [],
        datasets: [{
          label: this.options.title,
          data: [],
          backgroundColor: this.options.backgroundColor,
          borderColor: this.options.borderColor,
          borderWidth: 1,
          tension: 0.1,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 500,
          easing: 'easeOutQuart'
        },
        scales: {
          x: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#888888'
            }
          },
          y: {
            display: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: '#888888'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#ffffff',
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
        }
      }
    });
  }

  render(data) {
    if (!this.chart || !data) {
      console.warn('Chart or data is null:', { chart: !!this.chart, data });
      return;
    }

    console.log('Rendering data:', data); // Debug log

    // Remove oldest data point if we have more than 60 points
    if (this.chart.data.labels.length >= 60) {
      this.chart.data.labels.shift();
      this.chart.data.datasets[0].data.shift();
    }

    // Format timestamp
    const timestamp = new Date(data.timestamp);
    const timeLabel = `${timestamp.getMinutes()}:${timestamp.getSeconds().toString().padStart(2, '0')}`;

    // Add new label
    this.chart.data.labels.push(timeLabel);

    // Extract the correct value based on data type
    let value = 0;
    if (typeof data.value !== 'undefined') {
      value = data.value; // FPS
    } else if (typeof data.usage !== 'undefined') {
      value = data.usage; // CPU
    } else if (typeof data.usedJSHeapSize !== 'undefined') {
      value = data.usedJSHeapSize; // Memory
    } else if (typeof data.requests !== 'undefined') {
      value = data.requests; // Network
    }

    // Add new data point
    this.chart.data.datasets[0].data.push(value);

    // Update with no animation for better performance
    try {
      this.chart.update('none');
    } catch (e) {
      console.error('Error updating chart:', e);
    }
  }

  destroy() {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}