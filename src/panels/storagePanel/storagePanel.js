class StoragePanel extends BasePanel {
    constructor(containerId) {
        super(containerId);
        this.data = [];
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="panel-header">
                <h3>Storage Usage</h3>
                <div class="storage-stats">
                    <span id="totalStorage">Total: 0 KB</span>
                    <span id="quotaUsage">Quota: 0%</span>
                </div>
            </div>
            <div class="chart-container">
                <canvas></canvas>
            </div>
            <div class="storage-details">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Items</th>
                            <th>Size</th>
                            <th>Usage</th>
                        </tr>
                    </thead>
                    <tbody id="storageList"></tbody>
                </table>
            </div>
        `;

        const ctx = this.container.querySelector('canvas').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['LocalStorage', 'SessionStorage', 'IndexedDB', 'Cache Storage'],
                datasets: [{
                    data: [0, 0, 0, 0],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)'
                    ]
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
        this.updateLastActivity();

        // Calculate real total (Managed + Local + Session)
        const realTotal = (data.localStorage || 0) +
            (data.sessionStorage || 0) +
            (data.indexedDB || 0) +
            (data.cacheStorage || 0);

        const totalKB = (realTotal / 1024).toFixed(2);

        // Quota only applies to managed storage (IDB + Cache)
        const managedTotal = (data.indexedDB || 0) + (data.cacheStorage || 0);
        const quotaPercent = data.quota > 0 ? ((managedTotal / data.quota) * 100).toFixed(1) : 0;

        document.getElementById('totalStorage').textContent = `Total: ${totalKB} KB`;
        document.getElementById('quotaUsage').textContent = `Quota (Managed): ${quotaPercent}%`;

        // Update chart data (sizes in KB)
        this.chart.data.datasets[0].data = [
            (data.localStorage || 0) / 1024,
            (data.sessionStorage || 0) / 1024,
            (data.indexedDB || 0) / 1024,
            (data.cacheStorage || 0) / 1024
        ];
        this.chart.update();

        // Update details table
        const tbody = document.getElementById('storageList');
        tbody.innerHTML = Object.entries(data.details || {}).map(([type, info]) => {
            const sizeKB = (info.size / 1024).toFixed(2);
            let usageDisplay = '0%';

            // Local/Session storage usually have a fixed 5MB-10MB limit per origin, unrelated to global quota
            if (type.toLowerCase().includes('storage') && !type.toLowerCase().includes('cache')) {
                // Assuming ~5MB limit for typical browsers
                const limit = 5 * 1024 * 1024;
                const percent = ((info.size / limit) * 100).toFixed(1);
                usageDisplay = `${percent}% (of ~5MB)`;
            } else {
                // IDB and Cache count towards global quota
                const percent = data.quota > 0 ? ((info.size / data.quota) * 100).toFixed(1) : 0;
                usageDisplay = `${percent}%`;
            }

            return `
                <tr>
                    <td>${type}</td>
                    <td>${info.items || 0}</td>
                    <td>${sizeKB} KB</td>
                    <td>${usageDisplay}</td>
                </tr>
            `;
        }).join('');
    }

    destroy() {
        super.destroy();
        if (this.chart) {
            this.chart.destroy();
        }
    }
}
