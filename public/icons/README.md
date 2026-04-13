# PWA Icons

Current icons are **SVG-based** so they scale cleanly without rasterization.
Modern browsers (Chrome 90+, Edge, Safari 17+) support SVG in manifest.

## Files

- `icon.svg` — primary icon (any purpose)
- `icon-maskable.svg` — maskable variant with safe-zone padding for Android
  adaptive icons

## For production / wider compatibility

Older Android and some iOS versions prefer rasterized PNGs. To generate:

```bash
# Using ImageMagick:
convert -background none -resize 192x192 icon.svg icon-192.png
convert -background none -resize 512x512 icon.svg icon-512.png
convert -background none -resize 512x512 icon-maskable.svg icon-512-maskable.png

# Using sharp (npm):
npx @squoosh/cli --resize '{"width":192,"height":192}' icon.svg
```

Then update `app/manifest.ts` to reference the PNG variants alongside the SVG.
