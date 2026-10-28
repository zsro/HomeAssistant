/* global process, console, setTimeout, fetch, localStorage */
/** NET-03 real browser recovery, abrupt backend process death, cloud test DB only. */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { Op } = require('sequelize');
const { loadConfig } = require('../../src/config/env.ts');
const { createSequelize } = require('../../src/database/sequelize.ts');
const { initModels } = require('../../src/database/models/index.ts');
const { createMigrator } = require('../../src/database/migrator.ts');
const { hashPassword } = require('../../src/modules/auth/password.ts');
const { generateInviteCode } = require('../../src/modules/auth/invite-code.ts');
const { fixtureHost } = require('../../tests/helpers/richman-host-fixture.ts');
const { GameEngine } = require('../../shared/richman/game/engine.ts');
const { SERVER_MANIFEST } = require('../../shared/richman/content.ts');
const { canonicalSaveJSON } = require('../../shared/richman/game/save.ts');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const config = loadConfig(); assert.equal(config.database.name, 'homeAssistantDB_test'); config.logLevel = 'silent';
const sequelize = createSequelize(config), models = initModels(sequelize);
const owners = [], games = [], rooms = [], checks = [], errors = [], pages = [];
let backend, vite, browser, persistent;
const profile = await mkdtemp('/private/tmp/richman-net03-profile-');
const closeBrowsers = async () => { await browser?.close(); await persistent?.close(); browser = null; persistent = null; };
const output = path.resolve('docs/richman/net03');
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
const startBackend = async () => {
  backend = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { env: { ...process.env, PORT: '3001', LOG_LEVEL: 'silent' }, stdio: 'ignore' });
  await wait(async () => { if (backend.exitCode !== null) throw new Error(`backend exited ${backend.exitCode}`); try { return (await fetch('http://127.0.0.1:3001/api/ready')).ok; } catch { return false; } });
};
const killBackend = async () => { const child = backend; backend = null; if (child && child.exitCode === null) { const exit = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGKILL'); await exit; } };
const launch = async (states) => {
  persistent = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true, viewport: { width: 1440, height: 1000 }, args: ['--enable-unsafe-swiftshader'] });
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] }); pages.length = 0;
  for (let i = 0; i < 4; i++) { const ctx = i === 0 ? persistent : await browser.newContext({ viewport: { width: 1440, height: 1000 }, ...(states ? { storageState: states[i] } : {}) }), page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message)); pages.push(page); if (!states) await login(page, owners[i]); }
};
const openGame = async (page, id) => { await page.goto(`http://127.0.0.1:5173/modules/richman/online/games/${id}`); await viewport(page).waitFor({ timeout: 60000 }); await wait(async () => (await viewport(page).getAttribute('data-revision')) !== null, 60000); };
const ready = async page => { await wait(() => page.getByRole('button', { name: '准备好了', exact: true }).isEnabled()); await click(page, '准备好了'); await page.getByRole('button', { name: '取消准备', exact: true }).waitFor(); };
const newRoom = async (count, ai = false) => {
  const a = pages[0]; await a.goto('http://127.0.0.1:5173/modules/richman/online'); await click(a, '创建房间'); await a.getByTestId('room-code').waitFor();
  const roomId = a.url().split('/').at(-1); rooms.push(roomId); const code = await a.getByTestId('room-code').innerText();
  for (let n = ai ? 2 : 3; n <= count; n++) { await a.getByLabel(`座位 ${n}`, { exact: true }).selectOption(ai ? 'ai' : 'open'); await wait(async () => await a.getByLabel(`座位 ${n}`, { exact: true }).inputValue() === (ai ? 'ai' : 'open') && await a.getByLabel(`座位 ${n}`, { exact: true }).isEnabled()); }
  const humans = ai ? 1 : count;
  for (let i = 1; i < humans; i++) { const p = pages[i]; await p.goto('http://127.0.0.1:5173/modules/richman/online'); await p.getByLabel('房间码', { exact: true }).fill(code); await click(p, '加入房间'); await p.getByTestId('room-code').waitFor(); }
  await new Promise(r => setTimeout(r, 1700));
  for (let i = 1; i < humans; i++) { for (let j = 1; j < i; j++) await pages[i].locator('.rm-room-seat').nth(j).getByText('在线 · 已准备', { exact: true }).waitFor(); await ready(pages[i]); await a.locator('.rm-room-seat').nth(i).getByText('在线 · 已准备', { exact: true }).waitFor(); }
  await ready(a); await wait(() => a.getByRole('button', { name: '开始联机', exact: true }).isEnabled()); await click(a, '开始联机');
  await wait(async () => a.url().includes('/games/')); const id = a.url().split('/').at(-1); games.push(id);
  for (let i = 0; i < humans; i++) { if (i) await pages[i].getByRole('link', { name: '进入联机对局' }).click(); await wait(async () => await viewport(pages[i]).getAttribute('data-phase') === 'idle', 60000); }
  return { id, roomId, humans };
};
const pendingRecord = (page, id) => page.evaluate(gameId => {
  const auth = JSON.parse(localStorage.getItem('home-assistant.session.v1'));
  return localStorage.getItem(`richman.net.pending:${auth.user.id}:${gameId}`);
}, id);
try {
  await mkdir(output, { recursive: true }); await sequelize.authenticate(); await createMigrator(sequelize, false).up();
  for (let i = 0; i < 4; i++) { const id = randomUUID(), username = `net03ui_${id.replaceAll('-', '').slice(0, 22)}`, password = `Net03!${randomUUID()}`; await models.User.create({ id, username, passwordHash: await hashPassword(password), displayName: `恢复旅伴 ${i + 1}`, inviteCode: generateInviteCode() }); owners.push({ id, username, password }); }
  await startBackend();
  vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], { cwd: path.resolve('frontend'), stdio: 'ignore' });
  await wait(async () => { try { return (await fetch('http://127.0.0.1:5173')).ok; } catch { return false; } });
  await launch();
  const first = await newRoom(2); let a = pages[0], b = pages[1];
  await a.route('**/api/v1/richman/games/*/recover', route => route.abort('failed'));
  await a.route('**/api/v1/richman/games/*/commands', async route => { await route.fetch(); await route.abort('failed'); });
  await click(a, 'GO：掷骰出发'); await wait(async () => !!await pendingRecord(a, first.id));
  await wait(async () => await models.RichmanGameCommand.count({ where: { gameId: first.id, userId: owners[0].id } }) === 1);
  const original = await pendingRecord(a, first.id), states = await Promise.all(pages.map(p => p.context().storageState()));
  await closeBrowsers(); await killBackend();
  const committed = (await models.RichmanGame.findByPk(first.id)).checkpoint;
  await startBackend(); await launch(states); a = pages[0]; b = pages[1];
  await openGame(a, first.id); await openGame(b, first.id);
  await wait(async () => !await pendingRecord(a, first.id));
  assert.equal(await models.RichmanGameCommand.count({ where: { gameId: first.id, userId: owners[0].id, requestId: JSON.parse(original).id } }), 1);
  assert(Number(await viewport(a).getAttribute('data-revision')) >= JSON.parse(committed).engine.state.revision);
  await a.screenshot({ path: path.join(output, 'browser-and-server-recovered.png') });
  report('committed-lost-response-survives-browser-close-and-SIGKILL-without-resubmit');
  // Restore through the public room list, using the same durable game identity.
  await b.goto('http://127.0.0.1:5173/modules/richman/online'); await b.locator(`a[href$="/rooms/${first.roomId}"]`).click(); await b.getByRole('link', { name: '进入联机对局' }).click();
  await wait(async () => b.url().endsWith(first.id)); report('room-list-returns-to-original-game-after-restart');
  // Drop the request before it reaches the backend, reload, then explicitly retry once.
  const second = await newRoom(2); a = pages[0];
  await a.route('**/api/v1/richman/games/*/commands', route => route.abort('failed'));
  await click(a, 'GO：掷骰出发'); await wait(async () => !!await pendingRecord(a, second.id));
  await a.reload(); await wait(async () => await a.getByRole('button', { name: '重试原请求', exact: true }).first().isVisible(), 60000);
  assert.equal(await models.RichmanGameCommand.count({ where: { gameId: second.id, userId: owners[0].id } }), 0);
  await a.unroute('**/api/v1/richman/games/*/commands'); await click(a, '重试原请求');
  await wait(async () => !await pendingRecord(a, second.id)); assert.equal(await models.RichmanGameCommand.count({ where: { gameId: second.id, userId: owners[0].id } }), 1);
  report('uncommitted-request-survives-refresh-and-only-explicit-retry-executes');
  // Connection outage + authentication revocation keep the admitted game and its seat.
  await a.context().setOffline(true); await a.getByText(/网络已断开/).first().waitFor(); assert(await a.getByRole('button', { name: 'GO：掷骰出发', exact: true }).isDisabled());
  await a.context().setOffline(false); await wait(async () => !await a.getByText(/网络已断开|正在自动重连/).first().isVisible());
  await models.User.increment('authVersion', { where: { id: owners[0].id } });
  await a.getByText(/正在自动重连/).first().waitFor();
  // The recovery form is repeated inside mandatory decision windows; operate the visible one.
  const area = await gameWindow(a).count() ? gameWindow(a) : a.locator('.rm-content > .rm-network-status');
  await area.getByText('重新登录原账号', { exact: true }).click(); await area.getByLabel('用户名', { exact: true }).fill(owners[0].username); await area.getByLabel('密码', { exact: true }).fill(owners[0].password); await area.getByRole('button', { name: '登录并重连', exact: true }).click();
  await wait(async () => !await a.getByText(/正在自动重连/).first().isVisible()); assert(a.url().endsWith(second.id));
  report('offline-online-and-expired-login-recover-in-place');
  for (const count of [3, 4]) {
    const current = await newRoom(count), before = (await models.RichmanGame.findByPk(current.id)).checkpoint;
    await killBackend(); await pages[0].getByText(/正在自动重连/).first().waitFor();
    assert(await pages[0].getByRole('button', { name: 'GO：掷骰出发', exact: true }).isDisabled());
    await startBackend();
    await wait(async () => (await Promise.all(pages.slice(0, count).map(p => p.getByText(/正在自动重连/).first().isVisible()))).every(v => !v), 30000);
    assert.equal((await models.RichmanGame.findByPk(current.id)).checkpoint, before);
    assert(await pages[0].getByRole('button', { name: 'GO：掷骰出发', exact: true }).isEnabled());
    for (let i = 1; i < count; i++) assert(await pages[i].getByRole('button', { name: 'GO：掷骰出发', exact: true }).isDisabled());
    await pages[0].screenshot({ path: path.join(output, `${count}-human-recovered.png`) }); report(`${count}-independent-human-browser-seats-recover-after-SIGKILL`);
  }
  const extra = await pages[1].context().newPage(); extra.on('pageerror', e => errors.push(e.message)); await extra.goto(pages[1].url());
  await pages[1].getByText(/当前窗口只读/).first().waitFor({ timeout: 60000 });
  await killBackend(); await pages[1].getByText(/正在自动重连/).first().waitFor(); await startBackend();
  await pages[1].getByText(/当前窗口只读/).first().waitFor();
  await pages[1].getByRole('button', { name: '在此窗口接管', exact: true }).first().click();
  await extra.getByText(/当前窗口只读/).first().waitFor(); await extra.close();
  report('controller-replacement-survives-process-restart-and-explicit-reclaim');
  const mixed = await newRoom(4, true), beforeMixed = (await models.RichmanGame.findByPk(mixed.id)).checkpoint;
  await killBackend(); await startBackend(); await pages[0].reload(); await wait(() => pages[0].getByRole('button', { name: 'GO：掷骰出发', exact: true }).isEnabled(), 60000);
  assert.equal((await models.RichmanGame.findByPk(mixed.id)).checkpoint, beforeMixed); report('one-human-three-AI-seat-and-memory-checkpoint-recovery');
  await pages[0].route('**/api/v1/richman/games/*/claim', route => route.abort('failed')); await pages[0].reload();
  await pages[0].getByText('暂时无法连接对局', { exact: true }).waitFor({ timeout: 60000 });
  await pages[0].unroute('**/api/v1/richman/games/*/claim'); await click(pages[0], '重新加载');
  await wait(() => pages[0].getByRole('button', { name: 'GO：掷骰出发', exact: true }).isEnabled(), 60000);
  report('initial-connection-failure-retains-retry-entry-and-original-game');
  // A live human minigame is frozen on process death; another player's connection cannot restart its clock.
  const mini = await seed('minigame'); a = pages[0]; b = pages[1];
  await openGame(a, mini.id); await openGame(b, mini.id); const actorIndex = mini.state.active, actor = pages[actorIndex], watcher = pages[1 - actorIndex];
  await click(actor, '开始射气球'); await wait(async () => Number(await actor.getByRole('region', { name: '射气球', exact: true }).getAttribute('data-tick')) >= 2);
  await killBackend(); const frozen = (await models.RichmanGame.findByPk(mini.id)).checkpoint;
  await actor.context().setOffline(true); await startBackend();
  await wait(async () => !await watcher.getByText(/正在自动重连/).first().isVisible());
  await new Promise(r => setTimeout(r, 1500)); assert.equal((await models.RichmanGame.findByPk(mini.id)).checkpoint, frozen);
  await actor.context().setOffline(false); await wait(async () => Number(await actor.getByRole('region', { name: '射气球', exact: true }).getAttribute('data-tick')) > JSON.parse(frozen).engine.state.pending.tick);
  await click(actor, '退出小游戏，保留已得分'); await wait(() => actor.getByRole('button', { name: '结算点数并返回', exact: true }).isEnabled()); await actor.route('**/api/v1/richman/games/*/recover', route => route.abort('failed'));
  await actor.route('**/api/v1/richman/games/*/commands', async route => { await route.fetch(); await route.abort('failed'); });
  await click(actor, '结算点数并返回'); await wait(async () => (await models.RichmanGame.findByPk(mini.id)).revision > JSON.parse(frozen).engine.state.revision && !!await pendingRecord(actor, mini.id));
  const ackRecord = JSON.parse(await pendingRecord(actor, mini.id));
  await wait(async () => await models.RichmanGameCommand.count({ where: { gameId: mini.id, requestId: ackRecord.id } }) === 1);
  await killBackend(); const settled = (await models.RichmanGame.findByPk(mini.id)).checkpoint; await startBackend();
  await actor.unroute('**/api/v1/richman/games/*/recover'); await actor.unroute('**/api/v1/richman/games/*/commands'); await actor.reload();
  await wait(async () => !await pendingRecord(actor, mini.id), 60000);
  assert.equal((await models.RichmanGame.findByPk(mini.id)).checkpoint, settled); assert.equal(await models.RichmanGameCommand.count({ where: { gameId: mini.id, requestId: ackRecord.id } }), 1);
  await actor.screenshot({ path: path.join(output, 'minigame-settlement-recovered.png') }); report('live-minigame-freezes-on-restart-and-lost-settlement-recovers-once');
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push(error.stack ?? String(error)); for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(output, `failure-${i}.png`), fullPage: true }).catch(() => {}); process.exitCode = 1;
} finally {
  await closeBrowsers(); await rm(profile, { recursive: true, force: true }); if (vite) vite.kill('SIGTERM'); await killBackend();
  try {
    if (owners.length) {
      const linked = await models.RichmanRoomSeat.findAll({ where: { userId: { [Op.in]: owners.map(u => u.id) } } }); rooms.push(...linked.map(s => s.roomId));
      const linkedRooms = await models.RichmanRoom.findAll({ where: { id: { [Op.in]: rooms } } }); games.push(...linkedRooms.flatMap(r => r.gameId ? [r.gameId] : []));
      await models.RichmanRoomSeat.destroy({ where: { roomId: { [Op.in]: rooms } } }); await models.RichmanRoom.destroy({ where: { id: { [Op.in]: rooms } } });
      await models.RichmanGameCommand.destroy({ where: { gameId: { [Op.in]: games } } }); await models.RichmanGameSeat.destroy({ where: { gameId: { [Op.in]: games } } }); await models.RichmanGame.destroy({ where: { id: { [Op.in]: games } } });
      await models.AuthRefreshSession.destroy({ where: { userId: { [Op.in]: owners.map(u => u.id) } } }); await models.User.destroy({ where: { id: { [Op.in]: owners.map(u => u.id) } } });
    }
  } finally { await sequelize.close(); await writeFile('/private/tmp/richman-net03-browser.json', JSON.stringify({ checks, errors }, null, 2)); console.log(JSON.stringify({ checks, errors }, null, 2)); }
}
