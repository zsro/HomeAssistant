const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync, spawnSync } = require('node:child_process');

test('committed release works without source assets and rejects stale or damaged packages', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-release-test-'));
  const write = (file, data) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), data);
  };
  const command = mode => spawnSync(process.execPath, ['scripts/frontend-release.cjs', mode], { cwd: root, encoding: 'utf8' });
  const succeeds = mode => {
    const result = command(mode);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  const rejects = pattern => {
    const result = command('verify');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, pattern);
  };
  try {
    for (const file of ['frontend-release.cjs', 'richman/check-release-assets.cjs']) {
      write('scripts/' + file, fs.readFileSync(path.join(__dirname, file)));
    }
    write('.gitignore', 'frontend/dist/\nfrontend/public/richman/generated/\n');
    write('frontend/package.json', JSON.stringify({ scripts: { build: 'node build.cjs' } }));
    write('frontend/index.html', '<html>release test</html>');
    write('shared/richman/rules.ts', 'export const version = 1;');
    write('frontend/obsolete.json', '{}');
    write('frontend/build.cjs', "const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('index.html','dist/index.html');");
    write('frontend/public/richman/generated/resource.bin', 'resource');
    write('scripts/richman/release-assets.json', JSON.stringify({ version: 1, files: [{ path: 'resource.bin', bytes: 8, sha256: createHash('sha256').update('resource').digest('hex') }] }));
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    fs.unlinkSync(path.join(root, 'frontend/obsolete.json'));
    succeeds('build');
    // Staging the deletion after packaging must preserve the working-tree source hash.
    execFileSync('git', ['add', '-u'], { cwd: root });
    // Simulate a server checkout without separately copied, ignored game assets.
    fs.rmSync(path.join(root, 'frontend/public/richman/generated'), { recursive: true });
    succeeds('verify');
    write('shared/richman/rules.ts', 'export const version = 2;');
    rejects(/Frontend source changed/);
    write('shared/richman/rules.ts', 'export const version = 1;');
    write('frontend/index.html', '<html>changed</html>');
    rejects(/Frontend source changed/);
    write('frontend/index.html', '<html>release test</html>');
    write('release/frontend/index.html', 'tampered');
    rejects(/missing, extra, or modified/);
    fs.unlinkSync(path.join(root, 'release/frontend/index.html'));
    rejects(/missing, extra, or modified/);
    write('release/frontend/index.html', '<html>release test</html>');
    write('release/frontend/extra.txt', 'extra');
    rejects(/missing, extra, or modified/);
    fs.unlinkSync(path.join(root, 'release/frontend/extra.txt'));
    fs.symlinkSync('index.html', path.join(root, 'release/frontend/link.html'));
    rejects(/Symlink not allowed/);
    fs.unlinkSync(path.join(root, 'release/frontend/link.html'));
    const manifest = fs.readFileSync(path.join(root, 'release/frontend-manifest.json'));
    assert.notEqual(command('build').status, 0, 'missing local assets must block packaging');
    assert.deepEqual(fs.readFileSync(path.join(root, 'release/frontend-manifest.json')), manifest);
    succeeds('verify');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
