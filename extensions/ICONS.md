# Icon Placeholders

You need to create three icon sizes for the extension to work:

- **icon16.png** (16×16 pixels) - Toolbar icon
- **icon48.png** (48×48 pixels) - Extension management page
- **icon128.png** (128×128 pixels) - Chrome Web Store listing

## Quick Icon Creation Options

### Option 1: Use Figma/Canva
1. Create a 128x128 canvas
2. Add your SwapUnits logo or the 🔄 emoji
3. Export as PNG at all three sizes

### Option 2: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first: brew install imagemagick

# Create a simple blue icon with conversion symbol
convert -size 128x128 xc:"#4f46e5" -pointsize 80 -fill white -gravity center -annotate +0+0 "⇄" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

### Option 3: Use Online Tool
- Go to https://favicon.io/favicon-generator/
- Create your icon design
- Download and rename to icon16.png, icon48.png, icon128.png

### Option 4: Export from your existing logo
If you have an SVG logo:
```bash
# Convert SVG to PNG at different sizes
convert -density 300 -background none logo.svg -resize 128x128 icon128.png
convert -density 300 -background none logo.svg -resize 48x48 icon48.png
convert -density 300 -background none logo.svg -resize 16x16 icon16.png
```

## Design Guidelines

**Chrome Web Store:**
- Use simple, recognizable icon
- High contrast works best
- Avoid text in small sizes (16px)
- Use your brand colors

**Firefox Add-ons:**
- Same guidelines as Chrome
- Ensure icons are crisp at all sizes
- Test on light and dark backgrounds

## Temporary Testing

For testing without icons, the extension will still work but show a default puzzle piece icon. Create proper icons before publishing to the stores.
