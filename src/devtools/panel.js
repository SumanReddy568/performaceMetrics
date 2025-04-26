chrome.devtools.panels.create(
  "Performance Metrics",
  "assets/icons/icon16.png",
  "src/devtools/panel.html",
  function(panel) {
    console.log("Custom panel created");
  }
);
