// Original procedural artwork. Keep this geometry as the source of truth.
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const output = fileURLToPath(new URL('../public/', import.meta.url));
const ink = '#16191d', bone = '#f4efe4', blue = '#85d5f6', coral = '#ef9685', fiber = '#b76158';
const mark = `
<path fill="${bone}" d="M50 2 34 3 20 10 10 22 5 36 5 51 9 62 21 69 23 82 31 91 69 91 77 82 79 69 91 62 95 51 95 36 90 22 80 10 66 3Z"/>
<path fill="${coral}" d="M72 6 80 10 90 22 95 36 95 51 91 59 84 59 87 49 87 40 84 33 78 27 73 20Z"/>
<path fill="none" stroke="${fiber}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" d="M78 14 80 22 87 29 91 39 91 49 M78 23 81 32 87 39 88 49 87 54"/>
<ellipse fill="${blue}" cx="31.5" cy="45" rx="12.5" ry="13"/>
<ellipse fill="${ink}" cx="68.5" cy="45" rx="12.5" ry="13"/>
<path fill="${ink}" d="M50 59 44 69 56 69Z"/>
<path fill="none" stroke="${ink}" stroke-linecap="round" stroke-width="4" d="M34 79H66"/>
<path fill="none" stroke="${ink}" stroke-linecap="round" stroke-width="3" d="M43 75V84 M57 75V84"/>`;

const svg = (w, h, content, title = 'Anatomeme') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title>${content}</svg>\n`;
const badge = (round = false, padding = 8) => svg(100, 100, `<rect width="100" height="100" rx="${round ? 22 : 0}" fill="${ink}"/><g transform="translate(${padding} ${padding + 2}) scale(${(100 - 2 * padding) / 100})">${mark}</g>`);
await mkdir(`${output}brand`, { recursive: true });
await writeFile(`${output}brand/mark.svg`, svg(100, 100, mark, 'Anatomeme skull with a blue eye and a coral muscle patch'));
await writeFile(`${output}favicon.svg`, badge(true));
await writeFile(`${output}brand/wordmark.svg`, svg(650, 120, `<g transform="translate(4 10)">${mark}</g><text x="126" y="83" fill="${bone}" font-family="Arial,Helvetica,sans-serif" font-size="76" font-weight="700" letter-spacing="-3">anatomeme</text>`));

const social = svg(1200, 630, `<rect width="1200" height="630" fill="${ink}"/>
<circle cx="1000" cy="215" r="165" fill="#202a32"/>
<g transform="translate(845 105) scale(3.1)">${mark}</g>
<g font-family="Arial,Helvetica,sans-serif">
<text x="64" y="78" fill="${blue}" font-size="24" font-weight="700">anato.meme</text>
<text x="64" y="290" fill="${bone}" font-size="100" letter-spacing="-4" font-weight="700">anatomeme</text>
<text x="68" y="363" fill="${bone}" font-size="38" font-weight="500">Anatomy that sticks.</text>
<text x="68" y="417" fill="#a0a9b7" font-size="25">Real 3D anatomy. Practice. Repeat.</text>
<text x="68" y="563" fill="${blue}" font-size="19" letter-spacing="2">MUSCLES / BONES / LANDMARKS</text>
</g>`, 'Anatomeme — Anatomy that sticks.');
await writeFile(`${output}brand/og-image.svg`, social);

function raster(source, width) {
  return new Resvg(source, { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true, defaultFontFamily: 'Arial' } }).render().asPng();
}
await writeFile(`${output}brand/og-image.png`, raster(social, 1200));
await writeFile(`${output}brand/mark-512.png`, raster(svg(100, 100, mark), 512));
for (const size of [16, 32, 48]) await writeFile(`${output}brand/favicon-${size}.png`, raster(badge(true), size));
for (const size of [192, 512]) await writeFile(`${output}brand/icon-${size}.png`, raster(badge(), size));
await writeFile(`${output}brand/icon-maskable-512.png`, raster(badge(false, 18), 512));
await writeFile(`${output}apple-touch-icon.png`, raster(badge(), 180));

// PNG-compressed ICO entries give older browsers a conventional /favicon.ico.
const sizes = [16, 32, 48], images = sizes.map(size => raster(badge(true), size));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
let offset = header.length;
for (let i = 0; i < images.length; i++) {
  const at = 6 + i * 16;
  header[at] = sizes[i]; header[at + 1] = sizes[i];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(images[i].length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += images[i].length;
}
await writeFile(`${output}favicon.ico`, Buffer.concat([header, ...images]));
await writeFile(`${output}site.webmanifest`, JSON.stringify({
  id: '/', name: 'Anatomeme', short_name: 'Anatomeme',
  description: '3D anatomy practice. Anatomy that sticks.',
  start_url: '/', scope: '/', display: 'standalone',
  background_color: ink, theme_color: ink,
  icons: [
    { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2) + '\n');
console.log('Built Anatomeme SVGs, PNG icons, ICO, app manifest, and 1200 × 630 social image.');
