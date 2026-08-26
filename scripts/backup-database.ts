import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, mkdtemp, readdir, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';
import { loadConfig } from '../src/config/env';

function optionValue(value: string): string {
  return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

async function runDump(configFile: string, database: string, target: string) {
  const dump = spawn('mysqldump', [
    `--defaults-extra-file=${configFile}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--set-gtid-purged=OFF',
    database,
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  const gzip = createGzip({ level: 9 });
  const output = createWriteStream(target, { mode: 0o600 });
  const childCompleted = new Promise<void>((resolve, reject) => {
    let stderr = '';
    dump.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    dump.once('error', reject);
    dump.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mysqldump 失败 (${code}): ${stderr.trim()}`));
    });
  });
  await Promise.all([pipeline(dump.stdout, gzip, output), childCompleted]);
}

async function removeOldBackups(directory: string, keep: number) {
  const names = (await readdir(directory)).filter((name) => name.startsWith('homeAssistantDB-') && name.endsWith('.sql.gz'));
  const files = await Promise.all(names.map(async (name) => {
    const absolutePath = path.join(directory, name);
    return { absolutePath, mtime: (await stat(absolutePath)).mtimeMs };
  }));
  files.sort((left, right) => right.mtime - left.mtime);
  await Promise.all(files.slice(keep).map(({ absolutePath }) => unlink(absolutePath)));
}

async function main() {
  const config = loadConfig();
  const backupDirectory = process.env.BACKUP_DIR ?? '/var/lib/home-assistant/backups';
  const timestamp = new Date().toISOString().replaceAll(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const target = path.join(backupDirectory, `homeAssistantDB-${timestamp}.sql.gz`);
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'ha-db-backup-'));
  const optionFile = path.join(temporaryDirectory, 'client.cnf');

  try {
    await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
    await writeFile(optionFile, [
      '[client]',
      `host=${optionValue(config.database.host)}`,
      `port=${config.database.port}`,
      `user=${optionValue(config.database.user)}`,
      `password=${optionValue(config.database.password)}`,
      '',
    ].join('\n'), { mode: 0o600 });
    await chmod(optionFile, 0o600);
    try {
      await runDump(optionFile, config.database.name, target);
    } catch (error) {
      await unlink(target).catch(() => undefined);
      throw error;
    }
    await removeOldBackups(backupDirectory, 5);
    console.log(`数据库备份完成: ${target}`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
