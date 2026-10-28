/* global process, console, performance, setInterval, clearInterval, Buffer */
// Node-only harness: run against the compiled backend in an isolated directory.
// No credentials, HTTP listeners, database writes, or production service changes.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const load = createRequire(import.meta.url);
const { WorkerSaveValidator } = load('../../dist/src/modules/richman/save-validator.js');

async function main() {
  const save = readFileSync(resolve(process.argv[2]), 'utf8');
  let last = performance.now(), maxTimerDelayMs = 0, timerTicks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    maxTimerDelayMs = Math.max(maxTimerDelayMs, now - last - 20);
    last = now; timerTicks++;
  }, 20);
  const start = performance.now();
  let revision = null, errorCode = null;
  try {
    const summary = await new WorkerSaveValidator().validate(save);
    revision = summary.revision;
  } catch (error) {
    errorCode = error.code ?? error.name;
    process.exitCode = 1;
  } finally {
    clearInterval(timer);
    console.log(JSON.stringify({
      node: process.version, platform: process.platform, arch: process.arch,
      bytes: Buffer.byteLength(save), sha256: createHash('sha256').update(save).digest('hex'),
      revision, errorCode, restoreMs: Math.round(performance.now() - start),
      maxTimerDelayMs: Math.round(maxTimerDelayMs), timerTicks,
    }));
  }
}
void main().catch(error => { console.error(error.code ?? error.name); process.exitCode = 1; });
