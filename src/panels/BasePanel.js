class BasePanel {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID ${containerId} not found`);
            return;
        }

        this.lastUpdateTime = 0; // Start with 0 to force initial timeout
        this.timeoutDuration = options.timeoutDuration || 15000; // 15 seconds default
        this.checkActivityInterval = null;
        this.containerId = containerId; // Save ID for debugging
        this.hasReceivedData = false;

        // Initialize with "no data" state
        this.setDisabled(true);



        this.startActivityCheck();

        // Force check panel state after initialization
        setTimeout(() => {
            if (!this.hasReceivedData) {
                this.setDisabled(true);
                console.log(`Panel ${this.containerId} forced to disabled state after initialization`);
            }
        }, 2000);

        console.log(`Panel ${containerId} initialized with timeout: ${this.timeoutDuration}ms`);
    }

    startActivityCheck() {
        // Clear any existing interval first
        if (this.checkActivityInterval) {
            clearInterval(this.checkActivityInterval);
        }

        // Check more frequently (every 2 seconds)
        this.checkActivityInterval = setInterval(() => {
            const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;

            if (timeSinceLastUpdate > this.timeoutDuration) {
                console.log(`Panel ${this.containerId} timed out after ${timeSinceLastUpdate}ms - disabling`);
                this.setDisabled(true);
            }
        }, 2000); // Check every 2 seconds
    }

    setDisabled(disabled) {


        try {
            if (disabled) {
                // Apply all class changes atomically
                this.container.classList.remove('panel-active');
                this.container.classList.remove('panel-coming-soon');
                this.container.classList.add('panel-no-data');

                // Add a visible timer indicator
                let timerEl = this.container.querySelector('.panel-timeout-indicator');
                if (!timerEl) {
                    timerEl = document.createElement('div');
                    timerEl.className = 'panel-timeout-indicator';
                    timerEl.innerHTML = '<span>No data for 15s</span>';
                    this.container.appendChild(timerEl);
                }

                console.log(`Panel ${this.containerId} marked as disabled`);
            } else {
                // Remove disabled state
                this.container.classList.remove('panel-no-data');
                this.container.classList.add('panel-active');

                // Remove timer indicator if it exists
                const timerEl = this.container.querySelector('.panel-timeout-indicator');
                if (timerEl) {
                    timerEl.remove();
                }

                console.log(`Panel ${this.containerId} marked as enabled`);
            }
        } catch (e) {
            console.error(`Error updating disabled state for ${this.containerId}:`, e);
        }
    }

    updateLastActivity() {
        const previousTime = this.lastUpdateTime;
        this.lastUpdateTime = Date.now();
        this.hasReceivedData = true;

        const timeDiff = this.lastUpdateTime - previousTime;
        console.log(`Panel ${this.containerId} activity updated after ${timeDiff}ms`);

        // Only update visual state
        this.setDisabled(false);
    }

    destroy() {
        if (this.checkActivityInterval) {
            clearInterval(this.checkActivityInterval);
            console.log(`Panel ${this.containerId} destroyed, interval cleared`);
        }
    }
}
