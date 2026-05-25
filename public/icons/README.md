# PWA Icons

This directory should contain the following PNG icons for full PWA support:

- `icon-192.png` (192x192) — standard icon
- `icon-512.png` (512x512) — large icon
- `icon-maskable.png` (512x512) — maskable variant with safe zone

## How to generate from the SVG

The repository ships `public/favicon.svg` as the source of truth. To regenerate the PNGs:

### Option A — Online (fast, no install)

1. Go to <https://realfavicongenerator.net> or <https://maskable.app/editor>
2. Upload `public/favicon.svg`
3. Download the generated icons and place them in `public/icons/`

### Option B — Locally with `sharp-cli`

```bash
npm i -g sharp-cli
sharp -i public/favicon.svg -o public/icons/icon-192.png resize 192 192
sharp -i public/favicon.svg -o public/icons/icon-512.png resize 512 512
sharp -i public/favicon.svg -o public/icons/icon-maskable.png resize 512 512
```

### Option C — Skip for development

The app will still build and run without these files. PWA install prompts may not appear and Lighthouse PWA score will be lower. Add them before production deploy.
