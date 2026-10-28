/**
 * SAVE-03 real browser + cloud MySQL acceptance. Run from repo root:
 * DB_NAME=homeAssistantDB_test JWT_ACCESS_SECRET=<local-test-only-secret> \
 * PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node --import tsx scripts/richman/verify-save-product.mjs
 * Creates unique test owners and removes only their rows, never resets tables.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Op } = require('sequelize');
const { createApp } = require('../../src/app.ts');
const { loadConfig } = require('../../src/config/env.ts');
const { createSequelize } = require('../../src/database/sequelize.ts');
const { initModels } = require('../../src/database/models/index.ts');
const { createMigrator } = require('../../src/database/migrator.ts');
const { hashPassword } = require('../../src/modules/auth/password.ts');
const { generateInviteCode } = require('../../src/modules/auth/invite-code.ts');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const config = loadConfig();
assert.equal(config.database.name, 'homeAssistantDB_test', 'Only isolated cloud test database is allowed');
config.logLevel = 'silent';
const sequelize = createSequelize(config), models = initModels(sequelize);
const owners = [], checks = [], failures = [];
const output = path.resolve('docs/richman/save03');
let server, vite, browser, currentPage;
const report = (name, details = {}) => { checks.push({ name, ...details }); console.log(`PASS ${name}`); };
const waitUntil = async (fn, timeout = 30_000) => {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await fn()) return; await new Promise(r => setTimeout(r, 150)); }
  throw new Error('Timed out waiting for acceptance condition');
};
const dialog = page => page.locator('.rm-system-dialog[open]');
const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
const enter = async page => {
  currentPage = page;
  await page.goto('http://127.0.0.1:5173/modules/richman');
  await page.getByRole('button', { name: 'START · 新建对局' }).waitFor({ timeout: 60_000 });
};
const login = async (page, owner) => {
  currentPage = page;
  await page.goto('http://127.0.0.1:5173/login');
  await page.getByLabel('用户名', { exact: true }).fill(owner.username);
  await page.getByLabel('密码', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: /进入我的空间/ }).click();
  await page.waitForURL('http://127.0.0.1:5173/');
};
const openSave = async page => {
  const decision = page.locator('.rm-game-window[open]');
  if (await decision.count()) await decision.getByRole('button', { name: '存档', exact: true }).click();
  else await page.locator('[data-tool="save"]').click();
  await dialog(page).getByRole('button', { name: '保存到手动存档 1', exact: true }).waitFor();
  await waitUntil(() => dialog(page).getByRole('button', { name: '保存到手动存档 1', exact: true }).isEnabled());
};
const closeSystem = async page => {
  while (await dialog(page).count()) await dialog(page).locator('.rm-system-header button').click();
};
const save = async (page, slot, overwrite = false) => {
  await click(page, `保存到手动存档 ${slot}`);
  if (overwrite) await click(page, '确认覆盖');
};
const saved = page => dialog(page).getByRole('status').filter({ hasText: '已保存' }).waitFor({ timeout: 45_000 });
const revision = async (owner, slot) => {
  const pointer = await models.RichmanSaveSlot.findOne({ where: { ownerId: owner.id, slotKey: slot } });
  return pointer && models.RichmanSaveRevision.findByPk(pointer.currentRevisionId);
};
try {
  await mkdir(output, { recursive: true });
  await sequelize.authenticate();
  await createMigrator(sequelize, false).up();
  for (let i = 0; i < 2; i++) {
    const id = randomUUID(), password = `Sv03!${randomUUID()}`, username = `sv03_${id.replaceAll('-', '').slice(0, 24)}`;
    await models.User.create({ id, username, passwordHash: await hashPassword(password), displayName: '存档验收', inviteCode: generateInviteCode() });
    owners.push({ id, username, password });
  }
  const [owner, other] = owners;
  server = createApp({ config, sequelize, models }).listen(3001, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'],
    { cwd: path.resolve('frontend'), stdio: 'ignore' });
  await waitUntil(async () => { try { return (await fetch('http://127.0.0.1:5173')).ok; } catch { return false; } });
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('pageerror', error => failures.push(error.message));
  page.on('dialog', d => d.accept());
  await login(page, owner); await enter(page);
  await click(page, 'LOAD · 读档');
  await dialog(page).getByText('暂无云端存档。开始新局后可在这里保存。').waitFor();
  await page.getByRole('checkbox', { name: /自动保存/ }).uncheck();
  await dialog(page).locator('.rm-system-header button').click();
  await click(page, 'START · 新建对局');
  for (const name of ['钱夫人', '沙隆巴斯']) await page.getByRole('checkbox', { name, exact: true }).uncheck();
  for (const name of ['孙小美', '阿土伯']) {
    await page.getByRole('checkbox', { name, exact: true }).check();
    await page.getByLabel(`${name}控制方式`).selectOption('human');
  }
  await page.getByText('高级设置 · 历史模式、电脑策略与种子', { exact: true }).click();
  await page.getByLabel('对局种子（可选）').fill('save03-0');
  await click(page, '开始新对局');
  await page.getByRole('button', { name: 'GO：掷骰出发', exact: true }).click();
  await page.getByRole('button', { name: /路线 1.*3号/ }).click();
  await page.getByRole('button', { name: '确认购买', exact: true }).waitFor();
  await openSave(page); await save(page, 1); await saved(page);
  const first = await revision(owner, 'manual-1');
  assert.equal(first.summary.phase, 'property');
  const firstPayload = JSON.parse(first.payload);
  await page.screenshot({ path: path.join(output, 'save-desktop.png') });
  report('new-game-to-manual-save-at-property-decision', { revision: first.summary.revision, phase: first.summary.phase });
  await closeSystem(page);
  // Leave through the actual exit flow, then log out and log back in.
  await page.locator('.rm-game-window[open]').getByRole('button', { name: '暂停', exact: true }).click();
  await dialog(page).getByRole('button', { name: '返回模块集合', exact: true }).click();
  await click(page, '直接返回模块集合');
  await page.goto('http://127.0.0.1:5173/account'); await click(page, '退出登录');
  await login(page, owner); await enter(page);
  await click(page, '继续最近存档');
  await click(page, '确认替换当前对局');
  await page.getByRole('button', { name: '继续旅程', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: '确认购买', exact: true }).count(), 0);
  await page.screenshot({ path: path.join(output, 'restored.png') });
  await click(page, '继续旅程');
  await click(page, '确认购买');
  report('exit-signout-signin-load-continue-same-decision');
  // Auto slot is opt-in for this scenario; allow a genuine stable-point update.
  await openSave(page);
  await page.getByRole('checkbox', { name: /自动保存/ }).check();
  await waitUntil(async () => !!await revision(owner, 'auto'), 45_000);
  await page.getByRole('checkbox', { name: /自动保存/ }).uncheck();
  const automatic = await revision(owner, 'auto');
  assert.equal(automatic.summary.gameId, first.summary.gameId);
  assert(automatic.summary.revision > first.summary.revision);
  report('automatic-save-after-restored-decision', { revision: automatic.summary.revision });
  // Real server commit followed by dropped browser response.
  const requests = [];
  let dropped = false;
  await page.route('**/api/v1/richman/saves/manual-2', async route => {
    if (route.request().method() !== 'PUT') return route.continue();
    requests.push(route.request().postDataJSON());
    if (!dropped) { dropped = true; const response = await route.fetch(); assert.equal(response.status(), 200); await route.abort('failed'); }
    else await route.continue();
  });
  await save(page, 2);
  await click(page, '重试这次保存'); await saved(page);
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(await models.RichmanSaveRevision.count({ where: { ownerId: owner.id, slotKey: 'manual-2' } }), 1);
  await page.unroute('**/api/v1/richman/saves/manual-2');
  report('lost-response-retry-reuses-request-and-one-revision');
  // Second tab shares account but its cached slot version must not silently win.
  const tab = await context.newPage(); tab.on('dialog', d => d.accept());
  await enter(tab); await click(tab, '继续当前对局'); await openSave(tab);
  await save(page, 1, true); await saved(page);
  const newer = await revision(owner, 'manual-1');
  await save(tab, 1, true);
  await dialog(tab).getByRole('alert').filter({ hasText: '此槽位已在其他页面更新' }).waitFor();
  assert.equal((await revision(owner, 'manual-1')).id, newer.id);
  await click(tab, '放弃这次请求，重新读取槽位');
  await waitUntil(() => tab.getByRole('button', { name: '保存到手动存档 3', exact: true }).isEnabled());
  await save(tab, 3); await saved(tab);
  report('two-tab-conflict-preserves-newer-cloud-save-and-allows-another-slot');
  await tab.close(); currentPage = page;
  // Invalid access version: UI must retain game and exact pending payload through real login.
  await models.User.update({ authVersion: 1 }, { where: { id: owner.id } });
  await save(page, 2, true);
  await page.getByRole('form', { name: '重新登录并保留对局' }).waitFor();
  await page.getByLabel('账号', { exact: true }).fill(owner.username);
  await page.getByLabel('密码', { exact: true }).fill(owner.password);
  await click(page, '重新登录');
  await waitUntil(() => page.getByRole('button', { name: '重新登录', exact: true }).isEnabled());
  await click(page, '重试这次保存'); await saved(page);
  assert.equal((await revision(owner, 'manual-2')).summary.gameId, first.summary.gameId);
  report('expired-login-reauthentication-preserves-live-game-and-retry');
  await closeSystem(page);
  await page.locator('[data-tool="load"]').click();
  await page.route('**/api/v1/richman/saves/manual-2', async route => {
    const response = await route.fetch(), body = await response.json();
    const payload = JSON.parse(body.data.save); payload.stateDigest = '0'.repeat(64);
    body.data.save = JSON.stringify(payload);
    await route.fulfill({ response, json: body });
  });
  await click(page, '读取手动存档 2');
  await dialog(page).getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button', { name: '确认替换当前对局' }).count(), 0);
  await page.unroute('**/api/v1/richman/saves/manual-2');
  await click(page, '读取手动存档 2'); await click(page, '保留当前对局');
  let releaseRead;
  const stalledRead = new Promise(resolve => { releaseRead = resolve; });
  await page.route('**/api/v1/richman/saves/manual-2', async route => {
    await stalledRead;
    await route.abort('failed').catch(() => {});
  });
  await click(page, '读取手动存档 2');
  await click(page, '取消读取，保留当前对局');
  releaseRead();
  await page.unroute('**/api/v1/richman/saves/manual-2');
  assert.equal(await page.getByRole('button', { name: '确认替换当前对局' }).count(), 0);
  report('cancel-pending-network-load-keeps-current-game');
  await closeSystem(page);
  // Export through the user-visible replay command to prove failed/cancelled loads kept the live game.
  await click(page, '主菜单');
  const downloadPromise = page.waitForEvent('download');
  await dialog(page).getByRole('button', { name: '下载回放记录', exact: true }).click();
  const download = await downloadPromise;
  const replay = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(replay.config.gameId, first.summary.gameId);
  assert(replay.commands.length > firstPayload.replay.commands.length);
  report('bad-digest-and-declined-load-preserve-current-progress');
  await closeSystem(page);
  // End the restored two-human game using the actual surrender UI.
  await click(page, '更多功能'); await click(page, '认输与衰神');
  await click(page, '认输退出本局'); await click(page, '确认认输');
  await page.getByRole('heading', { name: /获胜/ }).waitFor();
  report('restored-game-completes-through-normal-surrender');
  await openSave(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog(page).locator('.rm-system-header').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'save-mobile.png') });
  assert(await dialog(page).evaluate(element => element.scrollWidth <= element.clientWidth + 1));
  report('mobile-390px-save-slots-no-horizontal-overflow');
  // A previously failed request must also work after selecting "save and exit".
  let exitDropped = false;
  await page.route('**/api/v1/richman/saves/manual-2', async route => {
    if (route.request().method() !== 'PUT' || exitDropped) return route.continue();
    exitDropped = true;
    const response = await route.fetch(); assert.equal(response.status(), 200);
    await route.abort('failed');
  });
  await save(page, 2, true);
  await page.getByRole('button', { name: '重试这次保存', exact: true }).waitFor();
  await closeSystem(page);
  // Explicit save-and-exit for the completed game.
  await page.locator('.rm-game-window[open]').getByRole('button', { name: '关闭窗口', exact: true }).click();
  await page.getByRole('link', { name: /模块集合/ }).click();
  await click(page, '保存并退出');
  await click(page, '重试这次保存');
  await page.waitForURL('http://127.0.0.1:5173/', { timeout: 45_000 });
  assert.equal((await revision(owner, 'manual-2')).summary.phase, 'finished');
  report('save-and-exit-retries-previous-failed-request-and-waits-for-receipt');
  const otherContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const otherPage = await otherContext.newPage();
  await login(otherPage, other); await enter(otherPage); await click(otherPage, 'LOAD · 读档');
  await dialog(otherPage).getByText('暂无云端存档。开始新局后可在这里保存。').waitFor();
  assert.equal(await otherPage.getByRole('button', { name: '读取手动存档 1', exact: true }).isEnabled(), false);
  report('second-account-cannot-list-or-load-first-account-saves');
  assert.deepEqual(failures, [], 'Unexpected browser errors');
} catch (error) {
  failures.push(error.stack ?? String(error));
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
    await writeFile('/private/tmp/richman-save03-failure.txt', await currentPage.locator('body').innerText().catch(() => ''));
  }
  process.exitCode = 1;
  console.error(error.message);
} finally {
  await browser?.close();
  vite?.kill('SIGTERM');
  if (server) await new Promise(resolve => server.close(resolve));
  if (owners.length) {
    const ownerWhere = { ownerId: { [Op.in]: owners.map(o => o.id) } };
    await models.RichmanSaveSlot.destroy({ where: ownerWhere });
    await models.RichmanSaveRevision.destroy({ where: ownerWhere });
    await models.AuthRefreshSession.update({ replacedBySessionId: null }, { where: { userId: { [Op.in]: owners.map(o => o.id) } } });
    await models.AuthRefreshSession.destroy({ where: { userId: { [Op.in]: owners.map(o => o.id) } } });
    await models.User.destroy({ where: { id: { [Op.in]: owners.map(o => o.id) } } });
  }
  await sequelize.close();
  await writeFile('/private/tmp/richman-save03-browser.json', JSON.stringify({
    generatedAt: new Date().toISOString(), environment: 'Chrome headless, local Vite/API, real cloud homeAssistantDB_test',
    checks, failures, cleanup: 'Only UUID owners created by this run and their save/auth rows removed. Production untouched.',
  }, null, 2));
}
