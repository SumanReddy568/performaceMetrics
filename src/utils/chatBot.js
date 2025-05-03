class PerformanceMetricsChatBot {
  constructor(metricsProvider) {
    console.log("Initializing PerformanceMetricsChatBot..."); // Debug log
    this.metricsProvider = metricsProvider;
    this.predefinedQuestions = [
      { text: "What is my average CPU usage?", handler: this.getCpuUsage.bind(this) },
      { text: "How much memory am I using?", handler: this.getMemoryUsage.bind(this) },
      { text: "What are my web vitals scores?", handler: this.getWebVitals.bind(this) },
      { text: "Help", handler: this.getHelp.bind(this) }
    ];
    console.log("PerformanceMetricsChatBot initialized."); // Debug log
  }

  async processQuestion(question) {
    console.log("Processing question:", question); // Debug log

    if (!this.metricsProvider || !this.metricsProvider.getSnapshot()) {
      console.warn("No metrics data available."); // Debug log
      return "Metrics data is not available yet. Please wait a few seconds.";
    }

    const normalizedQuestion = question.toLowerCase().trim();
    const matchingQuestion = this.predefinedQuestions.find(q =>
      normalizedQuestion.includes(q.text.toLowerCase())
    );

    if (matchingQuestion) {
      try {
        console.log("Found matching question:", matchingQuestion.text); // Debug log
        const response = await matchingQuestion.handler();
        console.log("Generated response:", response); // Debug log
        return response;
      } catch (error) {
        console.error("Error processing question:", error);
        return "Sorry, I couldn't retrieve that information.";
      }
    } else {
      console.warn("No matching question found."); // Debug log
      return "I don't understand that question. Try asking one of these:\n" +
        this.predefinedQuestions.map(q => `- ${q.text}`).join("\n");
    }
  }

  getCpuUsage() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.cpu) {
      return "CPU usage data is not available.";
    }

    const currentUsage = snapshot.cpu.usage || 0;
    const averageUsage = this.metricsProvider.getAverageValue("cpu", "value") || 0;

    return `Current CPU usage: ${currentUsage.toFixed(1)}%. Average: ${averageUsage.toFixed(1)}%.`;
  }

  getMemoryUsage() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.memory) {
      return "Memory usage data is not available.";
    }

    const used = snapshot.memory.usedJSHeapSize || 0;
    const total = snapshot.memory.totalJSHeapSize || 0;

    return `Memory usage: ${used.toFixed(1)} MB used out of ${total.toFixed(1)} MB.`;
  }

  getWebVitals() {
    const snapshot = this.metricsProvider.getSnapshot();
    if (!snapshot || !snapshot.webVitals) {
      return "Web Vitals data is not available.";
    }

    const { lcp, fid, cls } = snapshot.webVitals;
    return `Web Vitals:\n- LCP: ${lcp}ms\n- FID: ${fid}ms\n- CLS: ${cls}`;
  }

  getHelp() {
    return {
      type: "help",
      message: "You can ask me questions like:\n" +
        this.predefinedQuestions.map(q => `- ${q.text}`).join("\n"),
      options: this.predefinedQuestions.map(q => q.text)
    };
  }
}
