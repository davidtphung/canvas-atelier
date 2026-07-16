/**
 * Rasterize brand SVGs to PNG for favicon / Apple touch / Open Graph.
 * Run: node scripts/render-brand-assets.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function render(svgName, outName, width) {
  const svg = readFileSync(join(publicDir, svgName), 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: 'transparent',
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'Arial',
    },
  });
  const png = resvg.render().asPng();
  writeFileSync(join(publicDir, outName), png);
  console.log(`wrote public/${outName} (${width}px, ${png.length} bytes)`);
}

render('favicon.svg', 'favicon-32.png', 32);
render('favicon.svg', 'favicon-192.png', 192);
render('apple-touch-icon.svg', 'apple-touch-icon.png', 180);
render('og.svg', 'og.png', 1200);
console.log('Brand assets ready.');
