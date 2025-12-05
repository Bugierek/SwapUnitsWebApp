# SwapUnits Browser Extensions

Convert units instantly by selecting text on any webpage!

## 🚀 Chrome Web Store Submission Status

✅ **Technical Requirements**: Complete (Manifest V3, minimal permissions)  
✅ **Privacy Policy**: Created ([PRIVACY.md](PRIVACY.md))  
✅ **Store Description**: Complete ([STORE_LISTING.md](STORE_LISTING.md))  
⏳ **Screenshots**: Needed (see [SCREENSHOT_GUIDE.md](SCREENSHOT_GUIDE.md))  
⏳ **Promotional Tile**: Needed (440x280)  

📋 **See [SUBMISSION_CHECKLIST.md](SUBMISSION_CHECKLIST.md) for complete submission guide**

## Features

✅ **Automatic Detection** - Select any text with a unit (e.g., "30 USD", "5 kg", "10 km")  
✅ **Smart Popup** - Conversion tooltip appears automatically  
✅ **Multiple Categories** - Currency, Length, Mass, Temperature, Volume, Area, Speed  
✅ **Remember Preferences** - Your preferred target units are saved  
✅ **Copy to Clipboard** - One-click copy of conversion results  
✅ **Context Menu** - Right-click on selected text for quick conversion  

## Installation

### Chrome / Edge / Brave

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extensions/chrome` folder
5. The SwapUnits icon should appear in your toolbar!

### Firefox

1. Open Firefox and go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Navigate to `extensions/firefox` folder
4. Select the `manifest.json` file
5. The extension is now active!

**Note:** For permanent installation in Firefox, you need to sign the extension through Mozilla Add-ons.

## How to Use

### Method 1: Select Text
1. Highlight any text containing a unit (e.g., "The distance is 30 km")
2. A tooltip will appear automatically
3. Select your target unit from the dropdown
4. Click "Convert" to see the result
5. Click the copy button to copy to clipboard

### Method 2: Context Menu
1. Right-click on selected text
2. Choose "Convert with SwapUnits" from the menu
3. Follow the same steps as above

### Method 3: Extension Popup
1. Click the SwapUnits icon in your toolbar
2. See instructions and open the full web app

## Supported Units

The extension supports the same units as the main SwapUnits web app:

- **Currency**: USD, EUR, GBP, JPY, CHF, CAD, AUD (live exchange rates)
- **Length**: km, m, cm, mm, mi, yd, ft, in
- **Mass**: kg, g, mg, lb, oz
- **Temperature**: °C, °F, K
- **Volume**: L, mL, gal, fl oz
- **Area**: km², m², mi², ft²
- **Speed**: km/h, m/s, mph

## Privacy

- ✅ No data collection
- ✅ No tracking or analytics
- ✅ Conversions happen locally
- ✅ Only currency conversions fetch external data (exchange rates API)

## Development

### Adding New Units

Edit `background.js` and add your unit to the `UNIT_DATA` object:

```javascript
const UNIT_DATA = {
  YourCategory: {
    units: [
      { symbol: 'unit', name: 'Unit Name', factor: 1.0 }
    ]
  }
};
```

### Customizing Detection Patterns

Edit `content.js` and add patterns to the `UNIT_PATTERNS` array:

```javascript
{ 
  regex: /(\d+(?:\.\d+)?)\s*(?:pattern)/gi, 
  category: 'Category', 
  unit: 'symbol' 
}
```

## Building for Production

### Chrome Web Store

1. Update version in `manifest.json`
2. Create icons (16x16, 48x48, 128x128) in `icons/` folder
3. Zip the entire `chrome` folder
4. Upload to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

### Firefox Add-ons

1. Update version in `manifest.json`
2. Create icons in `icons/` folder
3. Zip the entire `firefox` folder
4. Submit to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

## Creating Icons

You need to create three icon sizes:
- `icons/icon16.png` (16x16)
- `icons/icon48.png` (48x48)
- `icons/icon128.png` (128x128)

Use your SwapUnits logo or create simple icons with the 🔄 emoji.

Quick way to generate icons:
```bash
# Using ImageMagick
convert -size 128x128 xc:blue -pointsize 80 -fill white -gravity center -annotate +0+0 "🔄" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

## Troubleshooting

### Extension not detecting units
- Make sure you're selecting the entire number + unit (e.g., "30 km" not just "30")
- Check that the unit is in a supported format
- Try refreshing the page

### Currency conversions not working
- Check your internet connection (needs to fetch exchange rates)
- The extension caches rates for 1 hour
- Try again in a few minutes if rate API is down

### Tooltip not appearing
- Check that the extension is enabled in your browser
- Try disabling other extensions that might conflict
- Reload the page after installing the extension

## Contributing

Want to add more features or units? Contributions welcome!

1. Fork the repository
2. Make your changes
3. Test in both Chrome and Firefox
4. Submit a pull request

## License

Same as the main SwapUnits application.

## Links

- [SwapUnits Web App](https://swapunits.com)
- [Report Issues](https://github.com/Bugierek/SwapUnitsWebApp/issues)
