class WebVitalsPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.data = {
            lcp: 0,
            fid: 0,
            cls: 0
        };
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>Web Vitals</h3>
                <div class="web-vitals-stats">
                    <span id="lcp">LCP: --</span>
                    <span id="fid">FID: --</span>
                    <span id="cls">CLS: --</span>
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
                labels: ['LCP (ms)', 'FID (ms)', 'CLS (x100)'],
                datasets: [{
                    label: 'Current Values',
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    update(data) {
        if (!data) return;
        this.updateLastActivity();
        
        // Store the data
        this.data = data;
        
        // Update UI
        document.getElementById('lcp').textContent = `LCP: ${data.lcp || 0}ms`;
        document.getElementById('fid').textContent = `FID: ${data.fid || 0}ms`;
        document.getElementById('cls').textContent = `CLS: ${data.cls || 0}`;

        // Update chart - multiply CLS by 100 to make it visible on the chart
        this.chart.data.datasets[0].data = [data.lcp || 0, data.fid || 0, (data.cls || 0) * 100];
        this.chart.update();
    }

    destroy() {
        super.destroy();
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
