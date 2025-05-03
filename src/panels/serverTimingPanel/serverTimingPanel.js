class ServerTimingPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.data = [];
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>Server Timing</h3>
            </div>
            <div style="display: flex; flex-direction: column; height: calc(100% - 40px);">
                <div class="server-timing-list">
                    <table>
                        <thead>
                            <tr>
                                <th>Metric</th>
                                <th>Duration</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody id="serverTimingList"></tbody>
                    </table>
                </div>
                <div class="chart-container" style="flex: 1; margin-top: 8px;">
                    <canvas></canvas>
                </div>
            </div>
        `;

        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Server Timing (ms)',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    update(data) {
        if (!data || !data.metrics) {
            console.warn('ServerTimingPanel received invalid or no data:', data); // Debugging log
            super.setDisabled(true);
            document.getElementById('serverTimingList').innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center;">No server timing metrics available</td>
                </tr>
            `;
            return;
        }

        console.log('ServerTimingPanel update called with data:', data); // Debugging log

        if (!Array.isArray(data.metrics)) {
            console.error('ServerTimingPanel: "metrics" is not an array or is missing in the data:', data);
        }

        if (data.metrics.length === 0) {
            console.warn('ServerTimingPanel: No server timing metrics found.');
            super.setDisabled(true);
            document.getElementById('serverTimingList').innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center;">No server timing metrics available</td>
                </tr>
            `;
            return;
        }

        this.updateLastActivity();

        const tbody = document.getElementById('serverTimingList');
        tbody.innerHTML = data.metrics.map(metric => `
            <tr>
                <td>${metric.name}</td>
                <td>${metric.duration.toFixed(2)}ms</td>
                <td>${metric.description || '-'}</td>
            </tr>
        `).join('');

        this.chart.data.labels = data.metrics.map(m => m.name);
        this.chart.data.datasets[0].data = data.metrics.map(m => m.duration);
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
