const TRACK_URL = "https://multi-product-analytics.sumanreddy568.workers.dev/";

// Function to set user info in storage
export async function setUserInfo(userId, email, userHash) {
  try {
    // Try chrome storage first (for extension contexts)
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({
        user_id: userId,
        user_email: email,
        user_hash: userHash,
      });
    }
    // Fallback to localStorage for web contexts
    else if (typeof localStorage !== "undefined") {
      localStorage.setItem("user_id", userId);
      localStorage.setItem("user_email", email);
      localStorage.setItem("user_hash", userHash);
    }
  } catch (e) {
    console.warn("Failed to set user info:", e);
  }
}

// Function to get user info from storage
async function getUserInfo() {
  let userInfo = {};

  // Try chrome storage first (for extension contexts)
  if (typeof chrome !== "undefined" && chrome.storage) {
    try {
      const result = await chrome.storage.local.get([
        "user_id",
        "user_email",
        "user_hash",
        // Also check auth keys as fallback
        "auth_token",
      ]);
      userInfo = {
        userId: result.user_id || result.user_email || null,
        email: result.user_email || null,
        userHash: result.user_hash || null,
      };
    } catch (e) {
      console.warn("Failed to fetch user info from chrome storage:", e);
    }
  }
  // Fallback to localStorage for web contexts
  else if (typeof localStorage !== "undefined") {
    try {
      userInfo = {
        userId:
          localStorage.getItem("user_id") ||
          localStorage.getItem("user_email") ||
          null,
        email: localStorage.getItem("user_email") || null,
        userHash: localStorage.getItem("user_hash") || null,
      };
    } catch (e) {
      console.warn("Failed to fetch user info from localStorage:", e);
    }
  }

  return userInfo;
}

export async function track(eventName, options = {}) {
  try {
    const systemInfo =
      typeof window !== "undefined"
        ? {
            ua: navigator.userAgent,
            lang: navigator.language,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        : { ua: "service-worker" };

    // Get fresh user info each time to ensure it's up-to-date
    const userInfo = await getUserInfo();

    const response = await fetch(TRACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "performance_metrics",
        event: eventName,
        extensionId: chrome?.runtime?.id || "web_user",
        page:
          options.page ||
          (typeof window !== "undefined" ? window.location.href : "background"),
        feature: options.feature || null,
        version: chrome?.runtime?.getManifest?.()?.version || "1.0.0",
        metadata: {
          system: systemInfo,
          ...options.meta,
          ...userInfo,
        },
      }),
    });
    return await response.json();
  } catch (err) {
    console.error("Analytics failed", err);
  }
}

export function trackPerformanceMetrics(meta = {}) {
  return track("performance_metrics_active_event", {
    feature: "performance_metrics_active",
    meta,
  });
}

export function trackPageScan(pageUrl, meta = {}) {
  return track("performance_metrics_page_scan", {
    feature: "performance_metrics_page_scan",
    page: pageUrl,
    meta,
  });
}
