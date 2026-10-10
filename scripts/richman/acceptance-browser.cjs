/** S1 / S2-02 original-map acceptance. Run against local Vite; mocks auth only in this isolated context. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { resolve } = require('node:path');
const origin = process.env.RICHMAN_TEST_ORIGIN || 'http://127.0.0.1:5174';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw Error('Local validation only');
const mode = process.env.RICHMAN_TEST_MODE === 'tools' ? 'tools' : 'economy';
const output = resolve(process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-s1-05');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const report = { mode, map: 'original Japan, no modified roads/assets/state', animation: 'test-only repeated original 50 ms session ticks', games: [], errors: [] };
  try {
    for (const count of [2, 3, 4]) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1080 } });
      const user = { id: 'richman-validation', username: 'validation', displayName: '技术验证', inviteCode: 'VALIDATION', invitedByUserId: null, status: 'active', createdAt: '2026-09-28T00:00:00.000Z' };
      await context.route(origin + '/api/**', route => route.fulfill(route.request().url().endsWith('/users/me') ? { json: { success: true, data: { user } } } : { status: 404, json: { success: false } }));
      await context.addInitScript(({ user }) => {
        localStorage.setItem('home-assistant.session.v1', JSON.stringify({ user, tokens: { accessToken: 'browser-test-only', refreshToken: 'browser-test-only', tokenType: 'Bearer', accessExpiresIn: 3600, refreshExpiresIn: 7200 }, accessExpiresAt: Date.now() + 3600000, refreshExpiresAt: Date.now() + 7200000 }));
        const pending = new Set(), raf = requestAnimationFrame.bind(window), cancel = cancelAnimationFrame.bind(window);
        window.requestAnimationFrame = cb => { const id = raf(t => { pending.delete(id); cb(t); }); pending.add(id); return id; };
        window.cancelAnimationFrame = id => { pending.delete(id); cancel(id); };
        window.__richmanProbe = () => ({ raf: pending.size, canvas: document.querySelectorAll('canvas').length });
      }, { user });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
      await page.goto(origin);
      // Patch the animation adapter in this browser context before lazy loading the game.
      // Every movement still passes through original tick -> animationDone -> engine validation.
      // UI selects every route and resolves every decision. No positions, money or rules injected.
      await page.evaluate(async () => {
        const source = await (await fetch('/src/features/richman/scene.ts')).text();
        const specifier = source.match(/from [\"']([^\"']+\/session\.ts[^\"']*)[\"']/)?.[1];
        if (!specifier) throw Error('Cannot locate Vite session import');
        const { GameSession } = await import(specifier);
        window.__acceleratedTicks = 0;
        const tick = GameSession.prototype.tick;
        GameSession.prototype.tick = function (ms) {
          for (let i = 0; i < 500; i++) {
            window.__acceleratedTicks++;
            tick.call(this, ms > 0 ? 50 : ms);
            if (this.state.paused || !['rolling', 'moving'].includes(this.state.phase)) break;
          }
        };
      });
      await page.locator('a[href="/modules/richman"]').click();
      await page.waitForFunction(() => document.querySelector('.rm-roll') && !document.querySelector('.rm-roll').disabled, null, { timeout: 30000 });
      const plan = await page.evaluate(async ({ count, mode }) => {
        const { GameEngine } = await import('/src/features/richman/game/engine.ts');
        const { ITEM_RULES, REMOTE_DICE, REMOTE_EFFECT } = await import('/src/features/richman/game/items.ts');
        const { FINANCE_RULES } = await import('/src/features/richman/game/finance.ts');
        const manifest = await (await fetch('/richman/generated/manifest.json')).json();
        // Two players deliberately use non-adjacent character indices.
        const characters = count === 2 ? [manifest.characters[0], manifest.characters[2]] : manifest.characters.slice(0, count);
        const config = { gameId: 'plan', seed: 's1-04-loop', characterIds: characters.map(c => c.id), initialFunds: 30000, rulesId: mode === 'tools' ? ITEM_RULES.id : FINANCE_RULES.id };
        const engine = new GameEngine(manifest.map.nodes, config), steps = [];
        function send(action) {
          const s = engine.state;
          if (action.type !== 'animationDone') steps.push({ action, phase: s.phase, turn: s.turn, round: s.finance.round, active: s.active, balances: s.economy.balances, eliminated: s.finance.eliminated.length });
          const result = engine.dispatch({ id: 'c' + s.revision, gameId: s.gameId, expectedRevision: s.revision, playerId: s.players[s.active].id, action });
          if (!result.ok) throw Error(result.reason);
        }
        for (let guard = 0; guard < 20000 && engine.state.phase !== 'finished'; guard++) {
          const s = engine.state, p = s.pending;
          if (s.phase === 'idle') {
            if (s.effects?.inventory[s.players[s.active].id][REMOTE_DICE]) {
              send({ type: 'item', action: { type: 'begin', definitionId: REMOTE_EFFECT } });
              send({ type: 'item', value: s.turn % 6 + 1, action: { type: 'confirm', decisionId: engine.state.pending.id, target: { kind: 'player', id: s.players[s.active].id } } });
            } else send({ type: 'roll' });
          }
          else if (s.phase === 'turnEnd') send({ type: 'endTurn' });
          else if (p.kind === 'branch') send({ type: 'choose', decisionId: p.id, node: p.choices[(s.turn - 1) % p.choices.length] });
          else if (p.kind === 'property') send({ type: 'property', decisionId: p.id, accept: p.operation === 'rent' || s.economy.balances[s.players[s.active].id].cash >= p.amount });
          else if (p.kind === 'shop') {
            const id = s.players[s.active].id;
            if (s.items.points[id] >= 30 && s.items.supply && (s.effects.inventory[id][REMOTE_DICE] ?? 0) < 9) send({ type: 'buyItem', decisionId: p.id, itemId: REMOTE_DICE });
            send({ type: 'leaveShop', decisionId: engine.state.pending.id });
          }
          else if (p.kind === 'debt') send({ type: 'settleDebt', decisionId: p.id });
          else if (p.kind === 'bank') {
            const amount = s.economy.balances[s.players[s.active].id].bank;
            if (amount) send({ type: 'bank', decisionId: p.id, operation: 'withdraw', amount });
            send({ type: 'leaveBank', decisionId: engine.state.pending.id });
          } else send({ type: 'animationDone', token: p.id });
        }
        if (engine.state.phase !== 'finished') throw Error('Plan did not finish');
        return { characters, config, steps, final: engine.state, events: engine.events };
      }, { count, mode });
      console.log(`${count} players: ${plan.final.turn} turns, ${plan.steps.length} UI commands`);
      await page.getByRole('button', { name: '新建对局', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel(/游戏模式/).selectOption(mode);
      for (const label of ['孙小美', '阿土伯', '钱夫人', '沙隆巴斯']) await dialog.getByLabel(label, { exact: true }).setChecked(plan.characters.some(c => c.name === label));
      await dialog.getByLabel(/每人初始资金/).selectOption('30000');
      await dialog.getByLabel(/对局种子/).fill(plan.config.seed);
      await dialog.getByRole('button', { name: '开始新对局' }).click();
      // Repeated long-game actions activate real enabled DOM buttons; pointer/scroll behavior is checked separately at normal speed.
      let lastReported = 0;
      for (const step of plan.steps) {
        await page.waitForFunction(phase => document.querySelector('[data-testid="richman-viewport"]')?.dataset.phase === phase, step.phase, { timeout: 10000 });
        if (step.action.type === 'roll' || step.action.type === 'settleDebt' || step.action.type === 'item' && step.action.action.type === 'begin') {
          const ui = await page.evaluate(() => ({ characters: [...document.querySelectorAll('.rm-character')].map(el => ({ text: el.innerText, active: el.classList.contains('is-active'), bankrupt: el.classList.contains('is-bankrupt') })), text: document.querySelector('.rm-page').innerText }));
          assert.equal(ui.characters.findIndex(c => c.active), step.active);
          assert.equal(ui.characters.filter(c => c.bankrupt).length, step.eliminated);
          for (let i = 0; i < count; i++) {
            const balance = step.balances['player-' + (i + 1)];
            assert.ok(ui.characters[i].text.includes(`现金 ${balance.cash.toLocaleString('zh-CN')}`));
            assert.ok(ui.characters[i].text.includes(`存款 ${balance.bank.toLocaleString('zh-CN')}`));
          }
          assert.ok(ui.text.includes(`第 ${step.round} 轮 · 第 ${step.turn} 回合`));
        }
        const action = step.action;
        if (action.type === 'roll') await page.getByRole('button', { name: '掷骰出发' }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        else if (action.type === 'item') {
          if (action.action.type === 'begin') await page.getByRole('button', { name: '使用遥控骰子', exact: true }).evaluate(button => { if (button.disabled) throw Error('Disabled item'); button.click(); });
          else {
            await page.getByRole('radio', { name: `${action.value} 点`, exact: true }).check();
            await page.getByRole('button', { name: '确认并出发', exact: true }).evaluate(button => { if (button.disabled) throw Error('Disabled confirmation'); button.click(); });
          }
        } else if (action.type === 'buyItem') await page.getByRole('button', { name: '购买遥控骰子', exact: true }).evaluate(button => { if (button.disabled) throw Error('Disabled purchase'); button.click(); });
        else if (action.type === 'leaveShop') await page.getByRole('button', { name: '离开商店', exact: true }).evaluate(button => { if (button.disabled) throw Error('Disabled shop'); button.click(); });
        else if (action.type === 'endTurn') await page.getByRole('button', { name: '下一位', exact: true }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        else if (action.type === 'choose') await page.getByRole('group', { name: '选择岔路' }).getByRole('button').filter({ hasText: new RegExp(` · ${action.node}号`) }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        else if (action.type === 'property') await page.getByRole('group', { name: '当前地产决策' }).getByRole('button', { name: action.accept ? /确认购买|确认升级|支付租金/ : '暂时放弃' }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        else if (action.type === 'bank') {
          const region = page.getByRole('region', { name: '银行存取款' });
          await region.getByRole('button', { name: '全部取出' }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
          await region.getByRole('button', { name: '确认取款' }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        } else if (action.type === 'leaveBank') await page.getByRole('button', { name: /离开银行/ }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        else if (action.type === 'settleDebt') {
          await page.screenshot({ path: `${output}/${count}p-debt-${step.eliminated + 1}.png`, fullPage: true });
          if (count === 4 && step.eliminated === 0) {
            await page.setViewportSize({ width: 390, height: 844 });
            await page.getByRole('region', { name: '债务处理' }).scrollIntoViewIfNeeded();
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.waitForTimeout(250);
            await page.screenshot({ path: `${output}/4p-debt-mobile.png`, fullPage: true });
            await page.setViewportSize({ width: 1440, height: 1080 });
          }
          await page.getByRole('button', { name: '确认支付现有资金并破产' }).evaluate(button => { if (button.disabled) throw Error('Disabled UI action'); button.click(); });
        }
        if (step.turn >= lastReported + 50) { lastReported = step.turn; console.log(`${count} players: turn ${step.turn}`); }
      }
      assert.ok(await page.evaluate(() => window.__acceleratedTicks > 100), 'Animation wrapper must run on the actual Vite module');
      await page.getByRole('region', { name: '对局结果' }).waitFor();
      assert.equal(await page.locator('.rm-character.is-bankrupt').count(), count - 1);
      assert.equal(await page.getByRole('button', { name: '暂停', exact: true }).isDisabled(), true);
      await page.getByRole('button', { name: '全屏游戏', exact: true }).click();
      await page.waitForFunction(() => !!document.fullscreenElement);
      // ResizeObserver can clear WebGL after the fullscreen event; let subsequent frames paint.
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${output}/${count}p-result-fullscreen.png` });
      await page.getByRole('button', { name: '退出全屏', exact: true }).click();
      await page.locator('.rm-diagnostics summary').click();
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: '下载回放记录' }).click();
      await (await download).saveAs(`${output}/${count}p-replay.json`);
      const replay = JSON.parse(fs.readFileSync(`${output}/${count}p-replay.json`, 'utf8'));
      const restored = await page.evaluate(async replay => {
        const { replayGame } = await import('/src/features/richman/game/engine.ts');
        const manifest = await (await fetch('/richman/generated/manifest.json')).json();
        const engine = replayGame(manifest.map.nodes, replay);
        return { state: engine.state, events: engine.events };
      }, replay);
      const normalizeState = state => normalizeEvents({ ...state, gameId: 'normalized', ...(state.effects ? { effects: { ...state.effects, gameId: 'normalized' } } : {}) }, state.gameId);
      const normalizeEvents = (events, gameId) => JSON.parse(JSON.stringify(events, (key, value) => key === 'commandId' ? undefined : typeof value === 'string' && value.startsWith(gameId + ':') ? 'normalized' + value.slice(gameId.length) : value));
      assert.deepEqual(normalizeState(restored.state), normalizeState(plan.final));
      assert.deepEqual(normalizeEvents(restored.events, restored.state.gameId), normalizeEvents(plan.events, plan.final.gameId));
      // Reset at terminal state must restore configuration, seed, funds and vacant ownership.
      await page.getByRole('button', { name: '重新开始', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: '确认重新开始' }).click();
      assert.equal(await page.getByTestId('richman-viewport').getAttribute('data-phase'), 'idle');
      assert.equal(await page.locator('.rm-character.is-bankrupt').count(), 0);
      for (const text of await page.locator('.rm-balance').allTextContents()) assert.equal(text, '现金 15,000存款 15,000');
      const resetDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: '下载回放记录' }).click();
      await (await resetDownload).saveAs(`${output}/${count}p-reset-replay.json`);
      const resetReplay = JSON.parse(fs.readFileSync(`${output}/${count}p-reset-replay.json`, 'utf8'));
      assert.notEqual(resetReplay.config.gameId, replay.config.gameId);
      assert.deepEqual({ ...resetReplay.config, gameId: 'normalized' }, { ...replay.config, gameId: 'normalized' });
      assert.deepEqual(resetReplay.commands, []);
      if (mode === 'tools') {
        const fresh = await page.evaluate(async replay => {
          const { replayGame } = await import('/src/features/richman/game/engine.ts');
          const manifest = await (await fetch('/richman/generated/manifest.json')).json();
          return replayGame(manifest.map.nodes, replay).state;
        }, resetReplay);
        assert.equal(fresh.items.supply, 10 - count);
        assert.deepEqual(Object.values(fresh.items.points), Array(count).fill(0));
        assert.deepEqual(Object.values(fresh.effects.inventory).map(i => i['tool:08']), Array(count).fill(1));
        for (const type of ['pointsAwarded', 'shopOffered', 'itemBought', 'effectConsumed', 'inventoryCleared']) assert.ok(restored.events.some(e => e.type === type), type);
      }
      await page.getByRole('link', { name: '模块集合', exact: true }).click();
      await page.waitForTimeout(150);
      const cleanup = await page.evaluate(() => window.__richmanProbe());
      assert.deepEqual(cleanup, { raf: 0, canvas: 0 });
      const levels = new Map(), releasedBuilt = new Set(), repurchases = [], eliminations = [], bankArrivals = { passing: 0, landing: 0 };
      for (const event of restored.events) {
        if (event.type === 'bankOffered') bankArrivals[event.decision.arrival]++;
        if (event.type === 'bankrupt') {
          const built = event.released.filter(id => (levels.get(id) || 0) > 0);
          built.forEach(id => releasedBuilt.add(id));
          eliminations.push({ turn: event.turn, playerId: event.playerId, released: event.released.length, built: built.length });
        }
        if (event.type === 'propertySettled') {
          if (event.operation === 'buy' && releasedBuilt.has(event.propertyId)) {
            repurchases.push({ turn: event.turn, propertyId: event.propertyId, level: event.level, amount: event.amount });
            releasedBuilt.delete(event.propertyId);
          }
          levels.set(event.propertyId, event.level);
        }
      }
      const summary = { count, bankArrivals, eliminations, repurchases, seed: plan.config.seed, turns: restored.state.turn, finance: restored.state.finance, uiCommands: plan.steps.length, replayCommands: replay.commands.length, histogram: restored.events.reduce((all, event) => ({ ...all, [event.type]: (all[event.type] || 0) + 1 }), {}), cleanup };
      report.games.push(summary);
      fs.writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(String(error.stack || error).slice(0, 5000)); process.exitCode = 1; });
