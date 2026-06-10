# Brand assets

## logo.svg

Square mark, 128×128 viewBox. Use as-is in markdown:

```md
<img src="./assets/logo.svg" width="48"/>
```

## social-preview.svg

1280×640 — the size GitHub uses for the og:image on repo cards. GitHub requires a **PNG or JPG** in Settings → Social preview, so convert before uploading:

```bash
# macOS / Linux with rsvg-convert (brew install librsvg)
rsvg-convert -w 1280 -h 640 assets/social-preview.svg -o /tmp/social-preview.png

# Or ImageMagick
convert -density 144 assets/social-preview.svg /tmp/social-preview.png

# Or any online SVG→PNG converter
```

Then in GitHub:

1. Repo → Settings → Social preview → Edit
2. Upload `/tmp/social-preview.png`
3. Save

Verify by sharing the repo URL in Slack / X — the new card should appear within a few minutes (X caches aggressively; use the [Card Validator](https://cards-dev.twitter.com/validator) to force a refresh).

## Colors

| Token | Hex | Use |
|---|---|---|
| flame-bright | `#FFCA28` | Top of gradient |
| flame-mid    | `#FFA000` | Brand primary, accents |
| flame-deep   | `#F57C00` | Bottom of gradient |
| ink          | `#0F1419` | Dark background |
| ink-blue     | `#1A1A2E` | Bottom of bg gradient |
| paper        | `#FFFFFF` | Headings on dark |
| text-muted   | `#9E9E9E` | Secondary text |
