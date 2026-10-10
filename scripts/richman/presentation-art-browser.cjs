/** Isolated display fixtures on the real renderer, not native-game equivalence tests. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.RICHMAN_BASE_URL || 'http://127.0.0.1:5174';
const output = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-presentation-art';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local fixtures only');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 740 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    const coverage = await page.evaluate(async () => {
      await import('/src/pages/RichmanPage.tsx');
      const { createScene } = await import('/src/features/richman/scene.ts');
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;z-index:99999'; document.body.append(host);
      const scene = await createScene(host, new AbortController().signal, { state() {}, stats() {}, progress() {}, error(message) { throw Error(message); } });
      window.artScene = scene; scene.model.pause(true); scene.app.stop(); scene.follow = false;
      const state = scene.model.state, before = JSON.stringify(scene.model.gameState), replay = JSON.stringify(scene.model.exportReplay());
      const reset = () => {
        Object.assign(state, scene.model.snapshot()); state.participants = [0, 1, 2, 3]; state.eliminated = [];
        for (let i = 0; i < 4; i++) {
          const id = `player-${i + 1}`;
          Object.assign(state.g2.players[id], { prison: 0, hospital: 0, winter: 0, dream: 0, travel: 0, vehicle: 'foot' });
          state.g5.engineers[id] = null;
          Object.assign(state.actors[i], { x: 750 + i * 135, y: 1130, direction: 0 });
        }
        state.g6.gods = []; state.g6.objects = []; state.roadTools.blocks = []; state.g5.hazards = [];
      };
      const apply = (i, mode) => {
        const id = `player-${i + 1}`, m = state.g2.players[id];
        if (mode === 'engineer') state.g5.engineers[id] = { remaining: 7, suspended: false, vehicle: 'foot', dice: 1 };
        else if (mode === 'car' || mode === 'motorcycle') m.vehicle = mode === 'car' ? 'tool:06' : 'tool:05';
        else m[mode] = 2;
      };
      let checked = 0;
      for (const mode of ['motorcycle', 'car', 'engineer', 'dream', 'winter', 'hospital', 'prison']) {
        reset();
        for (let i = 0; i < 4; i++) {
          apply(i, mode); state.active = i;
          const pose = scene.manifest.characters[i].poses[mode];
          for (let direction = 0; direction < 8; direction++) {
            state.actors[i].direction = direction;
            for (const moving of [false, true]) {
              state.phase = moving ? 'moving' : 'idle'; scene.animationMs = 95; scene.renderActors();
              const key = moving ? pose.walk[direction * pose.walkFramesPerDirection + 1 % pose.walkFramesPerDirection] : pose.idle[direction];
              if (scene.actors[i].texture !== scene.textures.get(key)) throw Error('Wrong pose frame');
              const frame = scene.manifest.sprites[key], sprite = scene.actors[i];
              if (sprite.anchor.x !== frame.anchorX / frame.width || sprite.anchor.y !== frame.anchorY / frame.height || scene.spriteFrames.get(sprite) !== frame) throw Error('Wrong anchor or hit mask');
              checked++;
            }
          }
        }
      }
      reset(); apply(0, 'car'); state.active = 0; state.phase = 'moving'; state.paused = true;
      scene.renderActors(); const frame = scene.actors[0].texture, clock = scene.animationMs;
      for (let i = 0; i < 10; i++) scene.tick();
      if (scene.actors[0].texture !== frame || scene.animationMs !== clock) throw Error('Paused animation advanced');
      state.g5.hazards = [{ id: 1, itemId: 'tool:03', node: 2, carrier: null, remaining: 0 }, { id: 2, itemId: 'tool:04', node: 1, carrier: 'player-1', remaining: 10 }];
      state.roadTools.blocks = [1]; scene.drawRoadTools(state); scene.renderActors();
      if (scene.toolSprites.size !== 3) throw Error('Missing road tools');
      const bomb = scene.toolSprites.get('hazard:2'); state.actors[0].x += 12.5; scene.renderActors();
      if (bomb.x !== state.actors[0].x || bomb.y !== state.actors[0].y - 45) throw Error('Carried bomb does not follow');
      state.g5.hazards = []; state.roadTools.blocks = []; scene.renderActors();
      if (scene.toolSprites.size) throw Error('Stale road tools');
      if (JSON.stringify(scene.model.gameState) !== before || JSON.stringify(scene.model.exportReplay()) !== replay) throw Error('Presentation changed rules or replay');
      window.showArt = kind => {
        reset();
        (kind === 'vehicles' ? ['motorcycle', 'car', 'engineer', 'dream'] : ['winter', 'hospital', 'prison', 'dream']).forEach((mode, i) => apply(i, mode));
        state.phase = 'idle'; state.active = 0;
        state.roadTools.blocks = [1];
        state.g5.hazards = [{ id: 1, itemId: 'tool:03', node: 2, carrier: null, remaining: 0 }, { id: 2, itemId: 'tool:04', node: 1, carrier: 'player-1', remaining: 10 }];
        scene.drawRoadTools(state); scene.renderActors(); scene.center = { x: 955, y: 1110 }; scene.zoom = 1.8; scene.camera(); scene.app.render();
      };
      const dice = await Promise.all(Array.from({ length: 6 }, async (_, i) => {
        const image = new Image(); image.src = `/richman/generated/dice-${i + 1}.webp`; await image.decode(); return image.width > 0;
      }));
      return { directionalPoses: checked, roadTools: 3, diceImages: dice.filter(Boolean).length, paused: true, replayUnchanged: true, atlas: [scene.images[1].width, scene.images[1].height] };
    });
    assert.equal(coverage.directionalPoses, 448); assert.equal(coverage.diceImages, 6);
    assert.ok(coverage.atlas.every(v => v <= 4096));
    for (const kind of ['vehicles', 'statuses']) {
      await page.evaluate(kind => window.showArt(kind), kind); await page.screenshot({ path: `${output}/${kind}.png` });
    }
    await page.evaluate(() => {
      const s = window.artScene, state = s.model.state, node = s.model.nodes.get(2);
      state.g5.hazards.push({ id: 3, itemId: 'tool:04', node: 3, carrier: null, remaining: 10 });
      s.drawRoadTools(state); s.renderActors(); s.center = { x: node.x, y: node.y }; s.zoom = 1.8; s.camera(); s.app.render();
    });
    await page.screenshot({ path: `${output}/road-tools.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    // The stopped fixture must render after ResizeObserver resizes the framebuffer.
    await page.waitForTimeout(200);
    await page.evaluate(() => { window.showArt('vehicles'); const s = window.artScene; s.center.x = 885; s.camera(); s.app.render(); });
    await page.screenshot({ path: `${output}/mobile.png` });
    await page.evaluate(() => { const s = window.artScene; s.model.reset(); s.renderActors(); if (s.toolSprites.size) throw Error('Reset left stale tools'); s.destroy(); });
    assert.equal(await page.locator('canvas').count(), 0); assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/results.json`, JSON.stringify({ ...coverage, errors }, null, 2)); console.log(JSON.stringify({ ...coverage, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
