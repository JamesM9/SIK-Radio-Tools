const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

// Copy assets
const assetsSrc = path.join(root, 'assets');
const assetsDest = path.join(dist, 'assets');
if (fs.existsSync(assetsSrc)) {
  fs.mkdirSync(path.dirname(assetsDest), { recursive: true });
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });
}

// Copy CSS (tsc doesn't handle CSS)
const cssSrc = path.join(root, 'src', 'app.css');
const cssDest = path.join(dist, 'app.css');
if (fs.existsSync(cssSrc)) {
  fs.copyFileSync(cssSrc, cssDest);
}
