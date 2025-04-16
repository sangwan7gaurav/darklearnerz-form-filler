chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed. Creating context menus...");
  const menuItems = [
    { id: "getAnswers", title: "Get Answers" },
    { id: "toggleAnswers", title: "Show/Hide Answers" },
    { id: "eraseAnswers", title: "Erase Answers" },
  ];

  menuItems.forEach((item) => {
    chrome.contextMenus.create({
      id: item.id,
      title: item.title,
      contexts: ["all"],
    });
    console.log(`Context menu created: ${item.title}`);
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id) {
    console.log(`Context menu clicked: ${info.menuItemId}`);
    executeScript(tab.id, `scripts/${info.menuItemId}.js`);
  } else {
    console.error("No active tab found for context menu action.");
  }
});

chrome.commands.onCommand.addListener((command) => {
  console.log(`Keyboard command received: ${command}`);

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const activeTabId = tabs[0].id;
      console.log(`Executing command '${command}' on tab ID: ${activeTabId}`);
      executeScript(activeTabId, `scripts/${command}.js`);
    } else {
      console.error("No active tabs found for command.");
    }
  });
});

function executeScript(tabId, scriptFile) {
  console.log(`Executing script: ${scriptFile} on tab ID: ${tabId}`);

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: [scriptFile],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.error(
          `Error executing script '${scriptFile}': ${chrome.runtime.lastError.message}`
        );
      } else {
        console.log(`Script executed successfully: ${scriptFile}`);
      }
    }
  );
}
