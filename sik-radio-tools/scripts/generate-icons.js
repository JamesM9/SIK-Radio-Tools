/**
 * Generate PNG icons at 16, 48, and 128 px (favicon / UI).
 * Run: node scripts/generate-icons.js
 */

const path = require('path');
const { Jimp } = require('jimp');

const sizes = [16, 48, 128];
const assetsDir = path.join(__dirname, '..', 'assets', 'icons');
require('fs').mkdirSync(assetsDir, { recursive: true });

// Blue placeholder color (RGBA)
const COLOR = 0x0066ccff;

async function main() {
  for (const size of sizes) {
    const image = new Jimp({ width: size, height: size, color: COLOR });
    const dest = path.join(assetsDir, `icon${size}.png`);
    await image.write(dest);
    console.log('Created', dest);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
