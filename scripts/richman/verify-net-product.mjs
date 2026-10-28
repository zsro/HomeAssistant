/* global process, console, setTimeout, performance, fetch, document, innerWidth */
/** NET-02 actual product, two isolated browser logins, cloud test DB only. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
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
const { GameService } = require('../../src/modules/richman/game-service.ts');
const { fixtureHost } = require('../../tests/helpers/richman-host-fixture.ts');
const { GameEngine } = require('../../shared/richman/game/engine.ts');
const { SERVER_MANIFEST } = require('../../shared/richman/content.ts');
const { canonicalSaveJSON } = require('../../shared/richman/game/save.ts');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const config = loadConfig(); assert.equal(config.database.name, 'homeAssistantDB_test'); config.logLevel = 'silent';
const sequelize = createSequelize(config), models = initModels(sequelize), context = { config, sequelize, models };
const owners = [], games = [], rooms = [], checks = [], errors = [], pages = [];
let host, server, vite, browser;
const output = path.resolve('docs/richman/net02');
const report = (name, details = {}) => { checks.push({ name, ...details }); console.log(`PASS ${name}`); };
const wait = async (fn, timeout = 30000) => { const until = Date.now() + timeout; while (Date.now() < until) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)); } throw new Error('acceptance timed out'); };
const click = (page, name) => page.getByRole('button', { name, exact: true }).click();
const gameWindow = page => page.locator('.rm-game-window[open]');
const viewport = page => page.locator('[data-testid="richman-viewport"]');
const login = async (page, user) => {
  await page.goto('http://127.0.0.1:5173/login'); await page.getByLabel('用户名', { exact: true }).fill(user.username); await page.getByLabel('密码', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: /进入我的空间/ }).click(); await page.waitForURL('http://127.0.0.1:5173/');
};
const seed = async (kind) => {
  const id = randomUUID(); games.push(id);
  const { host: source, replay, index } = fixtureHost(kind === 'auction' ? 'surrender-v47-4' : 'presentation-v47-paid-upgrade-tuu', s => s.pending?.kind === kind && (kind !== 'auction' || s.pending.responderId === 'player-2' && s.players[s.active].id !== 'player-2') && (kind !== 'minigame' || s.pending.game === 'balloon'), id);
  const checkpoint = source.checkpoint(); checkpoint.seats.forEach((s, i) => { s.userId = owners[i].id; s.policy = null; });
  const text = canonicalSaveJSON(checkpoint), now = new Date(), engine = new GameEngine(SERVER_MANIFEST.map.nodes, replay.config), journal = [];
  for (const command of replay.commands.slice(0, index)) { const result = engine.dispatch(command); assert(result.ok); journal.push({ gameId: id, revision: command.expectedRevision + 1, userId: null, requestId: null, requestHash: null, receipt: null, command, events: result.events, createdAt: now }); }
  await sequelize.transaction(async transaction => {
    await models.RichmanGame.create({ id, revision: source.state.revision, status: 'active', checkpoint: text, checkpointHash: createHash('sha256').update(text).digest('hex'), createdAt: now, updatedAt: now }, { transaction });
    await models.RichmanGameSeat.bulkCreate(checkpoint.seats.map(s => ({ gameId: id, ...s })), { transaction });
    await models.RichmanGameCommand.bulkCreate(journal, { transaction });
  });
  return { id, state: source.state, index };
};
try {
  await mkdir(output, { recursive: true }); await sequelize.authenticate(); await createMigrator(sequelize, false).up();
  for (let i = 0; i < 4; i++) { const id = randomUUID(), username = `net02ui_${id.replaceAll('-', '').slice(0, 22)}`, password = `Net02!${randomUUID()}`; await models.User.create({ id, username, passwordHash: await hashPassword(password), displayName: `联机旅伴 ${i + 1}`, inviteCode: generateInviteCode() }); owners.push({ id, username, password }); }
  host = new GameService(context, { now: () => performance.now(), seed: () => 'save03-0', id: () => { const id = randomUUID(); games.push(id); return id; } }); await host.start(); context.gameHost = host;
  server = createApp(context).listen(3001, '127.0.0.1'); await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: path.resolve('frontend'), stdio: 'ignore' });
  await wait(async () => { try { return (await fetch('http://127.0.0.1:5173')).ok; } catch { return false; } });
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  for (let i = 0; i < 2; i++) { const b = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), p = await b.newPage(); p.on('pageerror', e => errors.push(e.message)); pages.push(p); await login(p, owners[i]); await p.goto('http://127.0.0.1:5173/modules/richman/online'); }
  const [a, b] = pages;
  await click(a, '创建房间'); await a.getByTestId('room-code').waitFor(); rooms.push(a.url().split('/').at(-1));
  const code = await a.getByTestId('room-code').innerText();
  await b.getByLabel('房间码', { exact: true }).fill(code); await click(b, '加入房间'); await b.getByTestId('room-code').waitFor();
  await click(b, '准备好了'); await a.locator('.rm-room-seat').nth(1).getByText('在线 · 已准备', { exact: true }).waitFor(); await click(a, '准备好了'); await wait(() => a.getByRole('button', { name: '开始联机', exact: true }).isEnabled());
  await a.screenshot({ path: path.join(output, 'room-desktop.png') });
  report('two-separate-browser-logins-create-code-join-ready');
  await click(a, '开始联机'); await b.getByRole('link', { name: '进入联机对局' }).click();
  await wait(async () => await viewport(a).getAttribute('data-phase') === 'idle' && await viewport(b).getAttribute('data-phase') === 'idle', 60000);
  assert(await a.getByRole('button', { name: 'GO：掷骰出发', exact: true }).isEnabled());
  assert(await b.getByRole('button', { name: 'GO：掷骰出发', exact: true }).isDisabled());
  await a.screenshot({ path: path.join(output, 'game-desktop.png') });
  const gameId = a.url().split('/').at(-1);
  let lost = false, retried = false;
  await a.route('**/api/v1/richman/games/*/recover', route => !retried ? route.abort('failed') : route.continue());
  await a.route('**/api/v1/richman/games/*/commands', async route => {
    if (!lost) { lost = true; await route.fetch(); await route.abort('failed'); } else { retried = true; await route.continue(); }
  });
  await click(a, 'GO：掷骰出发');
  await wait(async () => { const btn = a.getByRole('button', { name: '重试原请求', exact: true }).first(); return await btn.isVisible() && await btn.isEnabled(); });
  const pendingButton = (await gameWindow(a).count()) ? gameWindow(a).getByRole('button', { name: '重试原请求', exact: true }) : a.getByRole('button', { name: '重试原请求', exact: true }).first();
  await pendingButton.click();
  await wait(async () => !await a.getByRole('button', { name: '重试原请求', exact: true }).first().isVisible());
  assert.equal(await models.RichmanGameCommand.count({ where: { gameId, userId: owners[0].id } }), 1);
  report('lost-command-response-retries-original-id-once');
  await a.getByRole('button', { name: /路线 1.*3号/ }).click(); await click(a, '确认购买');
  await wait(async () => await viewport(a).getAttribute('data-phase') === 'turnEnd');
  await a.getByRole('button', { name: /^下一位/ }).click();
  await wait(() => b.getByRole('button', { name: 'GO：掷骰出发', exact: true }).isEnabled());
  assert.equal(await viewport(a).getAttribute('data-revision'), await viewport(b).getAttribute('data-revision'));
  report('formal-map-property-decision-and-turn-handoff');
  await b.locator('[data-tool="save"]').click(); await b.getByText(/服务器持续保存本局/).waitFor(); await click(b, '知道了');
  await a.goto('http://127.0.0.1:5173/modules/richman/online'); await click(b, 'GO：掷骰出发');
  await wait(async () => Number(await viewport(b).getAttribute('data-revision')) > 10);
  report('save-is-server-persistence-and-host-leaving-does-not-end-game');
  // Freeze this independent normal game for predictable fixture screenshots: no player is online after navigation.
  for (const kind of ['auction', 'reaction', 'minigame']) {
    const fixture = await seed(kind);
    for (const p of pages) await p.goto(`http://127.0.0.1:5173/modules/richman/online/games/${fixture.id}`);
    const responder = fixture.state.pending.responderId ?? fixture.state.players[fixture.state.active].id;
    const index = Number(responder.split('-')[1]) - 1, actor = pages[index], watcher = pages[1 - index];
    const label = kind === 'auction' ? '地产拍卖' : kind === 'reaction' ? '反应决策' : '射气球';
    await actor.getByRole('region', { name: label, exact: true }).waitFor({ timeout: 60000 });
    assert.equal(await gameWindow(watcher).count(), 0);
    await actor.screenshot({ path: path.join(output, `${kind}-desktop.png`) });
    const before = Number(await viewport(actor).getAttribute('data-revision'));
    if (kind === 'auction') await actor.getByRole('button', { name: /退出.*竞价|退出拍卖|不出价|放弃/ }).click();
    else if (kind === 'reaction') await actor.getByRole('button', { name: /^不使用/ }).click();
    else {
      await click(actor, '开始射气球'); await wait(async () => Number(await actor.getByRole('region', { name: label }).getAttribute('data-tick')) >= 3);
      await click(actor, '退出小游戏，保留已得分'); await click(actor, '结算点数并返回');
    }
    await wait(async () => Number(await viewport(actor).getAttribute('data-revision')) > before);
    report(`formal-${kind}-window-authorized-seat`, { prefix: fixture.index, responder });
  }
  // Same authenticated seat: latest window can act; old one becomes read-only.
  const extra = await b.context().newPage(); extra.on('pageerror', e => errors.push(e.message)); await extra.goto(b.url());
  await b.getByText(/当前窗口只读/).first().waitFor({ timeout: 30000 });
  await b.getByRole('button', { name: '在此窗口接管', exact: true }).first().click();
  await extra.getByText(/当前窗口只读/).first().waitFor({ timeout: 30000 }); await extra.close();
  report('same-account-latest-window-readonly-and-explicit-reclaim');
  await a.goto(`http://127.0.0.1:5173/modules/richman/online/rooms/${rooms[0]}`); await a.setViewportSize({ width: 390, height: 844 }); await a.getByTestId('room-code').waitFor();
  await a.screenshot({ path: path.join(output, 'room-mobile.png'), fullPage: true });
  assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []); report('mobile-room-layout-and-no-browser-runtime-errors');
} catch (error) {
  errors.push(error.stack ?? String(error)); for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(output, `failure-${i}.png`), fullPage: true }).catch(() => {}); process.exitCode = 1;
} finally {
  await browser?.close(); if (vite) vite.kill('SIGTERM'); if (server) await new Promise(r => server.close(r)); await host?.stop();
  try {
    if (owners.length) {
      const linked = await models.RichmanRoomSeat.findAll({ where: { userId: { [Op.in]: owners.map(u => u.id) } } }); rooms.push(...linked.map(s => s.roomId));
      await models.RichmanRoomSeat.destroy({ where: { roomId: { [Op.in]: rooms } } }); await models.RichmanRoom.destroy({ where: { id: { [Op.in]: rooms } } });
      await models.RichmanGameCommand.destroy({ where: { gameId: { [Op.in]: games } } }); await models.RichmanGameSeat.destroy({ where: { gameId: { [Op.in]: games } } }); await models.RichmanGame.destroy({ where: { id: { [Op.in]: games } } });
      await models.AuthRefreshSession.destroy({ where: { userId: { [Op.in]: owners.map(u => u.id) } } }); await models.User.destroy({ where: { id: { [Op.in]: owners.map(u => u.id) } } });
    }
  } finally { await sequelize.close(); await writeFile('/private/tmp/richman-net02-browser.json', JSON.stringify({ checks, errors }, null, 2)); console.log(JSON.stringify({ checks, errors }, null, 2)); }
}
