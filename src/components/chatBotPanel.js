class ChatBotPanel {
  constructor(containerId, metricsProvider) {
    console.log("Initializing ChatBotPanel..."); // Debug log
    this.container = document.getElementById(containerId) || document.body;
    this.metricsProvider = metricsProvider;
    this.chatBot = new PerformanceMetricsChatBot(metricsProvider);
    this.messages = [];
    this.isOpen = false;
    this.init();
    console.log("ChatBotPanel initialized."); // Debug log
  }

  init() {
    // Create the floating chat button
    const chatButton = document.createElement('div');
    chatButton.className = 'floating-chat-button';
    chatButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    `;
    
    // Create the chat popup container
    const chatPopup = document.createElement('div');
    chatPopup.className = 'chat-popup';
    chatPopup.innerHTML = `
      <div class="chat-popup-header">
        <span class="chat-popup-title">Performance Assistant</span>
        <button class="chat-popup-close">&times;</button>
      </div>
      <div class="chat-popup-messages"></div>
      <div class="chat-popup-input-container">
        <input type="text" class="chat-popup-input" placeholder="Ask about your performance metrics...">
        <button class="chat-popup-send">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2">
            <path d="M22 2L11 13"></path>
            <path d="M22 2L15 22L11 13L2 9L22 2z"></path>
          </svg>
        </button>
      </div>
      <div class="chat-popup-suggestions"></div>
    `;
    
    this.container.appendChild(chatButton);
    this.container.appendChild(chatPopup);
    
    // Add event listeners
    chatButton.addEventListener('click', () => this.toggleChat());
    
    const closeButton = chatPopup.querySelector('.chat-popup-close');
    closeButton.addEventListener('click', () => this.toggleChat(false));
    
    const inputField = chatPopup.querySelector('.chat-popup-input');
    const sendButton = chatPopup.querySelector('.chat-popup-send');
    
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleUserInput(inputField.value);
        inputField.value = '';
      }
    });
    
    sendButton.addEventListener('click', () => {
      this.handleUserInput(inputField.value);
      inputField.value = '';
    });
    
    this.messagesContainer = chatPopup.querySelector('.chat-popup-messages');
    this.suggestionsContainer = chatPopup.querySelector('.chat-popup-suggestions');
    
    // Add welcome message
    this.addMessage({
      from: 'bot',
      content: "👋 Hello! I can help you understand your performance metrics. Ask me about CPU usage, memory, network, and more.",
      type: 'text'
    });
    
    // Add initial suggestions
    this.updateSuggestions([
      "What is my average CPU usage?",
      "How much memory am I using?",
      "What are my web vitals scores?",
      "Help"
    ]);
  }
  
  toggleChat(forcedState) {
    const newState = forcedState !== undefined ? forcedState : !this.isOpen;
    this.isOpen = newState;
    
    const chatPopup = this.container.querySelector('.chat-popup');
    const chatButton = this.container.querySelector('.floating-chat-button');
    
    if (this.isOpen) {
      chatPopup.classList.add('open');
      chatButton.classList.add('active');
      
      // Focus the input field when opened
      setTimeout(() => {
        const input = chatPopup.querySelector('.chat-popup-input');
        if (input) input.focus();
      }, 300);
      
      // Scroll to bottom of messages
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    } else {
      chatPopup.classList.remove('open');
      chatButton.classList.remove('active');
    }
  }
  
  async handleUserInput(text) {
    if (!text.trim()) return;

    console.log("User input received:", text); // Debug log

    this.addMessage({ from: "user", content: text, type: "text" });

    const thinkingId = this.addMessage({ from: "bot", content: "...", type: "thinking" });

    try {
      console.log("Passing question to chatbot:", text); // Debug log
      const response = await this.chatBot.processQuestion(text);
      console.log("Chatbot response:", response); // Debug log

      this.removeMessage(thinkingId);

      if (typeof response === "string") {
        this.addMessage({ from: "bot", content: response, type: "text" });
      } else {
        // Handle structured responses
        switch (response.type) {
          case "metric":
            this.addMessage({ from: "bot", content: response.message, type: "metric" });
            break;
          case "list":
            this.addMessage({ from: "bot", content: response.message, type: "list", items: response.items });
            break;
          case "table":
            this.addMessage({ from: "bot", content: response.message, type: "table", headers: response.headers, data: response.data });
            break;
          case "help":
            this.addMessage({ from: "bot", content: response.message, type: "text" });
            this.updateSuggestions(response.options);
            break;
          default:
            this.addMessage({ from: "bot", content: "I'm not sure how to display this information.", type: "text" });
        }
      }
    } catch (error) {
      console.error("Error handling user input:", error);
      this.removeMessage(thinkingId);
      this.addMessage({ from: "bot", content: "An error occurred. Please try again.", type: "text" });
    }

    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }
  
  addMessage(message) {
    const id = Date.now(); // Simple unique ID
    message.id = id;
    this.messages.push(message);
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.from}`;
    messageEl.dataset.id = id;
    
    switch (message.type) {
      case 'thinking':
        messageEl.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div>`;
        break;
        
      case 'text':
        messageEl.innerText = message.content;
        break;
        
      case 'metric':
        messageEl.innerHTML = `<div class="metric-message">${message.content}</div>`;
        break;
        
      case 'table':
        let tableHtml = `<div class="message-label">${message.content}</div><table>`;
        // Add headers
        tableHtml += `<tr>${message.headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
        // Add rows
        message.data.forEach(row => {
          tableHtml += `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`;
        });
        tableHtml += `</table>`;
        messageEl.innerHTML = tableHtml;
        break;
        
      case 'list':
        let listHtml = `<div class="message-label">${message.content}</div><ul>`;
        message.items.forEach(item => {
          listHtml += `<li>${item}</li>`;
        });
        listHtml += `</ul>`;
        messageEl.innerHTML = listHtml;
        break;
    }
    
    this.messagesContainer.appendChild(messageEl);
    return id;
  }
  
  removeMessage(id) {
    this.messages = this.messages.filter(m => m.id !== id);
    const messageEl = this.messagesContainer.querySelector(`.chat-message[data-id="${id}"]`);
    if (messageEl) {
      messageEl.remove();
    }
  }
  
  updateSuggestions(suggestions) {
    this.suggestionsContainer.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const pill = document.createElement('button');
      pill.className = 'suggestion-pill';
      pill.innerText = suggestion;
      pill.addEventListener('click', () => {
        const inputField = this.container.querySelector('.chat-popup-input');
        inputField.value = suggestion;
        this.handleUserInput(suggestion);
        inputField.value = '';
      });
      this.suggestionsContainer.appendChild(pill);
    });
  }
}
