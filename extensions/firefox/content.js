// Content script that detects and converts units on web pages

// Unit patterns to detect (based on your app's unit-data.ts)
// NOTE: Order matters! More specific patterns (like km/h) must come before general ones (like km)
const UNIT_PATTERNS = [
  // Currency
  { regex: /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:USD|dollars?)/gi, category: 'Currency', unit: 'USD' },
  { regex: /€\s*(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:EUR|euros?)/gi, category: 'Currency', unit: 'EUR' },
  { regex: /£\s*(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:GBP|pounds?)/gi, category: 'Currency', unit: 'GBP' },
  { regex: /¥\s*(\d+(?:,\d{3})*(?:\.\d+)?)|(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:JPY|yen)/gi, category: 'Currency', unit: 'JPY' },
  
  // Speed (MUST come before Length to catch km/h before km)
  { regex: /(\d+(?:\.\d+)?)\s*(?:km\/h|kmh|kph)/gi, category: 'Speed', unit: 'km/h' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:m\/s|mps)/gi, category: 'Speed', unit: 'm/s' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:mph|mi\/h)/gi, category: 'Speed', unit: 'mph' },
  
  // Length - Height notation (MUST come first: 6'2" = 6 feet 2 inches)
  { regex: /(\d+)\s*'\s*(\d+)\s*"/gi, category: 'Length', unit: 'height', isHeight: true },
  
  // Length (feet and inches with apostrophes)
  { regex: /(\d+(?:\.\d+)?)\s*'/gi, category: 'Length', unit: 'ft' },
  { regex: /(\d+(?:\.\d+)?)\s*"/gi, category: 'Length', unit: 'in' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:km|kilometers?|kilometres?)/gi, category: 'Length', unit: 'km' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:m|meters?|metres?)(?!\w)/gi, category: 'Length', unit: 'm' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:cm|centimeters?|centimetres?)/gi, category: 'Length', unit: 'cm' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:mm|millimeters?|millimetres?)/gi, category: 'Length', unit: 'mm' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:mi|miles?)/gi, category: 'Length', unit: 'mi' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:yd|yards?)/gi, category: 'Length', unit: 'yd' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)/gi, category: 'Length', unit: 'ft' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:in|inches?)/gi, category: 'Length', unit: 'in' },
  
  // Mass
  { regex: /(\d+(?:\.\d+)?)\s*(?:kg|kilograms?)/gi, category: 'Mass', unit: 'kg' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:g|grams?)(?!\w)/gi, category: 'Mass', unit: 'g' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:mg|milligrams?)/gi, category: 'Mass', unit: 'mg' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds?)/gi, category: 'Mass', unit: 'lb' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)/gi, category: 'Mass', unit: 'oz' },
  
  // Temperature
  { regex: /(\d+(?:\.\d+)?)\s*°?C(?!\w)/gi, category: 'Temperature', unit: '°C' },
  { regex: /(\d+(?:\.\d+)?)\s*°?F(?!\w)/gi, category: 'Temperature', unit: '°F' },
  { regex: /(\d+(?:\.\d+)?)\s*°?K(?!\w)/gi, category: 'Temperature', unit: 'K' },
  
  // Volume
  { regex: /(\d+(?:\.\d+)?)\s*(?:L|liters?|litres?)/gi, category: 'Volume', unit: 'L' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:mL|ml|milliliters?|millilitres?)/gi, category: 'Volume', unit: 'mL' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:gal|gallons?)/gi, category: 'Volume', unit: 'gal' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:fl oz|fluid ounces?)/gi, category: 'Volume', unit: 'fl oz' },
  
  // Area
  { regex: /(\d+(?:\.\d+)?)\s*(?:km²|km2|square kilometers?|square kilometres?)/gi, category: 'Area', unit: 'km²' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:m²|m2|square meters?|square metres?)/gi, category: 'Area', unit: 'm²' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:mi²|mi2|square miles?)/gi, category: 'Area', unit: 'mi²' },
  { regex: /(\d+(?:\.\d+)?)\s*(?:ft²|ft2|square feet)/gi, category: 'Area', unit: 'ft²' },
];

let tooltip = null;

// Parse selected text for units
function detectUnit(text) {
  console.log('Detecting unit in:', text);
  for (const pattern of UNIT_PATTERNS) {
    // Reset regex lastIndex
    pattern.regex.lastIndex = 0;
    const match = pattern.regex.exec(text);
    if (match) {
      console.log('Pattern matched:', pattern, match);
      
      // Special handling for height notation (e.g., 6'2")
      if (pattern.isHeight && match[1] && match[2]) {
        const feet = parseFloat(match[1]);
        const inches = parseFloat(match[2]);
        if (!isNaN(feet) && !isNaN(inches)) {
          // Convert to total inches: (feet * 12) + inches
          const totalInches = (feet * 12) + inches;
          console.log('Detected height:', { feet, inches, totalInches });
          return {
            value: totalInches,
            unit: 'in', // Convert from total inches
            category: pattern.category,
            originalText: match[0],
            isHeight: true
          };
        }
      }
      
      // Extract number (try both capture groups)
      let numStr = match[1] || match[2] || match[0];
      numStr = numStr.replace(/[^\d.-]/g, '');
      const value = parseFloat(numStr);
      if (!isNaN(value)) {
        console.log('Detected:', { value, unit: pattern.unit, category: pattern.category });
        return {
          value,
          unit: pattern.unit,
          category: pattern.category,
          originalText: match[0]
        };
      }
    }
  }
  console.log('No unit detected');
  return null;
}

// Show conversion tooltip
function showTooltip(x, y, detected) {
  console.log('Showing tooltip for:', detected);
  hideTooltip();
  
  tooltip = document.createElement('div');
  tooltip.className = 'swapunits-tooltip';
  
  // Load dark mode preference
  chrome.storage.sync.get(['darkMode'], (result) => {
    if (result.darkMode && tooltip) {
      tooltip.classList.add('dark-mode');
      const sunIcon = tooltip.querySelector('.swapunits-sun-icon');
      const moonIcon = tooltip.querySelector('.swapunits-moon-icon');
      if (sunIcon && moonIcon) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      }
    }
  });
  
  // Set position first before adding to DOM
  tooltip.style.position = 'fixed';
  tooltip.style.left = `${Math.min(x + 5, window.innerWidth - 320)}px`;
  tooltip.style.top = `${Math.min(y + 5, window.innerHeight - 200)}px`;
  tooltip.style.zIndex = '2147483647';
  
  tooltip.innerHTML = `
    <div class="swapunits-tooltip-header">
      <a href="https://swapunits.com" target="_blank" class="swapunits-brand" title="Visit SwapUnits.com">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swapunits-logo-icon">
          <path d="M21 12a9 9 0 0 1-9 9c-2.52 0-4.93-1-6.74-2.74L3 16"/>
          <path d="M8 16H3v5"/>
          <path d="M3 12a9 9 0 0 1 9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M16 8h5V3"/>
        </svg>
        <span>SWAPUNITS</span>
      </a>
      <div class="swapunits-header-actions">
        <button class="swapunits-dark-mode-toggle" title="Toggle dark mode">
          <svg class="swapunits-sun-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg class="swapunits-moon-icon" style="display: none;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
        <button class="swapunits-settings-btn" title="Change target unit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <button class="swapunits-close">×</button>
      </div>
    </div>
    <div class="swapunits-tooltip-body">
      <div class="swapunits-loading">Converting...</div>
      <div class="swapunits-result" style="display:none;"></div>
      <select class="swapunits-select" id="swapunits-target-unit" style="display:none;">
        <option value="">Select unit...</option>
      </select>
    </div>
  `;
  
  document.body.appendChild(tooltip);
  console.log('Tooltip added to body at', x, y);
  
  // Event listeners - ADD THESE FIRST before stopping propagation
  tooltip.querySelector('.swapunits-close').addEventListener('click', (e) => {
    console.log('Close button clicked!');
    e.stopPropagation();
    e.preventDefault();
    hideTooltip();
  });
  
  // Dark mode toggle
  tooltip.querySelector('.swapunits-dark-mode-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const isDark = tooltip.classList.toggle('dark-mode');
    
    const sunIcon = tooltip.querySelector('.swapunits-sun-icon');
    const moonIcon = tooltip.querySelector('.swapunits-moon-icon');
    
    if (isDark) {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
    
    // Save preference
    chrome.storage.sync.set({ darkMode: isDark });
  });
  
  tooltip.querySelector('.swapunits-settings-btn').addEventListener('click', (e) => {
    console.log('Settings button clicked!');
    e.stopPropagation();
    e.preventDefault();
    const select = tooltip.querySelector('#swapunits-target-unit');
    const resultDiv = tooltip.querySelector('.swapunits-result');
    const loading = tooltip.querySelector('.swapunits-loading');
    
    if (select.style.display === 'none') {
      select.style.display = 'block';
      resultDiv.style.display = 'none';
      loading.style.display = 'none';
    } else {
      select.style.display = 'none';
      resultDiv.style.display = 'block';
    }
  });
  
  // Listen for dropdown changes and auto-convert
  tooltip.querySelector('#swapunits-target-unit').addEventListener('change', (e) => {
    const targetUnit = e.target.value;
    if (targetUnit) {
      // Check if selecting same unit
      if (targetUnit === detected.unit) {
        // Show message that same unit conversion is not useful
        const loading = tooltip.querySelector('.swapunits-loading');
        loading.textContent = 'Please select a different unit';
        loading.style.display = 'block';
        loading.style.color = '#ef4444';
        setTimeout(() => {
          loading.style.display = 'none';
          loading.textContent = 'Converting...';
          loading.style.color = '';
        }, 2000);
        return;
      }
      performManualConversion(detected);
    }
  });
  
  // Prevent events from bubbling OUT of tooltip (but allow internal clicks)
  tooltip.addEventListener('mousedown', (e) => e.stopPropagation());
  tooltip.addEventListener('mouseup', (e) => e.stopPropagation());
  
  // Load units for the category (exclude source unit)
  loadUnitsForCategory(detected.category, detected.unit);
  
  // Auto-convert immediately with preferred or default unit
  autoConvert(detected);
  
  // Click outside to close - with proper delay
  setTimeout(() => {
    const outsideClickHandler = (e) => {
      if (tooltip && !tooltip.contains(e.target)) {
        hideTooltip();
        document.removeEventListener('mousedown', outsideClickHandler, true);
      }
    };
    document.addEventListener('mousedown', outsideClickHandler, true);
  }, 300);
}

function handleOutsideClick(e) {
  if (tooltip && !tooltip.contains(e.target)) {
    e.preventDefault();
    e.stopPropagation();
    hideTooltip();
  }
}

function hideTooltip() {
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
}

// Fallback unit data if background script fails
const FALLBACK_UNITS = {
  Currency: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AUD', 'CAD', 'CHF', 'INR', 'MXN', 'BRL', 'ZAR', 'NZD', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP', 'AED', 'SAR', 'MYR', 'RON', 'TRY', 'KRW', 'RUB', 'VND', 'ARS', 'COP', 'EGP', 'PKR', 'NGN', 'UAH', 'KES', 'BDT'],
  Length: ['km', 'm', 'cm', 'mm', 'mi', 'yd', 'ft', 'in'],
  Mass: ['kg', 'g', 'mg', 'lb', 'oz'],
  Temperature: ['°C', '°F', 'K'],
  Volume: ['L', 'mL', 'gal', 'fl oz'],
  Area: ['km²', 'm²', 'mi²', 'ft²'],
  Speed: ['km/h', 'm/s', 'mph']
};

// Fallback conversion factors (relative to base unit)
const FALLBACK_CONVERSIONS = {
  Length: { km: 0.001, m: 1, cm: 100, mm: 1000, mi: 0.000621371, yd: 1.09361, ft: 3.28084, in: 39.3701 },
  Mass: { kg: 1, g: 1000, mg: 1000000, lb: 2.20462, oz: 35.274 },
  Volume: { L: 1, mL: 1000, gal: 0.264172, 'fl oz': 33.814 },
  Area: { 'km²': 0.000001, 'm²': 1, 'mi²': 0.000000386102, 'ft²': 10.7639 },
  Speed: { 'km/h': 3.6, 'm/s': 1, mph: 2.23694 }
};

// Fallback conversion function
async function fallbackConvert(category, fromUnit, toUnit, value) {
  // Temperature needs special handling
  if (category === 'Temperature') {
    let celsius;
    if (fromUnit === '°C') celsius = value;
    else if (fromUnit === '°F') celsius = (value - 32) * 5/9;
    else if (fromUnit === 'K') celsius = value - 273.15;
    
    if (toUnit === '°C') return celsius;
    if (toUnit === '°F') return (celsius * 9/5) + 32;
    if (toUnit === 'K') return celsius + 273.15;
  }
  
  // Currency conversion with live API
  if (category === 'Currency') {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromUnit}`);
      const data = await response.json();
      if (data.rates && data.rates[toUnit]) {
        return value * data.rates[toUnit];
      }
      return null;
    } catch (error) {
      console.error('Currency conversion failed:', error);
      return null;
    }
  }
  
  // Standard conversion using factors
  const factors = FALLBACK_CONVERSIONS[category];
  if (!factors || !factors[fromUnit] || !factors[toUnit]) {
    return null;
  }
  
  // Convert to base unit, then to target unit
  const baseValue = value / factors[fromUnit];
  return baseValue * factors[toUnit];
}

// Load available units for conversion
function loadUnitsForCategory(category, sourceUnit = null) {
  console.log('Loading units for category:', category, 'excluding:', sourceUnit);
  
  if (!tooltip) {
    console.error('Tooltip not found!');
    return;
  }
  
  const select = tooltip.querySelector('#swapunits-target-unit');
  if (!select) {
    console.error('Select element not found!');
    return;
  }
  
  const units = FALLBACK_UNITS[category] || [];
  console.log('Available units:', units);
  
  select.innerHTML = '<option value="">Select target unit...</option>';
  
  units.forEach(symbol => {
    // Skip the source unit to prevent same-unit conversion
    if (sourceUnit && symbol === sourceUnit) {
      return;
    }
    
    const option = document.createElement('option');
    option.value = symbol;
    option.textContent = symbol;
    select.appendChild(option);
  });
  
  console.log('Units loaded successfully, dropdown has', select.options.length, 'options');
}

// Auto-convert with preferred or default target unit
async function autoConvert(detected) {
  console.log('Auto-converting:', detected);
  
  // Get preferred target unit from storage
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['preferredUnits'], async (result) => {
      const preferred = result.preferredUnits || {};
      let targetUnit = preferred[detected.category];
      
      // Check if target is same as source
      if (targetUnit && targetUnit === detected.unit) {
        // Same unit, show dropdown to select different unit
        tooltip.querySelector('.swapunits-loading').style.display = 'none';
        tooltip.querySelector('#swapunits-target-unit').style.display = 'block';
        return;
      }
      
      // If no preference, use default target unit
      if (!targetUnit) {
        targetUnit = getDefaultTargetUnit(detected.category, detected.unit);
      }
      
      // Check if default is same as source
      if (targetUnit && targetUnit === detected.unit) {
        // Same unit, show dropdown
        tooltip.querySelector('.swapunits-loading').style.display = 'none';
        tooltip.querySelector('#swapunits-target-unit').style.display = 'block';
        return;
      }
      
      if (targetUnit) {
        await performConversion(detected, targetUnit);
      } else {
        // No default available, show selector
        tooltip.querySelector('.swapunits-loading').style.display = 'none';
        tooltip.querySelector('#swapunits-target-unit').style.display = 'block';
      }
    });
  } else {
    // No storage, use default
    const targetUnit = getDefaultTargetUnit(detected.category, detected.unit);
    
    // Check if default is same as source
    if (targetUnit && targetUnit === detected.unit) {
      // Same unit, show dropdown
      tooltip.querySelector('.swapunits-loading').style.display = 'none';
      tooltip.querySelector('#swapunits-target-unit').style.display = 'block';
      return;
    }
    
    if (targetUnit) {
      await performConversion(detected, targetUnit);
    } else {
      tooltip.querySelector('.swapunits-loading').style.display = 'none';
      tooltip.querySelector('#swapunits-target-unit').style.display = 'block';
    }
  }
}

// Get default target unit based on category and source unit
function getDefaultTargetUnit(category, sourceUnit) {
  const defaults = {
    'Currency': { 'USD': 'EUR', 'EUR': 'USD', 'GBP': 'USD', 'JPY': 'USD' },
    'Length': { 'km': 'mi', 'mi': 'km', 'm': 'ft', 'ft': 'm', 'cm': 'in', 'in': 'cm' },
    'Mass': { 'kg': 'lb', 'lb': 'kg', 'g': 'oz', 'oz': 'g' },
    'Temperature': { '°C': '°F', '°F': '°C', 'K': '°C' },
    'Volume': { 'L': 'gal', 'gal': 'L', 'mL': 'fl oz', 'fl oz': 'mL' },
    'Area': { 'km²': 'mi²', 'mi²': 'km²', 'm²': 'ft²', 'ft²': 'm²' },
    'Speed': { 'km/h': 'mph', 'mph': 'km/h', 'm/s': 'km/h' }
  };
  
  return defaults[category]?.[sourceUnit] || FALLBACK_UNITS[category]?.[0];
}

// Manual conversion when user selects from dropdown
async function performManualConversion(detected) {
  const select = tooltip.querySelector('#swapunits-target-unit');
  const targetUnit = select.value;
  
  if (!targetUnit) {
    alert('Please select a target unit');
    return;
  }
  
  await performConversion(detected, targetUnit);
}

// Perform the actual conversion
async function performConversion(detected, targetUnit) {
  console.log('performConversion called with:', detected, 'to', targetUnit);
  
  if (!tooltip) return;
  
  // Hide loading, show result area
  const loading = tooltip.querySelector('.swapunits-loading');
  if (loading) loading.style.display = 'none';
  
  try {
    // Try fallback conversion first
    const fallbackResult = await fallbackConvert(detected.category, detected.unit, targetUnit, detected.value);
    
    if (fallbackResult !== null) {
      displayConversionResult(detected, targetUnit, fallbackResult);
    } else {
      alert('Conversion failed. Please try again.');
      // Show selector if conversion fails
      const select = tooltip.querySelector('#swapunits-target-unit');
      if (select) select.style.display = 'block';
    }
  } catch (error) {
    console.error('Conversion error:', error);
    alert('Conversion failed: ' + error.message);
    // Show selector on error
    const select = tooltip.querySelector('#swapunits-target-unit');
    if (select) select.style.display = 'block';
  }
}

function displayConversionResult(detected, targetUnit, result) {
  if (!tooltip) return;
  
  const resultDiv = tooltip.querySelector('.swapunits-result');
  const select = tooltip.querySelector('#swapunits-target-unit');
  
  resultDiv.style.display = 'block';
  select.style.display = 'none';
  
  // Format result with appropriate precision
  let formattedResult;
  if (typeof result === 'number') {
    // Remove trailing zeros and decimal point if not needed
    formattedResult = parseFloat(result.toFixed(6)).toString();
  } else {
    formattedResult = result;
  }
  
  // Get current date/time for metadata
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  // Determine source
  const source = detected.category === 'Currency' 
    ? 'exchangerate-api.com' 
    : 'SwapUnits.com';
  
  resultDiv.innerHTML = `
    <div class="swapunits-result-value">
      <div>
        <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">
          ${detected.value} ${detected.unit} =
        </div>
        <strong>${formattedResult} ${targetUnit}</strong>
      </div>
      <button class="swapunits-copy-btn" title="Copy result">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swapunits-copy-icon">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="swapunits-check-icon" style="display: none;">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      </button>
    </div>
    <div class="swapunits-result-meta">
      <span>${dateStr} · ${timeStr}</span>
      <span>via ${source}</span>
    </div>
  `;
  
  // Copy button
  resultDiv.querySelector('.swapunits-copy-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(`${formattedResult} ${targetUnit}`);
    const btn = resultDiv.querySelector('.swapunits-copy-btn');
    const copyIcon = btn.querySelector('.swapunits-copy-icon');
    const checkIcon = btn.querySelector('.swapunits-check-icon');
    
    copyIcon.style.display = 'none';
    checkIcon.style.display = 'block';
    checkIcon.style.color = '#10b981'; // emerald-500
    
    setTimeout(() => {
      copyIcon.style.display = 'block';
      checkIcon.style.display = 'none';
    }, 1500);
  });
  
  // Save preferred unit if chrome.storage available
  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['preferredUnits'], (result) => {
      const preferred = result.preferredUnits || {};
      preferred[detected.category] = targetUnit;
      chrome.storage.sync.set({ preferredUnits: preferred });
    });
  }
}

// Listen for text selection
document.addEventListener('mouseup', (e) => {
  // Small delay to ensure selection is complete
  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text.length > 0 && text.length < 100) {
      const detected = detectUnit(text);
      if (detected) {
        // Use clientX/clientY for fixed positioning
        showTooltip(e.clientX, e.clientY, detected);
      }
    }
  }, 50);
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'convertSelection') {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    const detected = detectUnit(text);
    
    if (detected) {
      sendResponse({ detected });
    } else {
      sendResponse({ error: 'No unit detected in selection' });
    }
  } else if (request.action === 'updateTheme') {
    // Update tooltip theme if it's visible
    if (tooltip) {
      if (request.darkMode) {
        tooltip.classList.add('dark-mode');
        const sunIcon = tooltip.querySelector('.swapunits-sun-icon');
        const moonIcon = tooltip.querySelector('.swapunits-moon-icon');
        if (sunIcon && moonIcon) {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
        }
      } else {
        tooltip.classList.remove('dark-mode');
        const sunIcon = tooltip.querySelector('.swapunits-sun-icon');
        const moonIcon = tooltip.querySelector('.swapunits-moon-icon');
        if (sunIcon && moonIcon) {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
        }
      }
    }
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});
