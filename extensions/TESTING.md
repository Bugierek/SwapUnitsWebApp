# Testing Instructions

## Reload the Extension

After making changes, you need to reload the extension:

### Chrome/Brave:
1. Go to `chrome://extensions/` (or `brave://extensions/`)
2. Find "SwapUnits Converter"
3. Click the **reload icon** (circular arrow) ⟳
4. Go back to your test page
5. **Refresh the test page** (F5 or Cmd+R)

### Firefox:
1. Go to `about:debugging#/runtime/this-firefox`
2. Find "SwapUnits Converter"
3. Click **Reload**
4. Go back to your test page
5. **Refresh the test page**

## Testing Steps

1. **Reload extension** (see above)
2. **Refresh test page** (`test-page.html`)
3. **Open browser console**: 
   - Chrome/Brave: Right-click → Inspect → Console tab
   - Firefox: Right-click → Inspect Element → Console tab
4. **Select text** like "$100" or "30 km"
5. **Watch the console** for debug messages

## What to Look For in Console

You should see:
```
Detecting unit in: $100
Pattern matched: ...
Detected: { value: 100, unit: 'USD', category: 'Currency' }
Showing tooltip for: ...
Tooltip added to body
Background received message: { action: 'getUnitsForCategory', category: 'Currency' }
Sending units for Currency : ...
Units response: { units: [...] }
```

## Troubleshooting

### Tooltip doesn't appear:
- Check console for "Detecting unit in:" message
- Make sure you're selecting the FULL text including number and unit
- Try selecting exactly: "$100" or "30 km"

### "Select target unit..." stays empty:
- Check console for "Units response:"
- Make sure background script is loaded (check in `chrome://extensions/`)
- Click the reload button on the extension

### Right-click menu doesn't work:
- After selecting text, right-click
- Should see "Convert with SwapUnits" in menu
- Check console for error messages

### Extension not loading:
- Make sure all icon files exist in `icons/` folder
- Check for manifest errors in `chrome://extensions/`
- Look for red error text

## Common Issues

1. **"Failed to load units"** - Background script not responding
   - Solution: Reload the extension

2. **No console messages** - Content script not loaded
   - Solution: Refresh the page after reloading extension

3. **"chrome.runtime is undefined"** - Extension not properly loaded
   - Solution: Reload extension, check manifest.json

4. **Tooltip appears then disappears** - Click handler issue
   - Solution: Fixed in latest version, reload extension
