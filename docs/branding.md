# Anatomeme identity

The approved identity is **Little Skull + Muscle**: an ivory skull, a blue left
socket, a dark right socket, a small coral temple muscle patch, and a toothy grin.
It is original procedural artwork made from polygons, ellipses, and strokes.
Keep the simple silhouette and the small size of the muscle accent.

| Role | Color |
|---|---|
| Ink / background | `#16191d` |
| Bone | `#f4efe4` |
| Target blue | `#85d5f6` |
| Muscle coral | `#ef9685` |
| Muscle fibers | `#b76158` |

The source of truth is `scripts/build-brand-assets.mjs`. Regenerate with:

```sh
npm ci
npm run brand:build
```

The SVG source stays editable. PNG exports use the development-only resvg
renderer; no image-generation service is involved. Text exports use the system's
Arial/Helvetica sans font. Commit the generated files so production builds do
not require an asset-generation step or installed desktop fonts.

The app header and account-loading screen share `BrandMark`. The privacy and
terms pages use the same SVG. Public assets include:

- `brand/mark.svg` and `brand/mark-512.png`: standalone mark.
- `brand/wordmark.svg`: horizontal logo on dark backgrounds.
- `favicon.svg`, `favicon.ico`, and 16/32/48 px PNGs: browser icons.
- `apple-touch-icon.png`: opaque 180 px home-screen icon.
- `brand/icon-192.png`, `brand/icon-512.png`, and a padded maskable variant.
- `site.webmanifest`: app name, colors, and home-screen icons.
- `brand/og-image.svg` and `brand/og-image.png`: editable and raster social cards.

Open Graph and Twitter metadata use the absolute production PNG URL at
`https://anato.meme/brand/og-image.png`. Social crawlers can cache old previews;
their first fetch after deployment may determine when a new preview appears.
