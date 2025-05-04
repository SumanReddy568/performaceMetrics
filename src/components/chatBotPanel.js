class ChatBotPanel {
  constructor(containerId, metricsProvider) {
    this.container = document.getElementById(containerId);
    this.chatBot = new PerformanceMetricsChatBot(metricsProvider);
    this.init();
  }

  init() {
    // Create chat button with a more visible icon
    const button = document.createElement('button');
    button.className = 'floating-chat-button';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>`;
    this.container.appendChild(button);

    // Create chat popup
    const popup = document.createElement('div');
    popup.className = 'chat-popup';
    popup.innerHTML = `
      <div class="chat-popup-header">
        <span class="chat-popup-title">Performance Assistant</span>
        <button class="chat-popup-close">&times;</button>
      </div>
      <div class="chat-popup-messages"></div>
      <div class="chat-popup-suggestions"></div>
      <div class="chat-popup-input-container">
        <input type="text" class="chat-popup-input" placeholder="Ask about performance metrics...">
        <button class="chat-popup-send">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;
    this.container.appendChild(popup);

    // Add event listeners
    button.addEventListener('click', () => {
      popup.classList.toggle('open');
      button.classList.toggle('active');
      if (popup.classList.contains('open')) {
        this.showDefaultSuggestions();
      }
    });

    popup.querySelector('.chat-popup-close').addEventListener('click', () => {
      popup.classList.remove('open');
      button.classList.remove('active');
    });

    const input = popup.querySelector('.chat-popup-input');
    const send = popup.querySelector('.chat-popup-send');

    const sendMessage = async () => {
      const message = input.value.trim();
      if (message) {
        this.addMessage(message, 'user');
        input.value = '';
        this.showThinking();
        const response = await this.chatBot.processQuestion(message);
        this.removeThinking();
        this.handleResponse(response);
      }
    };

    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    send.addEventListener('click', sendMessage);
  }

  addMessage(text, type) {
    const messages = this.container.querySelector('.chat-popup-messages');
    const message = document.createElement('div');
    message.className = `chat-message ${type}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  showThinking() {
    const messages = this.container.querySelector('.chat-popup-messages');
    const thinking = document.createElement('div');
    thinking.className = 'chat-message bot thinking';
    thinking.innerHTML = '<div class="thinking-dots"><span></span><span></span><span></span></div>';
    messages.appendChild(thinking);
    messages.scrollTop = messages.scrollHeight;
  }

  removeThinking() {
    const thinking = this.container.querySelector('.thinking');
    if (thinking) thinking.remove();
  }

  handleResponse(response) {
    if (typeof response === 'object') {
      if (response.type === 'metrics') {
        this.addMessage(response.message, 'bot metrics');
        if (response.data) {
          this.showMetricsVisual(response.data);
        }
        // Show relevant follow-up questions based on metric type
        const followUps = this.chatBot.followUpQuestions[response.metricType] || this.getDefaultFollowUps();
        this.showSuggestions(followUps);
      } else if (response.type === 'suggestions') {
        this.addMessage(response.message, 'bot');
        this.showSuggestions(response.suggestions);
      }
    } else {
      this.addMessage(response, 'bot');
      this.showSuggestions(this.getDefaultFollowUps());
    }
  }

  getDefaultFollowUps() {
    return [
      "Check CPU usage",
      "Memory consumption",
      "Network activity",
      "Web Vitals status"
    ];
  }

  showFollowUpSuggestions(type, data) {
    let followUps = [];
    
    // Add general follow-ups
    followUps.push("Show me all metrics");
    followUps.push("Help");

    // Add context-specific follow-ups
    switch (type) {
      case 'metrics':
        if (data.current !== undefined) {
          followUps.push("Show historical data");
          followUps.push("Compare with average");
        }
        if (data.used !== undefined) {
          followUps.push("Show usage trend");
          followUps.push("Check for memory leaks");
        }
        if (data.count !== undefined) {
          followUps.push("Show detailed breakdown");
          followUps.push("View timeline");
        }
        break;
    }

    // Always add some relevant cross-metric questions
    followUps.push("How does this affect performance?");
    followUps.push("What are the recommended values?");
    
    this.showSuggestions(followUps);
  }

  showMetricsVisual(data) {
    const visualContainer = document.createElement('div');
    visualContainer.className = 'metrics-visual';
    
    // Create simple bar or visual representation if needed
    if (typeof data.current === 'number') {
      const bar = document.createElement('div');
      bar.className = 'metric-bar';
      bar.style.width = `${Math.min(data.current, 100)}%`;
      bar.setAttribute('title', `Current: ${data.current.toFixed(1)}%`);
      visualContainer.appendChild(bar);
    }

    const messages = this.container.querySelector('.chat-popup-messages');
    messages.appendChild(visualContainer);
    messages.scrollTop = messages.scrollHeight;
  }

  showDefaultSuggestions() {
    // Get all questions from chatBot
    const suggestions = this.chatBot.defaultQuestions;
    this.showSuggestions(suggestions);
    
    // Add initial welcome message
    this.addMessage("Welcome! I can help you with performance metrics. Click on any question or type your own.", 'bot');
  }

  showSuggestions(suggestions) {
    const container = this.container.querySelector('.chat-popup-suggestions');
    container.innerHTML = '';
    suggestions.forEach(suggestion => {
      const pill = document.createElement('button');
      pill.className = 'suggestion-pill';
      pill.textContent = suggestion;
      pill.addEventListener('click', () => {
        const input = this.container.querySelector('.chat-popup-input');
        input.value = suggestion;
        input.focus();
      });
      container.appendChild(pill);
    });
  }
}
