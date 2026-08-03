/**
 * Stage a minimal static frontend for the Tauri bundle (index.html + dist only).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'desktop-www');

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(outDir, 'index.html'));
copyDir(path.join(root, 'dist'), path.join(outDir, 'dist'));

console.log('Staged desktop frontend in desktop-www/');
