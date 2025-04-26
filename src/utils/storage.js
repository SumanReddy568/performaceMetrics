class Storage {
  static async saveMetrics(url, metrics) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({
        [url]: {
          metrics,
          timestamp: Date.now()
        }
      }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  static async getMetrics(url) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(url, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[url]);
        }
      });
    });
  }

  static async clearMetrics(url) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(url, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}
