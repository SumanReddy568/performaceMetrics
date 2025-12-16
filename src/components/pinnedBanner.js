/**
 * Pinned Banner Component
 * Displays CPU and Memory percentages in a draggable, pinnable banner
 */
class PinnedBanner {
  constructor() {
    this.banner = null;
    this.isPinned = false;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.position = { x: 20, y: 20 };
    this.updateInterval = null;
    this.cpuUsage = 0;
    this.memoryUsage = 0;
    
    // Init will be called asynchronously
    this.init().catch(err => console.error('Error initializing banner:', err));
  }

  async init() {
    // Check if banner already exists
    if (document.getElementById('performance-metrics-banner')) {
      return;
    }

    // Load saved state
    await this.loadState();

    // Check if banner should be visible
    try {
      const result = await chrome.storage.local.get(['bannerVisible']);
      if (result.bannerVisible === false) {
        // Don't create banner if it was hidden
        return;
      }
    } catch (e) {
      // If storage fails, show banner by default
    }

    // Create banner
    this.createBanner();

    // Start updating metrics
    this.startUpdating();

    // Listen for storage changes (for pin state)
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.bannerPinned) {
        this.isPinned = changes.bannerPinned.newValue;
        this.updatePinButton();
      }
      if (changes.bannerPosition) {
        this.position = changes.bannerPosition.newValue;
        this.updatePosition();
      }
      if (changes.bannerVisible !== undefined) {
        if (changes.bannerVisible.newValue) {
          this.show();
        } else {
          this.hide();
        }
      }
    });

    // Listen for toggle messages from devtools
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'toggle-banner') {
        if (message.visible) {
          this.show();
        } else {
          this.hide();
        }
        sendResponse({ success: true });
      }
    });
  }

  createBanner() {
    // Create banner container
    this.banner = document.createElement('div');
    this.banner.id = 'performance-metrics-banner';
    this.banner.className = 'performance-metrics-banner';
    this.banner.style.left = `${this.position.x}px`;
    this.banner.style.top = `${this.position.y}px`;

    // Create header
    const header = document.createElement('div');
    header.className = 'banner-header';
    
    const title = document.createElement('div');
    title.className = 'banner-title';
    title.textContent = 'Performance Monitor';
    
    const controls = document.createElement('div');
    controls.className = 'banner-controls';
    
    // Pin button
    const pinBtn = document.createElement('button');
    pinBtn.className = 'banner-btn';
    pinBtn.id = 'banner-pin-btn';
    pinBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M16 12V4h1a2 2 0 0 1 2 2v6M16 12H8m8 0v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4M16 12l-4-4M8 12l4-4"/>
      </svg>
    `;
    pinBtn.title = 'Pin/Unpin Banner';
    pinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePin();
    });
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'banner-btn';
    closeBtn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
    `;
    closeBtn.title = 'Hide Banner';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });
    
    controls.appendChild(pinBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);
    
    // Make header draggable
    header.addEventListener('mousedown', (e) => this.startDrag(e));
    
    // Create metrics container
    const metrics = document.createElement('div');
    metrics.className = 'banner-metrics';
    
    // CPU metric
    const cpuRow = this.createMetricRow('CPU', 'cpu', 0);
    metrics.appendChild(cpuRow);
    
    // Memory metric
    const memoryRow = this.createMetricRow('Memory', 'memory', 0);
    metrics.appendChild(memoryRow);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'banner-footer';
    footer.textContent = 'Performance Metrics Extension';
    
    // Assemble banner
    this.banner.appendChild(header);
    this.banner.appendChild(metrics);
    this.banner.appendChild(footer);
    
    // Add to page
    document.body.appendChild(this.banner);
    
    // Update pin button state
    this.updatePinButton();
    
    // Add global mouse events for dragging
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('mouseup', () => this.stopDrag());
  }

  createMetricRow(label, type, value) {
    const row = document.createElement('div');
    row.className = 'metric-row';
    row.dataset.metricType = type;
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'metric-label';
    
    const icon = document.createElement('div');
    icon.className = `metric-icon ${type}`;
    
    const labelText = document.createElement('span');
    labelText.textContent = label;
    
    labelDiv.appendChild(icon);
    labelDiv.appendChild(labelText);
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'metric-value';
    valueDiv.id = `banner-${type}-value`;
    valueDiv.textContent = '--%';
    
    const barContainer = document.createElement('div');
    barContainer.className = 'metric-bar';
    
    const barFill = document.createElement('div');
    barFill.className = `metric-bar-fill ${type}`;
    barFill.id = `banner-${type}-bar`;
    barFill.style.width = '0%';
    
    barContainer.appendChild(barFill);
    
    row.appendChild(labelDiv);
    row.appendChild(valueDiv);
    row.appendChild(barContainer);
    
    return row;
  }

  updateMetric(type, value) {
    const valueEl = document.getElementById(`banner-${type}-value`);
    const barEl = document.getElementById(`banner-${type}-bar`);
    
    if (!valueEl || !barEl) return;
    
    valueEl.textContent = `${Math.round(value)}%`;
    barEl.style.width = `${value}%`;
    
    // Update class based on usage level
    barEl.classList.remove('high', 'medium');
    if (value > 90) {
      barEl.classList.add('high');
    } else if (value > 70) {
      barEl.classList.add('medium');
    }
    
    // Store values
    if (type === 'cpu') {
      this.cpuUsage = value;
    } else if (type === 'memory') {
      this.memoryUsage = value;
    }
  }

  startDrag(e) {
    if (e.target.closest('.banner-btn')) {
      return; // Don't drag if clicking buttons
    }
    
    this.isDragging = true;
    this.banner.classList.add('dragging');
    
    const rect = this.banner.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    e.preventDefault();
  }

  onDrag(e) {
    if (!this.isDragging) return;
    
    const newX = e.clientX - this.dragOffset.x;
    const newY = e.clientY - this.dragOffset.y;
    
    // Constrain to viewport
    const maxX = window.innerWidth - this.banner.offsetWidth;
    const maxY = window.innerHeight - this.banner.offsetHeight;
    
    this.position.x = Math.max(0, Math.min(newX, maxX));
    this.position.y = Math.max(0, Math.min(newY, maxY));
    
    this.banner.style.left = `${this.position.x}px`;
    this.banner.style.top = `${this.position.y}px`;
  }

  stopDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      this.banner.classList.remove('dragging');
      this.savePosition();
    }
  }

  togglePin() {
    this.isPinned = !this.isPinned;
    this.saveState();
    this.updatePinButton();
  }

  updatePinButton() {
    const pinBtn = document.getElementById('banner-pin-btn');
    if (pinBtn) {
      if (this.isPinned) {
        pinBtn.classList.add('pinned');
        pinBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 12V4h1a2 2 0 0 1 2 2v6M16 12H8m8 0v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4M16 12l-4-4M8 12l4-4"/>
          </svg>
        `;
      } else {
        pinBtn.classList.remove('pinned');
        pinBtn.innerHTML = `
          <svg viewBox="0 0 24 24">
            <path d="M16 12V4h1a2 2 0 0 1 2 2v6M16 12H8m8 0v4a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-4M16 12l-4-4M8 12l4-4"/>
          </svg>
        `;
      }
    }
  }

  hide() {
    if (this.banner) {
      this.banner.classList.add('hidden');
      chrome.storage.local.set({ bannerVisible: false });
    }
  }

  show() {
    if (!this.banner) {
      // Banner doesn't exist, create it
      this.createBanner();
      this.startUpdating();
    } else {
      this.banner.classList.remove('hidden');
    }
    chrome.storage.local.set({ bannerVisible: true });
  }

  updatePosition() {
    if (this.banner) {
      this.banner.style.left = `${this.position.x}px`;
      this.banner.style.top = `${this.position.y}px`;
    }
  }

  async startUpdating() {
    // Request initial data
    this.requestMetrics();
    
    // Update every 2 seconds
    this.updateInterval = setInterval(() => {
      this.requestMetrics();
    }, 2000);
  }

  requestMetrics() {
    // Request system metrics from background script
    chrome.runtime.sendMessage(
      { type: 'get-system-metrics' },
      (response) => {
        if (chrome.runtime.lastError) {
          console.warn('Error getting system metrics:', chrome.runtime.lastError);
          return;
        }
        
        if (response && response.cpu !== undefined && response.memory !== undefined) {
          this.updateMetric('cpu', response.cpu);
          this.updateMetric('memory', response.memory);
        }
      }
    );
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get([
        'bannerPinned',
        'bannerPosition',
        'bannerVisible'
      ]);
      
      if (result.bannerPinned !== undefined) {
        this.isPinned = result.bannerPinned;
      }
      
      if (result.bannerPosition) {
        this.position = result.bannerPosition;
      }
      
      if (result.bannerVisible === false) {
        // Banner was hidden, don't show it
        return;
      }
    } catch (e) {
      console.warn('Error loading banner state:', e);
    }
  }

  async saveState() {
    try {
      await chrome.storage.local.set({
        bannerPinned: this.isPinned,
        bannerPosition: this.position
      });
    } catch (e) {
      console.warn('Error saving banner state:', e);
    }
  }

  savePosition() {
    this.saveState();
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.banner) {
      this.banner.remove();
    }
  }
}

// Initialize banner when DOM is ready
(async () => {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise(resolve => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }
  
  // Initialize banner (it will check visibility internally)
  window.performanceMetricsBanner = new PinnedBanner();
})();

