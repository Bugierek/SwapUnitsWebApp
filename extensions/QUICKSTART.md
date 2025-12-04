# SwapUnits Browser Extension - Quick Start Guide

## ✅ What's Been Created

I've created complete Chrome and Firefox browser extensions that allow users to convert units by selecting text on any webpage.

### Extension Structure

```
extensions/
├── chrome/                  # Chrome/Edge/Brave extension
│   ├── manifest.json       # Extension config (Manifest V3)
│   ├── background.js       # Background service worker with conversion logic
│   ├── content.js          # Content script for text selection detection
│   ├── content.css         # Tooltip styling
│   ├── popup.html          # Extension popup UI
│   ├── popup.js            # Popup functionality
│   └── icons/              # (needs icon files)
│
├── firefox/                # Firefox extension
│   ├── manifest.json       # Extension config (Manifest V2)
│   ├── background.js       # Background script (Firefox compatible)
│   ├── content.js          # Same as Chrome
│   ├── content.css         # Same as Chrome
│   ├── popup.html          # Same as Chrome
│   ├── popup.js            # Same as Chrome
│   └── icons/              # (needs icon files)
│
├── README.md               # Full documentation
├── ICONS.md                # Icon creation guide
├── test-page.html          # Test page with example units
└── package.sh              # Packaging script for distribution
```

## 🚀 How to Test Right Now

### Chrome:
1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable "Developer mode" (toggle top-right)
4. Click "Load unpacked"
5. Select `extensions/chrome` folder
6. Open `extensions/test-page.html` in your browser
7. Select any text like "30 km" or "$100"
8. Tooltip should appear!

### Firefox:
1. Open Firefox
2. Go to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select `extensions/firefox/manifest.json`
5. Open `extensions/test-page.html`
6. Test by selecting text

## 📋 Features Implemented

✅ **Text Selection Detection** - Automatically detects units in selected text  
✅ **Smart Pattern Matching** - Recognizes various formats ($100, 100 USD, 100 dollars)  
✅ **Beautiful Tooltip UI** - Gradient design matching your app's branding  
✅ **Category-Based Conversion** - Groups units by category  
✅ **Live Currency Rates** - Fetches real exchange rates  
✅ **Preferred Units** - Remembers user's preferred target units  
✅ **Copy to Clipboard** - One-click copy of results  
✅ **Context Menu** - Right-click option for conversion  
✅ **Extension Popup** - Info and link to full web app  
✅ **Dark Mode Support** - Works with system theme  

## 🎯 What You Need to Do

### 1. Create Icons (Required)
The extension needs 3 icon sizes in both `chrome/icons/` and `firefox/icons/`:
- `icon16.png` (16×16)
- `icon48.png` (48×48)  
- `icon128.png` (128×128)

See `ICONS.md` for creation methods.

### 2. Test Locally
Use `test-page.html` to verify all conversions work correctly.

### 3. Customize (Optional)
- Update the web app URL in `popup.html` and `popup.js`
- Add more unit patterns to `content.js`
- Adjust colors in `content.css`
- Add more units to `background.js`

### 4. Publish to Stores

**Chrome Web Store:**
1. Create developer account ($5 one-time fee)
2. Zip the `chrome` folder
3. Upload to [Chrome Web Store Dashboard](https://chrome.google.com/webstore/devconsole)
4. Fill out listing details
5. Submit for review

**Firefox Add-ons:**
1. Create developer account (free)
2. Zip the `firefox` folder
3. Upload to [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)
4. Fill out listing details
5. Submit for review

## 🔧 How It Works

### User Flow:
1. User selects text like "30 km" on any webpage
2. `content.js` detects the selection and parses it
3. Tooltip appears with conversion options
4. User selects target unit (e.g., "miles")
5. `content.js` sends message to `background.js`
6. `background.js` performs conversion calculation
7. Result appears in tooltip with copy button

### Technical Details:
- **Content Script** runs on every page, listens for text selection
- **Background Script** handles conversion logic and currency API calls
- **Storage API** saves user preferences
- **Context Menu API** adds right-click option
- **Messaging API** communicates between components

## 📊 Supported Conversions

The extension currently supports:
- **Currency**: USD, EUR, GBP, JPY, CHF, CAD, AUD (with live rates)
- **Length**: km, m, cm, mm, mi, yd, ft, in
- **Mass**: kg, g, mg, lb, oz
- **Temperature**: °C, °F, K
- **Volume**: L, mL, gal, fl oz
- **Area**: km², m², mi², ft²
- **Speed**: km/h, m/s, mph

To add more units, edit the `UNIT_DATA` object in `background.js`.

## 🐛 Known Limitations

- Currency rates cached for 1 hour (configurable)
- Limited to units defined in `background.js`
- Tooltip might not position perfectly on all sites
- Some sites with complex CSP might block the extension

## 🎨 Branding

The extension uses your SwapUnits brand colors:
- Primary: `#4f46e5` (Indigo)
- Gradient: `#667eea` to `#764ba2`
- Accent: Gold for highlights

All customizable in `content.css` and `popup.html`.

## 📦 Distribution Files

Run `./package.sh` to create zip files for distribution:
- `dist/swapunits-chrome-v1.0.0.zip`
- `dist/swapunits-firefox-v1.0.0.zip`

## 🔄 Future Enhancements

Ideas for v2.0:
- [ ] Settings page for customization
- [ ] Inline conversion (replace text directly)
- [ ] Keyboard shortcut for conversion
- [ ] Conversion history
- [ ] More currency providers
- [ ] Auto-detect user's location for default currency
- [ ] Support for compound units (miles per gallon)
- [ ] Integration with your web app API

## 💡 Tips

1. Test on different websites (news sites, shopping sites, Wikipedia)
2. Try edge cases (very large numbers, decimals, negative numbers)
3. Test on both light and dark themed websites
4. Check performance with multiple tooltips
5. Verify it doesn't conflict with existing page functionality

## 📞 Support

If you encounter issues or want to add features:
1. Check the browser console for errors
2. Review the `README.md` for troubleshooting
3. Test with different websites
4. Verify icons are present

The extension is fully functional and ready for testing! Just add the icons and you can start using it or submit to the stores.
