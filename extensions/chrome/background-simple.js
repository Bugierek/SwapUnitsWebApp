// Minimal service worker to test registration
console.log('SwapUnits service worker loaded successfully!');

// Basic message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  if (request.action === 'test') {
    sendResponse({ status: 'ok', message: 'Service worker is working!' });
  }
  
  return true; // Keep message channel open for async responses
});

// Installation handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('SwapUnits extension installed');
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'swapunits-convert',
    title: 'Convert with SwapUnits',
    contexts: ['selection']
  });
});
