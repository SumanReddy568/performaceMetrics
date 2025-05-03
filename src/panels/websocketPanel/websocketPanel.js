class WebsocketPanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.data = [];
        this.maxDataPoints = 50;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>WebSocket Activity</h3>
                <div class="websocket-stats">
                    <span id="activeConnections">Active: 0</span>
                    <span id="messageRate">Msg/s: 0</span>
                    <span id="byteRate">KB/s: 0</span>
                </div>
            </div>
            <div class="chart-container">
                <canvas></canvas>
            </div>
            <div class="connection-list">
                <table>
                    <thead>
                        <tr>
                            <th>URL</th>
                            <th>Status</th>
                            <th>Messages</th>
                            <th>Data (KB)</th>
                        </tr>
                    </thead>
                    <tbody id="wsConnections"></tbody>
                </table>
            </div>
        `;

        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Messages/s',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    update(data) {
        if (!data) {
            console.warn('WebsocketPanel received no data');
            super.setDisabled(true);
            document.getElementById('wsConnections').innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center;">No WebSocket connections available</td>
                </tr>
            `;
            return;
        }

        console.log('WebsocketPanel update called with data:', data); // Debugging log

        const connections = Array.isArray(data.connections) ? data.connections : [];
        if (!Array.isArray(data.connections)) {
            console.error('WebsocketPanel: "connections" is not an array or is missing in the data:', data);
        }

        if (connections.length === 0) {
            console.warn('WebsocketPanel: No active WebSocket connections found.');
            super.setDisabled(true);
            document.getElementById('wsConnections').innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center;">No WebSocket connections available</td>
                </tr>
            `;
            return;
        }

        this.updateLastActivity();

        // Update stats
        const activeConnections = connections.filter(c => c.status === 'open').length;
        const totalMessages = connections.reduce((sum, c) => sum + (c.messagesReceived || 0) + (c.messagesSent || 0), 0);
        const totalBytes = connections.reduce((sum, c) => sum + (c.bytesReceived || 0) + (c.bytesSent || 0), 0);

        document.getElementById('activeConnections').textContent = `Active: ${activeConnections}`;
        document.getElementById('messageRate').textContent = `Messages: ${totalMessages}`;
        document.getElementById('byteRate').textContent = `Data: ${(totalBytes / 1024).toFixed(2)} KB`;

        // Update chart
        this.chart.data.labels = connections.map(conn => new URL(conn.url).hostname);
        this.chart.data.datasets[0].data = connections.map(conn => (conn.messagesReceived || 0) + (conn.messagesSent || 0));
        this.chart.update();

        // Update table
        const tbody = document.getElementById('wsConnections');
        if (connections.length > 0) {
            tbody.innerHTML = connections.map(conn => `
                <tr>
                    <td title="${conn.url}">${new URL(conn.url).hostname}</td>
                    <td>${conn.status}</td>
                    <td>Rx: ${conn.messagesReceived || 0} / Tx: ${conn.messagesSent || 0}</td>
                    <td>${((conn.bytesReceived + conn.bytesSent) / 1024).toFixed(2)} KB</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4">No WebSocket connections</td></tr>';
        }
    }

    destroy() {
        super.destroy();
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
