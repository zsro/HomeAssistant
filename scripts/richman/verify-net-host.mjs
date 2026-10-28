/**
 * Local acceptance UI + real cloud test MySQL. Never mounts test UI in production.
 * DB_NAME=homeAssistantDB_test JWT_ACCESS_SECRET=<test secret> PLAYWRIGHT_MODULE=<absolute index.mjs>
 * node --import tsx scripts/richman/verify-net-host.mjs
 */
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const express = require('express'), { Op } = require('sequelize');
const { loadConfig } = require('../../src/config/env.ts');
const { createSequelize } = require('../../src/database/sequelize.ts');
const { initModels } = require('../../src/database/models/index.ts');
const { createMigrator } = require('../../src/database/migrator.ts');
const { hashPassword } = require('../../src/modules/auth/password.ts');
const { generateInviteCode } = require('../../src/modules/auth/invite-code.ts');
const { createApp } = require('../../src/app.ts');
const { GameService } = require('../../src/modules/richman/game-service.ts');
const { fixtureHost } = require('../../tests/helpers/richman-host-fixture.ts');
const { canonicalSaveJSON } = require('../../shared/richman/game/save.ts');
const { GameEngine } = require('../../shared/richman/game/engine.ts');
const { SERVER_MANIFEST } = require('../../shared/richman/content.ts');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const config = loadConfig(); assert.equal(config.database.name, 'homeAssistantDB_test'); config.logLevel = 'silent';
const sequelize = createSequelize(config), models = initModels(sequelize), context = { config, sequelize, models };
const owners = [], gameIds = [], results = [], errors = [];
let service, server, browser, page;
const output = path.resolve('docs/richman/net01');
const wait = async (test, timeout = 30000) => {
  const until = Date.now() + timeout;
  while (Date.now() < until) { if (await test()) return; await new Promise(resolve => setTimeout(resolve, 100)); }
  throw new Error('browser acceptance condition timed out');
};
try {
  await mkdir(output, { recursive: true }); await sequelize.authenticate(); await createMigrator(sequelize, false).up();
  for (let i = 0; i < 2; i++) {
    const id = randomUUID(), username = `netui_${id.replaceAll('-', '').slice(0, 24)}`, password = `Net01!${randomUUID()}`;
    await models.User.create({ id, username, passwordHash: await hashPassword(password), displayName: 'NET-01 验收', inviteCode: generateInviteCode() });
    owners.push({ id, username, password });
  }
  service = new GameService(context); await service.start();
  const html = await readFile(new URL('./net01-mini-client.html', import.meta.url), 'utf8');
  const app = express();
  app.get('/net01-acceptance/:id', (_request, response) => response.type('html').send(html));
  app.use(createApp({ ...context, gameHost: service }));
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port;
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [game, index] of [['balloon', 130], ['sky', 808], ['penguin', 1827]]) {
    const id = randomUUID(); gameIds.push(id);
    const { host, replay } = fixtureHost('presentation-v47-paid-upgrade-tuu', (_s, i) => i === index, id);
    const checkpoint = host.checkpoint();
    checkpoint.seats.forEach((seat, i) => { seat.userId = owners[i].id; });
    const payload = canonicalSaveJSON(checkpoint), date = new Date();
    // Trusted fixture provisioning uses a legal recorded prefix and its complete journal.
    const engine = new GameEngine(SERVER_MANIFEST.map.nodes, replay.config), journal = [];
    for (const command of replay.commands.slice(0, index)) {
      const result = engine.dispatch(command); assert(result.ok);
      journal.push({ gameId: id, revision: command.expectedRevision + 1, userId: null, requestId: null,
        requestHash: null, command, events: result.events, receipt: null, createdAt: date });
    }
    await sequelize.transaction(async transaction => {
      await models.RichmanGame.create({ id, revision: host.state.revision, status: 'active', checkpoint: payload,
        checkpointHash: createHash('sha256').update(payload).digest('hex'), createdAt: date, updatedAt: date }, { transaction });
      await models.RichmanGameSeat.bulkCreate(checkpoint.seats.map(s => ({ gameId: id, ...s })), { transaction });
      await models.RichmanGameCommand.bulkCreate(journal, { transaction });
    });
    const browserContext = await browser.newContext({ viewport: { width: 1120, height: 850 } });
    page = await browserContext.newPage(); page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/v1/richman/games/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 40)); await route.continue();
    });
    await page.goto(`http://127.0.0.1:${port}/net01-acceptance/${id}`);
    const owner = owners[host.state.active];
    await page.getByLabel('账号', { exact: true }).fill(owner.username);
    await page.getByLabel('密码', { exact: true }).fill(owner.password);
    await page.getByRole('button', { name: '登录测试账号' }).click();
    await wait(() => page.getByRole('button', { name: '开始小游戏' }).isEnabled());
    const before = Number(await page.locator('#board').getAttribute('data-points'));
    await page.getByRole('button', { name: '开始小游戏' }).click();
    await wait(async () => Number(await page.locator('#board').getAttribute('data-tick')) >= 3);
    const started = Date.now();
    if (game === 'balloon') {
      for (let tries = 0; tries < 12 && Number(await page.locator('#board').getAttribute('data-score')) === 0; tries++) {
        await page.locator('.balloon').first().waitFor({ timeout: 12000 });
        await page.locator('.balloon').first().click({ force: true }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert(Number(await page.locator('#board').getAttribute('data-score')) > 0, 'network balloon click must actually score');
    } else if (game === 'sky') {
      await page.locator('#board').click({ position: { x: 220, y: 350 } });
      await wait(async () => (await page.locator('#board').getAttribute('data-target')) === '220');
      // Move under the first visible reward, allowing for its outward drift; no hidden-state access.
      const reward = page.locator('.drop:not([data-type="4"])').first();
      await reward.waitFor();
      const x = await reward.evaluate(drop => parseFloat(drop.style.left));
      const target = Math.max(1, Math.min(639, Math.round(x + (x - 320) * 0.22)));
      // The preceding input is still refreshing its projection; await its visible completion.
      await wait(() => page.getByRole('button', { name: '退出小游戏' }).isEnabled());
      await page.locator('#board').click({ position: { x: target, y: 350 } });
      await wait(async () => Number(await page.locator('#board').getAttribute('data-score')) > 0);
    } else {
      await page.locator('[data-cell="57"]').click();
      await wait(async () => JSON.parse(await page.locator('#board').getAttribute('data-penguin')).dug.includes(57));
    }
    await page.screenshot({ path: path.join(output, `${game}.png`) });
    // Disconnect after settling pending polls; no browser can generate ticks while offline.
    if ((await page.locator('#board').getAttribute('data-stage')) === 'playing') {
      await page.getByRole('button', { name: '模拟离线' }).click();
      await wait(() => page.getByRole('button', { name: '重新连接' }).isEnabled());
      await new Promise(resolve => setTimeout(resolve, 250));
      const offline = (await models.RichmanGame.findByPk(id)).checkpoint;
      await new Promise(resolve => setTimeout(resolve, 500));
      assert((await models.RichmanGame.findByPk(id)).checkpoint === offline, 'offline host must not advance its checkpoint');
      await page.getByRole('button', { name: '重新连接' }).click();
      await wait(() => page.getByRole('button', { name: '退出小游戏' }).isEnabled());
      await page.getByRole('button', { name: '退出小游戏' }).click();
    }
    await wait(() => page.getByRole('button', { name: '结算点数' }).isEnabled());
    const score = Number(await page.locator('#board').getAttribute('data-score'));
    await page.getByRole('button', { name: '结算点数' }).click();
    await wait(async () => (await page.locator('#status').getAttribute('data-last-input')) === 'ack');
    const row = await models.RichmanGame.findByPk(id), final = JSON.parse(row.checkpoint).engine.state;
    assert.equal(final.phase, 'turnEnd');
    assert.equal(final.items.points[`player-${host.state.active + 1}`], (before + (score & 65535)) & 65535);
    const commands = await models.RichmanGameCommand.findAll({ where: { gameId: id, revision: { [Op.gt]: index } } });
    assert(commands.some(c => c.command.action.input?.kind === 'tick' && c.userId === null));
    assert(commands.filter(c => c.command.action.input?.kind === 'tick').every(c => c.userId === null));
    assert.equal(commands.filter(c => c.command.action.input?.kind === 'ack').length, 1);
    results.push({ game, fixture: 'presentation-v47-paid-upgrade-tuu', legalPrefixCommands: index,
      serverCommands: commands.length, score, pointsBefore: before, pointsAfter: final.items.points[`player-${host.state.active + 1}`],
      activeInteractionMs: Date.now() - started, addedRequestLatencyMs: 40, authoritativeTicks: true, singleSettlement: true });
    console.log(`PASS ${game}: server clock, real input, offline wait, single settlement`);
    await browserContext.close();
  }
  assert.deepEqual(errors, []);
} catch (error) {
  errors.push(error.stack ?? String(error)); process.exitCode = 1; console.error(error.message);
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, 'failure.png') }).catch(() => {});
} finally {
  await browser?.close(); await service?.stop();
  if (server) await new Promise(resolve => server.close(resolve));
  if (gameIds.length) {
    const where = { gameId: { [Op.in]: gameIds } };
    await models.RichmanGameCommand.destroy({ where }); await models.RichmanGameSeat.destroy({ where });
    await models.RichmanGame.destroy({ where: { id: { [Op.in]: gameIds } } });
  }
  if (owners.length) {
    const where = { userId: { [Op.in]: owners.map(o => o.id) } };
    await models.AuthRefreshSession.update({ replacedBySessionId: null }, { where });
    await models.AuthRefreshSession.destroy({ where });
    await models.User.destroy({ where: { id: { [Op.in]: owners.map(o => o.id) } } });
  }
  await sequelize.close();
  await writeFile('/private/tmp/richman-net01-browser.json', JSON.stringify({ generatedAt: new Date().toISOString(),
    environment: 'Chrome headless, test-only browser client, real local HTTP API/server scheduler/cloud homeAssistantDB_test',
    fixtureBoundary: 'Legally replayed v47 prefixes seed minigame entry; not a complete room or journey UI acceptance.',
    results, errors, cleanup: 'Only this run UUID games/users/auth sessions removed; production untouched' }, null, 2));
}
