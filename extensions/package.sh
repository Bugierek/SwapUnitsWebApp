#!/bin/bash
# Helper script to package extensions for distribution

echo "📦 Packaging SwapUnits Browser Extensions..."

# Create dist directory
mkdir -p dist

# Package Chrome extension
echo "Packaging Chrome extension..."
cd chrome
CHROME_VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
zip -r ../dist/swapunits-chrome-v${CHROME_VERSION}.zip * -x "*.DS_Store"
cd ..

# Package Firefox extension
echo "Packaging Firefox extension..."
cd firefox
FIREFOX_VERSION=$(grep '"version"' manifest.json | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
zip -r ../dist/swapunits-firefox-v${FIREFOX_VERSION}.zip * -x "*.DS_Store"
cd ..

echo "✅ Done! Extensions packaged in dist/ folder"
echo ""
echo "Next steps:"
echo "1. Create icons (16x16, 48x48, 128x128) in each icons/ folder"
echo "2. Test the extensions locally"
echo "3. Upload to Chrome Web Store and Firefox Add-ons"
