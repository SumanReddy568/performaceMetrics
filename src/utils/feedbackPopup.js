(function () {
    'use strict';

    const STORAGE_KEY = 'performanceMetrics_feedbackStatus';

    // Check if user has already interacted with the feedback popup
    function checkFeedbackStatus() {
        return new Promise((resolve) => {
            chrome.storage.local.get([STORAGE_KEY], (result) => {
                resolve(result[STORAGE_KEY] || { hasRated: false, remindLater: false });
            });
        });
    }

    // Save feedback status
    function saveFeedbackStatus(status) {
        chrome.storage.local.set({ [STORAGE_KEY]: status });
    }

    // Show the feedback modal
    function showFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Hide the feedback modal
    function hideFeedbackModal() {
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Initialize the feedback popup
    async function initFeedbackPopup() {
        const status = await checkFeedbackStatus();

        // Show popup if:
        // 1. User hasn't rated yet AND
        // 2. Either first time (never shown) OR user clicked "Remind Later"
        if (!status.hasRated) {
            // Wait 2 seconds before showing the popup
            setTimeout(() => {
                showFeedbackModal();
            }, 2000);
        }

        // Event listeners
        const closeBtn = document.getElementById('closeFeedbackModal');
        const remindLaterBtn = document.getElementById('remindLater');
        const rateUsBtn = document.getElementById('rateUs');
        const tryAiToolBtn = document.getElementById('tryAiTool');

        // Close button (X) - will show popup again on next visit
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideFeedbackModal();
                // Don't save anything, so popup shows on next visit
            });
        }

        // Remind later button - will show popup on EVERY visit until rated
        if (remindLaterBtn) {
            remindLaterBtn.addEventListener('click', () => {
                saveFeedbackStatus({
                    hasRated: false,
                    remindLater: true
                });
                hideFeedbackModal();
            });
        }

        // Rate us button - mark as rated, won't show again ever
        if (rateUsBtn) {
            rateUsBtn.addEventListener('click', () => {
                saveFeedbackStatus({
                    hasRated: true,
                    remindLater: false
                });
                hideFeedbackModal();
            });
        }

        // Try AI tool button - just close the modal, will show again on next visit
        if (tryAiToolBtn) {
            tryAiToolBtn.addEventListener('click', () => {
                hideFeedbackModal();
            });
        }

        // Close on overlay click - will show again on next visit
        const modal = document.getElementById('feedbackModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    hideFeedbackModal();
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFeedbackPopup);
    } else {
        initFeedbackPopup();
    }
})();
