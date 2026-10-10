/** Local build and dependency-free production verification of the committed frontend. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '..');
const release = path.join(repo, 'release');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const run = (command, args) => execFileSync(command, args, { cwd: repo, stdio: 'inherit' });

function files(root, prefix = '') {
  return fs.readdirSync(root).sort().flatMap(name => {
    const relative = prefix + name;
    const full = path.join(root, name);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) throw Error(`Symlink not allowed: ${relative}`);
    if (stat.isDirectory()) return files(full, relative + '/');
    if (!stat.isFile()) throw Error(`Not a regular file: ${relative}`);
    return [{ path: relative, bytes: stat.size, sha256: sha(fs.readFileSync(full)) }];
  });
}

function sourceHash() {
  const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'frontend'], { cwd: repo }).toString().split('\0').filter(Boolean);
  names.push('scripts/richman/release-assets.json', 'scripts/frontend-release.cjs');
  return sha(JSON.stringify([...new Set(names)].sort().map(name => [name, sha(fs.readFileSync(path.join(repo, name)))])));
}

function verify(root = release) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'frontend-manifest.json'), 'utf8'));
  if (manifest.version !== 1 || !manifest.files?.length) throw Error('Invalid frontend release manifest');
  if (manifest.sourceHash !== sourceHash()) throw Error('Frontend source changed: run npm run release:frontend before committing');
  const actual = files(path.join(root, 'frontend'));
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw Error('Frontend release has missing, extra, or modified files');
  if (!actual.some(file => file.path === 'index.html')) throw Error('Missing frontend index.html');
  run(process.execPath, ['scripts/richman/check-release-assets.cjs', path.join(root, 'frontend/richman/generated')]);
  console.log(`Frontend release verified: ${actual.length} files, source ${manifest.sourceHash}`);
}

function build() {
  // This deployment uses same-origin /api. Local environment overrides must not leak into releases.
  for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
    if (fs.existsSync(path.join(repo, 'frontend', name))) throw Error(`Remove frontend/${name} before release build (environment overrides unsupported)`);
  }
  if (Object.keys(process.env).some(key => key.startsWith('VITE_'))) throw Error('Unset VITE_* overrides before release build');
  run(process.execPath, ['scripts/richman/check-release-assets.cjs']);
  const before = sourceHash();
  run('npm', ['--prefix', 'frontend', 'run', 'build']);
  if (sourceHash() !== before) throw Error('Frontend sources changed during build; retry');
  const staging = fs.mkdtempSync(path.join(repo, '.frontend-release-'));
  try {
    const output = path.join(staging, 'frontend');
    fs.cpSync(path.join(repo, 'frontend/dist'), output, { recursive: true });
    // Export diagnostics such as contact sheets are not runtime resources.
    const resources = path.join(output, 'richman/generated');
    fs.rmSync(resources, { recursive: true, force: true });
    for (const entry of JSON.parse(fs.readFileSync(path.join(repo, 'scripts/richman/release-assets.json'), 'utf8')).files) {
      const destination = path.join(resources, entry.path);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(repo, 'frontend/public/richman/generated', entry.path), destination);
    }
    fs.writeFileSync(path.join(staging, 'frontend-manifest.json'), JSON.stringify({ version: 1, sourceHash: before, files: files(output) }, null, 2) + '\n');
    verify(staging);
    fs.mkdirSync(release, { recursive: true });
    fs.rmSync(path.join(release, 'frontend'), { recursive: true, force: true });
    fs.renameSync(output, path.join(release, 'frontend'));
    fs.renameSync(path.join(staging, 'frontend-manifest.json'), path.join(release, 'frontend-manifest.json'));
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

try {
  if (process.argv[2] === 'build') build();
  else if (process.argv[2] === 'verify') verify();
  else throw Error('Usage: node scripts/frontend-release.cjs build|verify');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
