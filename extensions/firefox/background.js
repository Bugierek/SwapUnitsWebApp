// Background service worker for SwapUnits extension

// Import conversion logic from your app
// This is a simplified version - you'll need to adapt your actual conversion-math.ts logic

const UNIT_DATA = {
  Length: {
    units: [
      { symbol: 'km', name: 'Kilometer', factor: 1000 },
      { symbol: 'm', name: 'Meter', factor: 1 },
      { symbol: 'cm', name: 'Centimeter', factor: 0.01 },
      { symbol: 'mm', name: 'Millimeter', factor: 0.001 },
      { symbol: 'mi', name: 'Mile', factor: 1609.344 },
      { symbol: 'yd', name: 'Yard', factor: 0.9144 },
      { symbol: 'ft', name: 'Foot', factor: 0.3048 },
      { symbol: 'in', name: 'Inch', factor: 0.0254 },
    ]
  },
  Mass: {
    units: [
      { symbol: 'kg', name: 'Kilogram', factor: 1000 },
      { symbol: 'g', name: 'Gram', factor: 1 },
      { symbol: 'mg', name: 'Milligram', factor: 0.001 },
      { symbol: 'lb', name: 'Pound', factor: 453.592 },
      { symbol: 'oz', name: 'Ounce', factor: 28.3495 },
    ]
  },
  Temperature: {
    units: [
      { symbol: '°C', name: 'Celsius' },
      { symbol: '°F', name: 'Fahrenheit' },
      { symbol: 'K', name: 'Kelvin' },
    ]
  },
  Volume: {
    units: [
      { symbol: 'L', name: 'Liter', factor: 1 },
      { symbol: 'mL', name: 'Milliliter', factor: 0.001 },
      { symbol: 'gal', name: 'Gallon (US)', factor: 3.78541 },
      { symbol: 'fl oz', name: 'Fluid Ounce (US)', factor: 0.0295735 },
    ]
  },
  Area: {
    units: [
      { symbol: 'km²', name: 'Square Kilometer', factor: 1000000 },
      { symbol: 'm²', name: 'Square Meter', factor: 1 },
      { symbol: 'mi²', name: 'Square Mile', factor: 2589988.110336 },
      { symbol: 'ft²', name: 'Square Foot', factor: 0.092903 },
    ]
  },
  Speed: {
    units: [
      { symbol: 'km/h', name: 'Kilometer/Hour', factor: 0.277778 },
      { symbol: 'm/s', name: 'Meter/Second', factor: 1 },
      { symbol: 'mph', name: 'Mile/Hour', factor: 0.44704 },
    ]
  },
  Currency: {
    units: [
      { symbol: 'USD', name: 'US Dollar' },
      { symbol: 'EUR', name: 'Euro' },
      { symbol: 'GBP', name: 'British Pound' },
      { symbol: 'JPY', name: 'Japanese Yen' },
      { symbol: 'CHF', name: 'Swiss Franc' },
      { symbol: 'CAD', name: 'Canadian Dollar' },
      { symbol: 'AUD', name: 'Australian Dollar' },
    ]
  }
};

// Cache for FX rates
let fxRatesCache = null;
let fxRatesCacheTime = 0;
const FX_CACHE_DURATION = 3600000; // 1 hour

// Convert units
function convertUnits(category, fromUnit, toUnit, value) {
  if (category === 'Temperature') {
    return convertTemperature(fromUnit, toUnit, value);
  } else if (category === 'Currency') {
    return convertCurrency(fromUnit, toUnit, value);
  } else {
    return convertStandard(category, fromUnit, toUnit, value);
  }
}

function convertStandard(category, fromUnit, toUnit, value) {
  const units = UNIT_DATA[category]?.units;
  if (!units) return null;
  
  const from = units.find(u => u.symbol === fromUnit);
  const to = units.find(u => u.symbol === toUnit);
  
  if (!from || !to) return null;
  
  // Convert to base unit, then to target
  const baseValue = value * from.factor;
  const result = baseValue / to.factor;
  
  return result;
}

function convertTemperature(fromUnit, toUnit, value) {
  let celsius;
  
  // Convert to Celsius first
  if (fromUnit === '°C') {
    celsius = value;
  } else if (fromUnit === '°F') {
    celsius = (value - 32) * (5 / 9);
  } else if (fromUnit === 'K') {
    celsius = value - 273.15;
  } else {
    return null;
  }
  
  // Convert from Celsius to target
  if (toUnit === '°C') {
    return celsius;
  } else if (toUnit === '°F') {
    return celsius * (9 / 5) + 32;
  } else if (toUnit === 'K') {
    return celsius + 273.15;
  }
  
  return null;
}

async function convertCurrency(fromUnit, toUnit, value) {
  // Fetch rates if cache is expired
  if (!fxRatesCache || Date.now() - fxRatesCacheTime > FX_CACHE_DURATION) {
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
      const data = await response.json();
      fxRatesCache = data.rates;
      fxRatesCacheTime = Date.now();
    } catch (error) {
      console.error('Failed to fetch FX rates:', error);
      return null;
    }
  }
  
  if (!fxRatesCache) return null;
  
  // Convert through USD
  const fromRate = fromUnit === 'USD' ? 1 : fxRatesCache[fromUnit];
  const toRate = toUnit === 'USD' ? 1 : fxRatesCache[toUnit];
  
  if (!fromRate || !toRate) return null;
  
  const usdValue = value / fromRate;
  const result = usdValue * toRate;
  
  return result;
}

// Message handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  if (request.action === 'getUnitsForCategory') {
    const units = UNIT_DATA[request.category]?.units || [];
    console.log('Sending units for', request.category, ':', units);
    sendResponse({ units });
    return false;
  } else if (request.action === 'convert') {
    const { category, fromUnit, toUnit, value } = request;
    console.log('Converting:', { category, fromUnit, toUnit, value });
    
    if (category === 'Currency') {
      // Async currency conversion
      convertCurrency(fromUnit, toUnit, value).then(result => {
        console.log('Currency conversion result:', result);
        sendResponse({ result });
      }).catch(error => {
        console.error('Currency conversion error:', error);
        sendResponse({ result: null, error: error.message });
      });
      return true; // Keep message channel open for async response
    } else {
      const result = convertUnits(category, fromUnit, toUnit, value);
      console.log('Conversion result:', result);
      sendResponse({ result });
      return false;
    }
  }
  
  return false;
});

// Context menu for quick conversion
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'swapunits-convert',
    title: 'Convert with SwapUnits',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'swapunits-convert') {
    chrome.tabs.sendMessage(tab.id, { action: 'convertSelection' });
  }
});
