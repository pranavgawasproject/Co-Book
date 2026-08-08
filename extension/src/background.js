// SplitSync background service worker (Manifest V3)
// Handles extension lifecycle events and provides a persistent context
// for chrome.storage access from content scripts.

chrome.runtime.onInstalled.addListener(() => {
});

// Keep the service worker alive by responding to messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'OK' });
  }
  return true; // Keep channel open for async responses
});

