# Extension Analytics Setup

The extension files (`popup.html` and `manifest.json`) contain Google Analytics tracking IDs and are gitignored for privacy.

## Setup Instructions

1. **Copy template files:**
   ```bash
   cp chrome/popup.html.template chrome/popup.html
   cp chrome/manifest.json.template chrome/manifest.json
   cp firefox/popup.html.template firefox/popup.html
   cp firefox/manifest.json.template firefox/manifest.json
   ```

2. **Add your Google Analytics ID:**
   - Open each `popup.html` file
   - Replace `YOUR_GA4_ID` with your actual GA4 tracking ID (e.g., `G-XXXXXXXXXX`)

3. **Package the extensions:**
   ```bash
   ./package.sh
   ```

## Template Files

- `popup.html.template` - Popup HTML with placeholder GA4 ID
- `manifest.json.template` - Manifest with GA permissions configured

## What's Gitignored

These files are excluded from version control as they contain tracking IDs:
- `chrome/popup.html`
- `chrome/manifest.json`
- `firefox/popup.html`
- `firefox/manifest.json`
- `dist/` folder
- `*.crx` and `*.zip` packages
