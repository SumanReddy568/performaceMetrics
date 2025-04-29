chrome.devtools.panels.create(
  "Performance Metrics",
  "/icons/icon16.png",
  "src/devtools/panel.html",
  function(panel) {
    console.log("Custom panel created");
  }
);
