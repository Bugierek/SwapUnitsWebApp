#!/bin/bash
# Simple icon generator using ImageMagick
# Requires: brew install imagemagick

echo "🎨 Generating SwapUnits Extension Icons..."

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

# Colors
BG_COLOR="#4f46e5"  # Indigo
TEXT_COLOR="#ffffff"  # White

# Create temp 128x128 icon
echo "Creating base icon..."
convert -size 128x128 xc:"$BG_COLOR" \
    -gravity center \
    -pointsize 80 \
    -font "Arial-Bold" \
    -fill "$TEXT_COLOR" \
    -annotate +0+0 "⇄" \
    temp_icon.png

# Generate all sizes for Chrome
echo "Generating Chrome icons..."
mkdir -p chrome/icons
convert temp_icon.png -resize 128x128 chrome/icons/icon128.png
convert temp_icon.png -resize 48x48 chrome/icons/icon48.png
convert temp_icon.png -resize 16x16 chrome/icons/icon16.png

# Generate all sizes for Firefox
echo "Generating Firefox icons..."
mkdir -p firefox/icons
convert temp_icon.png -resize 128x128 firefox/icons/icon128.png
convert temp_icon.png -resize 48x48 firefox/icons/icon48.png
convert temp_icon.png -resize 16x16 firefox/icons/icon16.png

# Cleanup
rm temp_icon.png

echo "✅ Icons generated successfully!"
echo ""
echo "Icons created in:"
echo "  - chrome/icons/"
echo "  - firefox/icons/"
echo ""
echo "You can now load the extensions in your browser!"
