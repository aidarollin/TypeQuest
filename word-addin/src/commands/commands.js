// commands.js — ribbon button handlers for TypeQuest Word add-in

Office.onReady(() => {
  // Register all function commands so Office can call them by name.
});

// Opens the TypeQuest task pane (invoked from ribbon button).
function openTaskPane(event) {
  Office.addin.showAsTaskpane();
  event.completed();
}

// Manually trigger a sync of the current word count (ribbon action).
function syncNow(event) {
  // The task pane's flushIfNeeded() will run on its own timer.
  // This button is a convenience for the user — we show a notification.
  Office.context.ui.displayDialogAsync(
    "https://localhost:3000/taskpane.html",
    { height: 1, width: 1 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        result.value.close();
      }
    }
  );
  event.completed();
}

// Expose commands so the manifest can reference them.
Office.actions.associate("openTaskPane", openTaskPane);
Office.actions.associate("syncNow", syncNow);
