// Popup script for SwapUnits extension

// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');
const sunIcon = darkModeToggle.querySelector('.sun-icon');
const moonIcon = darkModeToggle.querySelector('.moon-icon');

// Load dark mode preference
chrome.storage.sync.get(['darkMode'], (result) => {
  if (result.darkMode) {
    document.body.classList.add('dark-mode');
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  }
});

// Toggle dark mode
darkModeToggle.addEventListener('click', () => {
  const isDark = document.body.classList.toggle('dark-mode');
  
  if (isDark) {
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'block';
  } else {
    sunIcon.style.display = 'block';
    moonIcon.style.display = 'none';
  }
  
  // Save preference
  chrome.storage.sync.set({ darkMode: isDark });
  
  // Notify content script to update tooltip theme
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { 
        action: 'updateTheme', 
        darkMode: isDark 
      }).catch(() => {
        // Ignore errors if content script not loaded
      });
    }
  });
});

document.getElementById('openWebApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://swapunits.com' });
});

// Show conversion statistics
chrome.storage.sync.get(['conversionCount'], (result) => {
  const count = result.conversionCount || 0;
  if (count > 0) {
    const statsDiv = document.createElement('div');
    statsDiv.className = 'info-box';
    statsDiv.innerHTML = `
      <h2>📊 Statistics:</h2>
      <p>You've made ${count} conversion${count !== 1 ? 's' : ''} so far!</p>
    `;
    document.querySelector('.content').insertBefore(
      statsDiv,
      document.querySelector('.btn-primary')
    );
  }
});
