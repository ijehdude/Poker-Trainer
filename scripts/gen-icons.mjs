/**
 * Generate PWA PNG icons + OG image from an inline SVG using sharp.
 * Run with: node scripts/gen-icons.mjs
 * (Dev-only tooling; the generated PNGs are committed to /public.)
 */
import sharp from 'sharp';

const icon = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="r" x1="0" y1="0" x2="512" y2="512">
      <stop offset="0" stop-color="#5dffba"/>
      <stop offset="0.55" stop-color="#3ef2a1"/>
      <stop offset="1" stop-color="#e7c46a"/>
    </linearGradient>
    <radialGradient id="f" cx="0.5" cy="0.4" r="0.75">
      <stop offset="0" stop-color="#16412f"/>
      <stop offset="1" stop-color="#0a0e0c"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="#0a0e0c"/>
  <circle cx="256" cy="256" r="196" fill="url(#f)" stroke="url(#r)" stroke-width="22"/>
  <path d="M256 140c48 49 96 81 96 129 0 32-24 53-53 53-15 0-29-6-37-17 2 21 10 36 24 48h-60c15-12 22-27 24-48-8 11-22 17-37 17-29 0-53-21-53-53 0-48 48-80 96-129Z" fill="#f2f6f3"/>
</svg>`;

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(Buffer.from(icon(size))).png().toFile(`public/icon-${size}.png`);
  console.log(`wrote public/icon-${size}.png`);
}

// Apple touch icon (180, opaque)
await sharp(Buffer.from(icon(180))).png().toFile('public/apple-icon.png');
console.log('wrote public/apple-icon.png');

// favicon.ico fallback (32)
await sharp(Buffer.from(icon(32))).png().toFile('public/favicon-32.png');
console.log('done');
