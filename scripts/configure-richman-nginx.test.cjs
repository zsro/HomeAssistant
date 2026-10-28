const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { configure, install } = require('./configure-richman-nginx.cjs');
const input = 'server {\n    location /api/ {\n        proxy_pass http://127.0.0.1:3001/api/;\n    }\n}\n';
test('configures both public API servers and leaves redirects untouched', () => {
  const redirect = 'server {\n    return 301 https://$host$request_uri;\n}\n';
  const result = configure(input + redirect + input);
  assert.equal(result.match(/include .*nginx-richman-saves.conf;/g).length, 2);
  assert.ok(result.includes(redirect));
  assert.equal(result.match(/proxy_pass/g).length, 2);
  assert.equal(configure(result), result);
});
test('rejects missing, partial, or custom configuration without rewriting', () => {
  assert.throws(() => configure('server {}'), /No public API/);
  assert.throws(() => configure(configure(input) + input), /Partial/);
  assert.throws(() => configure(input + 'location /api/v1/richman/saves {}'), /custom/);
});
test('failed nginx validation restores both configuration files before reloading the old configuration', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'richman-nginx-test-'));
  const configPath = path.join(directory, 'nginx.conf'), snippetPath = path.join(directory, 'snippet.conf'), sourcePath = path.join(directory, 'source.conf');
  try {
    fs.writeFileSync(configPath, input); fs.writeFileSync(snippetPath, 'old snippet'); fs.writeFileSync(sourcePath, 'new snippet');
    const calls = [];
    assert.throws(() => install({ configPath, snippetPath, sourcePath, run: args => {
      calls.push(args);
      if (calls.length === 1) throw Error('invalid nginx config');
      assert.equal(fs.readFileSync(configPath, 'utf8'), input);
      assert.equal(fs.readFileSync(snippetPath, 'utf8'), 'old snippet');
    } }), /invalid nginx/);
    assert.deepEqual(calls, [['-t'], ['-t'], ['-s', 'reload']]);
    assert.equal(fs.readdirSync(directory).filter(name => name.includes('.backup-')).length, 2);
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});
