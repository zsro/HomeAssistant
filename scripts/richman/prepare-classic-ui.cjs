/** Promote only assets used by the implemented UI stages, checking audited hashes. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const audit = JSON.parse(fs.readFileSync(path.join(root, 'docs/richman/original-ui-resource-audit.json')));
const additional = JSON.parse(fs.readFileSync(path.join(root, 'docs/richman/ui04/additional-assets.json')));
const business = JSON.parse(fs.readFileSync(path.join(root, 'docs/richman/ui05/additional-assets.json')));
const events = JSON.parse(fs.readFileSync(path.join(root, 'docs/richman/ui06/additional-assets.json')));
const files = [];
for (const resource of [...audit.resources, ...additional.resources, ...business.resources, ...events.resources]) {
  const selected = resource.id === 'Data-1' ? resource.graph.frames
    : resource.id === 'Data-3' ? resource.graph.frames.filter(f => f.index === 0)
    : resource.id === 'Panel-66' ? resource.graph.frames
    : resource.id === 'Panel-18' ? resource.graph.frames.filter(f => [0, 1].includes(f.index))
    : resource.id === 'Panel-26' ? resource.graph.frames.filter(f => [0, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].includes(f.index))
    : resource.id === 'Panel-1' ? resource.graph.frames
    : resource.id === 'Panel-0' ? resource.graph.frames.slice(0, 4)
    : resource.id === 'Panel-2' ? resource.graph.frames.slice(0, 8)
    : resource.id === 'Panel-7' ? resource.graph.frames
    : resource.id === 'Data-399' ? resource.graph.frames
    : resource.id === 'Data-476' ? resource.graph.frames.filter(f => f.index === 5)
    : resource.id === 'Panel-23' ? resource.graph.frames.filter(f => [0, 16, 17].includes(f.index))
    : resource.id === 'Panel-11' ? resource.graph.frames.filter(f => f.index <= 14)
    : resource.id === 'Panel-10' ? resource.graph.frames.filter(f => [0, 2, 16, 18].includes(f.index))
    : resource.id === 'Panel-71' ? resource.graph.frames.filter(f => [0, 2].includes(f.index))
    : resource.id === 'Panel-12' ? resource.graph.frames.filter(f => [0, 1].includes(f.index))
    : ['Panel-63', 'Panel-65', 'Panel-73', 'Panel-75', 'Panel-76'].includes(resource.id) ? resource.graph.frames.filter(f => f.index === 0)
    : resource.id === 'Panel-21' ? resource.graph.frames.filter(f => (f.index === 2 || (f.index >= 4 && f.index <= 15))) : [];
  for (const frame of selected) {
    const relative = 'ui/' + frame.path;
    const data = fs.readFileSync(path.join(root, 'frontend/public/richman/generated', relative));
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    if (sha256 !== frame.pngSha256) throw Error('Unaudited UI pixels: ' + relative);
    files.push({ path: relative, bytes: data.length, sha256 });
  }
}
const mask = fs.readFileSync(path.join(root, 'frontend/public/richman/generated/ui/go-hit-mask.bin'));
const maskAudit = audit.nonGraphs.find(r => r.archive === 'Panel.mkf' && r.index === 8);
if (mask.length !== 72 * 67 || crypto.createHash('sha256').update(mask).digest('hex') !== maskAudit.sha256) throw Error('Unaudited GO mask');
// Preserve every pixel of the native hit mask as horizontal SVG path runs.
const maskPaths = {};
for (const value of [1, 2, 3]) {
  let d = '';
  for (let y = 0; y < 67; y++) for (let x = 0; x < 72; x++) {
    if (mask[y * 72 + x] !== value) continue;
    const start = x;
    while (x + 1 < 72 && mask[y * 72 + x + 1] === value) x++;
    d += `M${start} ${y}h${x - start + 1}v1h-${x - start + 1}z`;
  }
  maskPaths[value] = d;
}
const titleAudit = JSON.parse(fs.readFileSync(path.join(root, 'docs/richman/ui07/native-evidence.json')));
const titleFrames = audit.resources.find(r => r.id === 'Data-1').graph.frames;
const catalog = {
  title: titleAudit.title.map(item => ({ ...item, normal: titleFrames[item.normal], hover: titleFrames[item.hover] })),
  go: { initialRect: audit.go.initialRect, maskSha256: maskAudit.sha256, maskPaths },
  source: 'UI-00 / original-ui-resource-audit.json',
  archiveSha256: audit.sources['Panel.mkf'].sha256,
  toolbar: audit.toolbar.map(button => ({ id: button.id, label: button.label, index: button.index,
    states: Object.fromEntries(['normal', 'hover'].map(state => [state, button.states[state]])) })),
  files: files.map(file => file.path),
};
fs.writeFileSync(path.join(root, 'frontend/src/features/richman/classic-ui-art.json'), JSON.stringify(catalog, null, 2) + '\n');
const manifestPath = path.join(root, 'scripts/richman/release-assets.json');
const release = JSON.parse(fs.readFileSync(manifestPath));
const paths = new Set(files.map(file => file.path));
release.files = [...release.files.filter(file => !paths.has(file.path)), ...files].sort((a, b) => a.path.localeCompare(b.path, 'en'));
fs.writeFileSync(manifestPath, JSON.stringify(release, null, 2) + '\n');
console.log(`Prepared ${files.length} audited UI assets`);
