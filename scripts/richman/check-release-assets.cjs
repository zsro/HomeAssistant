/** Verify local resource inputs or the resources bundled in the committed frontend release. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = process.argv[2] || path.resolve(__dirname, '../../frontend/public/richman/generated');
const manifest = require('./release-assets.json');
if (manifest.version !== 1 || !manifest.files?.length) throw Error('Invalid resource release manifest');
for (const entry of manifest.files) {
  if (path.isAbsolute(entry.path) || entry.path.split('/').includes('..')) throw Error('Invalid resource path');
  const file = path.join(root, entry.path);
  if (!fs.existsSync(file) || !fs.lstatSync(file).isFile()) throw Error('Missing resource: ' + entry.path);
  const data = fs.readFileSync(file);
  if (data.length !== entry.bytes || crypto.createHash('sha256').update(data).digest('hex') !== entry.sha256) throw Error('Resource hash mismatch: ' + entry.path);
}
console.log(`Richman resource package verified: ${manifest.files.length} files`);
