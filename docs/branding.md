# Anatomeme identity

The selected design direction is **Odd little atlas**: Space Grotesk, midnight
surfaces, blue actions, coral details, and soft 12 px controls / 20 px panels.

The approved identity is **Little Skull + Muscle**: an ivory skull, a blue left
socket, a dark right socket, a small coral temple muscle patch, and a toothy grin.
It is original procedural artwork made from polygons, ellipses, and strokes.
Keep the simple silhouette and the small size of the muscle accent.

| Role | Color |
|---|---|
| Midnight / app background | `#17191d` |
| Panel | `#202329` |
| Raised surface | `#292e36` |
| Border | `#424953` |
| Muted text | `#a3adba` |
| Skull ink | `#16191d` |
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
renderer; no image-generation service is involved. The browser uses the self-hosted variable Space Grotesk Latin WOFF2 in
`public/fonts/`, with its SIL Open Font License. The generator uses the bundled
400/700 static TTF instances in `scripts/fonts/` and converts SVG lettering to
paths, so SVG and PNG exports retain the chosen type without installed desktop
fonts. The readable lettering and layout stay in the generator source. Commit
the generated files so production builds do not require asset generation.

`src/identity.css` defines the shared palette and applies it to quiz, study,
settings/account dialogs, and the meme library while preserving component
layout and anatomy rendering. Body instructions are 16 px (14–15 px on narrower
layouts), primary question headings are 36 px / 700, and controls use 12–15 px.
The privacy and terms pages load the same local font stylesheet.

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
