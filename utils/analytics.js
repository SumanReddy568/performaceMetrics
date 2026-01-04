const TRACK_URL = "https://multi-product-analytics.sumanreddy568.workers.dev/";

// Get user info from storage
let userInfo = {};
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
        const storageData = await new Promise((resolve) => {
            chrome.storage.local.get(['user_id', 'user_email', 'user_hash'], resolve);
        });
        userInfo = {
            userId: storageData.user_id || null,
            email: storageData.user_email || null,
            userHash: storageData.user_hash || null
        };
    } catch (e) {
        console.warn('Failed to fetch user info for analytics:', e);
    }
}

export async function track(eventName, options = {}) {
    try {
        const systemInfo = typeof window !== 'undefined' ? {
            ua: navigator.userAgent,
            lang: navigator.language,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        } : { ua: 'service-worker' };

        const response = await fetch(TRACK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                product: "performance_metrics",
                event: eventName,
                extensionId: chrome?.runtime?.id || 'web_user',
                page: options.page || (typeof window !== 'undefined' ? window.location.href : 'background'),
                feature: options.feature || null,
                version: chrome?.runtime?.getManifest?.()?.version || '1.0.0',
                metadata: {
                    system: systemInfo,
                    ...options.meta,
                    ...userInfo
                }
            })
        });
        return await response.json();
    } catch (err) {
        console.error("Analytics failed", err);
    }
}

export function trackPerformanceMetrics(meta = {}) {
    return track("performance_metrics_active_event", {
        feature: "performance_metrics_active",
        meta
    });
}

export function trackPageScan(pageUrl, meta = {}) {
    return track("performance_metrics_page_scan", {
        feature: "performance_metrics_page_scan",
        page: pageUrl,
        meta
    });
}