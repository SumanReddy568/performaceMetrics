class BasePanel {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.lastUpdateTime = Date.now();
        this.timeoutDuration = options.timeoutDuration || 60000; // 1 minute default
        this.checkActivityInterval = null;
        this.isApiPerformancePanel = containerId === 'apiPerformancePanel'; // Explicitly check for API Performance panel
        
        if (this.isApiPerformancePanel) {
            // Immediately set API panel as coming soon
            this.container.classList.add('panel-coming-soon');
        }
        
        this.startActivityCheck();
    }

    startActivityCheck() {
        this.checkActivityInterval = setInterval(() => {
            const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
            if (timeSinceLastUpdate > this.timeoutDuration) {
                this.setDisabled(true);
            }
        }, 5000); // Check every 5 seconds
    }

    setDisabled(disabled) {
        if (this.isApiPerformancePanel) {
            // Don't modify API panel state
            return;
        }

        if (disabled) {
            this.container.classList.remove('panel-coming-soon');
            this.container.classList.add('panel-no-data');
        } else {
            this.container.classList.remove('panel-no-data');
        }
    }

    updateLastActivity() {
        this.lastUpdateTime = Date.now();
        this.setDisabled(false);
    }

    destroy() {
        if (this.checkActivityInterval) {
            clearInterval(this.checkActivityInterval);
        }
    }
}
