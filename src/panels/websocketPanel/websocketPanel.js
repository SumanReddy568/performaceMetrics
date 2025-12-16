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
        if (!data) return;

        // Handle case where data might be wrapped in an array (from historicalData logic)
        const snapshot = Array.isArray(data) ? data[data.length - 1] : data;
        if (!snapshot) return;

        this.updateLastActivity();

        const connections = Array.isArray(snapshot.connections) ? snapshot.connections : [];
        const timestamp = snapshot.timestamp || Date.now();

        // Calculate totals
        const activeConnections = connections.filter(c => c.status === 'open').length;
        const totalMessages = connections.reduce((sum, c) => sum + (c.messagesReceived || 0) + (c.messagesSent || 0), 0);
        const totalBytes = connections.reduce((sum, c) => sum + (c.bytesReceived || 0) + (c.bytesSent || 0), 0);

        // Calculate rates based on previous data
        let msgRate = 0;
        let byteRate = 0;

        if (this.lastSnapshot) {
            const timeDiff = (timestamp - this.lastSnapshot.timestamp) / 1000; // in seconds
            if (timeDiff > 0) {
                const msgDiff = totalMessages - this.lastSnapshot.totalMessages;
                const byteDiff = totalBytes - this.lastSnapshot.totalBytes;

                msgRate = Math.max(0, msgDiff / timeDiff);
                byteRate = Math.max(0, byteDiff / timeDiff);
            }
        }

        // Store current state for next rate calculation
        this.lastSnapshot = {
            timestamp,
            totalMessages,
            totalBytes
        };

        // Store history for chart
        this.data.push({
            timestamp,
            msgRate,
            byteRate
        });

        if (this.data.length > this.maxDataPoints) {
            this.data.shift();
        }

        // Update Header Stats (show cumulative totals AND current rates)
        document.getElementById('activeConnections').textContent = `Active: ${activeConnections}`;
        document.getElementById('messageRate').textContent = `Msg/s: ${msgRate.toFixed(1)}`;
        document.getElementById('byteRate').textContent = `KB/s: ${(byteRate / 1024).toFixed(2)}`;

        // Update chart (Time Series of Message Rate)
        this.chart.data.labels = this.data.map((_, i) => i === this.data.length - 1 ? 'Now' : `-${this.data.length - 1 - i}s`);
        this.chart.data.datasets[0].data = this.data.map(d => d.msgRate);
        this.chart.update('none'); // 'none' mode for better performance

        // Update table
        const tbody = document.getElementById('wsConnections');
        if (connections.length > 0) {
            super.setDisabled(false);
            tbody.innerHTML = connections.map(conn => {
                let hostname = 'Unknown';
                try {
                    hostname = new URL(conn.url).hostname;
                } catch (e) { hostname = conn.url; }

                return `
                <tr>
                    <td title="${conn.url}">${hostname}</td>
                    <td><span class="status-badge ${conn.status}">${conn.status}</span></td>
                    <td>Rx: ${conn.messagesReceived} / Tx: ${conn.messagesSent}</td>
                    <td>${((conn.bytesReceived + conn.bytesSent) / 1024).toFixed(2)} KB</td>
                </tr>
            `}).join('');
        } else {
            // Keep panel enabled but show empty state in table
            // We don't want to disable the whole panel just because there are no WS connections yet
            super.setDisabled(false);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #888;">No active WebSocket connections</td></tr>';
        }
    }

    destroy() {
        super.destroy();
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
