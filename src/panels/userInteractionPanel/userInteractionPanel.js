class UserInteractionPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.data = [];
        this.maxDataPoints = 60;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>User Interactions</h3>
                <div class="interaction-stats">
                    <span id="clickCount">Clicks: 0</span>
                    <span id="scrollCount">Scrolls: 0</span>
                    <span id="keyPressCount">Keypresses: 0</span>
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
                        label: 'Clicks',
                        data: [],
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Scrolls',
                        data: [],
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Keypresses',
                        data: [],
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        tension: 0.4,
                        fill: true
                    }
                ]
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
        if (!data) {
            console.warn('UserInteractionPanel: No data received');
            return;
        }
        
        console.log('UserInteractionPanel received data:', data);  // Debug log
        
        this.updateLastActivity();
        
        // Create a new data point with current values
        const newDataPoint = {
            clicks: data.clicks || 0,
            scrolls: data.scrolls || 0,
            keypresses: data.keypresses || 0,
            timestamp: new Date().getTime()
        };
        
        this.data.push(newDataPoint);
        if (this.data.length > this.maxDataPoints) {
            this.data.shift();
        }

        // Update stats display
        document.getElementById('clickCount').textContent = `Clicks: ${data.clicks || 0}`;
        document.getElementById('scrollCount').textContent = `Scrolls: ${data.scrolls || 0}`;
        document.getElementById('keyPressCount').textContent = `Keypresses: ${data.keypresses || 0}`;

        // Update chart
        this.chart.data.labels = this.data.map(() => '');  // Empty labels for cleaner look
        this.chart.data.datasets[0].data = this.data.map(d => d.clicks);
        this.chart.data.datasets[1].data = this.data.map(d => d.scrolls);
        this.chart.data.datasets[2].data = this.data.map(d => d.keypresses);
        this.chart.update('none');
    }

    destroy() {
        super.destroy();
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
}
