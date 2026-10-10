/** Isolated rendering fixture on the real map; not a gameplay or native-equivalence test. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.RICHMAN_BASE_URL || 'http://127.0.0.1:5174';
const output = process.env.RICHMAN_TEST_OUTPUT || '/private/tmp/richman-map-art';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local rendering fixture only');
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 740 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base);
    const coverage = await page.evaluate(async () => {
      // Match the application's module initialization order, including React's Vite preamble.
      await import('/src/pages/RichmanPage.tsx');
      const { createScene } = await import('/src/features/richman/scene.ts');
      const { PROPERTY_CATALOG } = await import('/src/features/richman/game/economy.ts');
      const { propertyAppearance, propertySprite } = await import('/src/features/richman/property-art.ts');
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;inset:0;z-index:99999'; document.body.append(host);
      const scene = await createScene(host, new AbortController().signal, {
        state() {}, stats() {}, progress() {}, error(message) { throw Error(message); },
      });
      window.mapArtScene = scene;
      scene.follow = false;
      const manifest = scene.manifest, original = scene.model.snapshot();
      if (JSON.stringify(manifest.map.nodes) !== JSON.stringify((await import('/src/features/richman/japan-topology.fixture.json')).default)) throw Error('Gameplay topology changed');
      const rendered = scene.groundTiles.children;
      if (rendered.length !== 43) throw Error('Missing rendered road tiles');
      manifest.map.roadTiles.forEach((tile, i) => {
        if (rendered[i].texture !== scene.textures.get(tile.sprite) || rendered[i].x !== tile.x || rendered[i].y !== tile.y) throw Error('Wrong road sprite or anchor');
      });
      const scenery = manifest.map.scenery.filter(item => scene.objects.children.some(sprite =>
        sprite.texture === scene.textures.get(item.sprite) && sprite.x === item.x && sprite.y === item.y));
      if (scenery.length !== 22) throw Error('Missing company or landmark');
      const tested = [];
      const facility = PROPERTY_CATALOG.properties.find(p => p.id === 'japan:facility:2');
      for (const [type, cap] of [1, 5, 5, 1, 5].entries()) for (let level = 1; level <= cap; level++) {
        const snapshot = structuredClone(original), state = snapshot.economy.properties.find(p => p.id === facility.id);
        state.buildingType = type; state.level = level;
        scene.renderProperties(snapshot);
        const view = scene.propertyViews.get(facility.id), key = propertySprite(state, propertyAppearance(facility, manifest));
        if (!view.house.visible || view.house.texture !== scene.textures.get(key)) throw Error('Wrong facility presentation');
        tested.push(key);
      }
      scene.renderProperties(original);
      scene.setDebug(true); scene.setDebug(false);
      if (!scene.paths.visible || !scene.groundTiles.visible) throw Error('Road art depends on debug');
      return { roads: rendered.length, scenery: scenery.length, facilityVariants: tested.length,
        ordinaryRoadNodes: manifest.map.roadTiles.filter(t => t.sprite === 'road-17').map(t => t.nodeId), topologyUnchanged: true };
    });
    assert.deepEqual(coverage, { roads: 43, scenery: 22, facilityVariants: 17,
      ordinaryRoadNodes: [15, 17, 21, 30, 32, 34, 80, 82, 84], topologyUnchanged: true });
    for (const [name, x, y, zoom] of [
      ['fortune', 1032, 1655, 1.7], ['prison-points', 1943, 350, 1.5],
      ['points-games', 590, 2020, 1.1], ['companies-landmarks', 1720, 1160, 1],
    ]) {
      await page.evaluate(({ x, y, zoom }) => { const s = window.mapArtScene; s.center = { x, y }; s.zoom = zoom; s.camera(); }, { x, y, zoom });
      await page.waitForTimeout(200); await page.screenshot({ path: `${output}/${name}.png` });
    }
    await page.evaluate(() => window.mapArtScene.destroy());
    assert.equal(await page.locator('canvas').count(), 0); assert.deepEqual(errors, []);
    fs.writeFileSync(`${output}/results.json`, JSON.stringify({ scope: 'isolated rendering fixtures; original map and assets', ...coverage, errors }, null, 2));
    console.log(JSON.stringify({ ...coverage, errors }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
