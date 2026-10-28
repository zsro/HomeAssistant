/* eslint-env node */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const CONFIG = '/etc/nginx/conf.d/home-assistant.conf';
const SNIPPET = '/var/lib/home-assistant/shared/nginx-richman-saves.conf';

function configure(text) {
  const include = `include ${SNIPPET};`;
  const locations = [...text.matchAll(/^(\s*)location \/api\/ \{/gm)];
  if (!locations.length) throw Error('No public API proxy locations found; refusing to guess Nginx structure');
  if (text.includes(include)) {
    if (text.split(include).length - 1 !== locations.length) throw Error('Partial Richman Nginx configuration; inspect before deploying');
    return text;
  }
  if (text.includes('/api/v1/richman/saves')) throw Error('Existing custom save location needs inspection');
  return text.replace(/^([ \t]*)location \/api\/ \{/gm, `$1${include}\n\n$1location /api/ {`);
}

function install({ configPath = CONFIG, snippetPath = SNIPPET,
  sourcePath = path.join(__dirname, '../deployment/nginx-richman-saves.conf'),
  run = args => execFileSync('nginx', args, { stdio: 'inherit' }) } = {}) {
  const previous = fs.readFileSync(configPath, 'utf8');
  const next = configure(previous);
  const oldSnippet = fs.existsSync(snippetPath) ? fs.readFileSync(snippetPath) : null;
  const snippet = fs.readFileSync(sourcePath);
  const backup = `${configPath}.backup-${Date.now()}`;
  fs.copyFileSync(configPath, backup);
  if (oldSnippet) fs.copyFileSync(snippetPath, `${backup}.snippet`);
  try {
    fs.writeFileSync(snippetPath, snippet, { mode: 0o644 });
    fs.writeFileSync(configPath, next);
    run(['-t']);
    run(['-s', 'reload']);
    console.log(`Richman save proxy configured; backup=${backup}`);
  } catch (error) {
    fs.writeFileSync(configPath, previous);
    if (oldSnippet) fs.writeFileSync(snippetPath, oldSnippet);
    else if (fs.existsSync(snippetPath)) fs.unlinkSync(snippetPath);
    run(['-t']);
    run(['-s', 'reload']);
    throw error;
  }
}
module.exports = { configure, install };
if (require.main === module) install();
