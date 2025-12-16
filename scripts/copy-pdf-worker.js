const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.js');
const destDir = path.resolve(__dirname, '..', 'public');
const dest = path.join(destDir, 'pdf.worker.min.js');

try {
  if (!fs.existsSync(src)) {
    console.error('Source worker not found at', src);
    process.exit(2);
  }
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  console.log('Copied pdf.worker.min.js to', dest);
} catch (err) {
  console.error('Failed to copy pdf.worker.min.js:', err);
  process.exit(1);
}
