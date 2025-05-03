class PerformanceMetricsPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.data = [];
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>Performance Marks & Measures</h3>
            </div>
            <div class="performance-list">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Start Time</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody id="perfList"></tbody>
                </table>
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
                    label: 'Duration (ms)',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.5)'
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
        if (!data || !data.entries) return;
        this.updateLastActivity();

        const tbody = document.getElementById('perfList');
        tbody.innerHTML = data.entries.map(entry => `
            <tr>
                <td>${entry.name}</td>
                <td>${entry.entryType}</td>
                <td>${entry.startTime.toFixed(2)}ms</td>
                <td>${entry.duration.toFixed(2)}ms</td>
            </tr>
        `).join('');

        this.chart.data.labels = data.entries.map(e => e.name);
        this.chart.data.datasets[0].data = data.entries.map(e => e.duration);
        this.chart.update();
    }

    destroy() {
        super.destroy();
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
