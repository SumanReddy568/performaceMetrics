class BasePanel {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID ${containerId} not found`);
            return;
        }

        this.lastUpdateTime = Date.now();
        this.timeoutDuration = options.timeoutDuration || 60000; // Increase to 60 seconds default
        this.checkActivityInterval = null;
        this.containerId = containerId;
        this.hasReceivedData = false;

        // Start checking for activity
        this.startActivityCheck();

        console.log(`Panel ${containerId} initialized. Timeout: ${this.timeoutDuration}ms`);
    }

    startActivityCheck() {
        if (this.checkActivityInterval) {
            clearInterval(this.checkActivityInterval);
        }

        this.checkActivityInterval = setInterval(() => {
            const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;

            // Only disable if we've NEVER received data and timed out, 
            // OR if it's been an extremely long time (3x timeout)
            if (!this.hasReceivedData && timeSinceLastUpdate > 15000) {
                console.log(`Panel ${this.containerId} has not received any data yet (15s) - marking as no-data`);
                this.setDisabled(true);
            } else if (this.hasReceivedData && timeSinceLastUpdate > this.timeoutDuration) {
                // If we HAD data but it stopped, we don't necessarily want to hide it, 
                // but we might want to warn. For now, let's just keep it active.
                console.warn(`Panel ${this.containerId} data is stale (${timeSinceLastUpdate}ms)`);
                // We keep it enabled so the user can still see previous data
                // this.setDisabled(true); // Don't disable if we have data
            }
        }, 5000); // Check every 5 seconds instead of 2
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
