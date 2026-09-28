import { Application, Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { Traversal } from './traversal';
import type { Manifest, Snapshot } from './types';

export const ASSET_ROOT = '/richman/generated/';
export type SceneStats = { fps: number; zoom: number; sprites: number; loadMs: number };
type Callbacks = {
  state: (snapshot: Snapshot) => void;
  stats: (stats: SceneStats) => void;
  progress: (label: string) => void;
  error: (message: string) => void;
};

async function bitmap(path: string, signal: AbortSignal) {
  const response = await fetch(ASSET_ROOT + path, { signal });
  if (!response.ok) throw new Error('原版资源尚未准备好，请先运行资源转换脚本。');
  const image = await createImageBitmap(await response.blob());
  if (signal.aborted) { image.close(); throw new DOMException('Aborted', 'AbortError'); }
  return image;
}

export async function createScene(host: HTMLElement, signal: AbortSignal, callbacks: Callbacks): Promise<RichmanScene> {
  const started = performance.now();
  callbacks.progress('正在读取地图与角色…');
  const response = await fetch(ASSET_ROOT + 'manifest.json', { signal });
  if (!response.ok) throw new Error('找不到游戏资源。请先运行本地资源转换脚本，再重新加载。');
  const manifest = await response.json() as Manifest;
  if (manifest.version !== 1 || !manifest.map?.nodes?.length || !manifest.characters?.length || !manifest.sprites) {
    throw new Error('资源清单格式不正确，请重新导出。');
  }
  const model = new Traversal(manifest);
  callbacks.progress('正在展开地图和人物图集…');
  const results = await Promise.allSettled([bitmap('japan.webp', signal), bitmap('sprites.webp', signal)]);
  const images = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (signal.aborted || images.length !== 2) {
    images.forEach((image) => image.close());
    const failure = results.find((result) => result.status === 'rejected');
    throw failure?.status === 'rejected' ? failure.reason : new DOMException('Aborted', 'AbortError');
  }
  const app = new Application();
  let initialized = false;
  try {
    callbacks.progress('正在准备游戏画面…');
    await app.init({
      width: host.clientWidth || 800, height: host.clientHeight || 640,
      preference: 'webgl', background: '#152f42', resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true, antialias: false, autoStart: false, sharedTicker: false,
    });
    initialized = true;
    signal.throwIfAborted();
    const scene = new RichmanScene(app, host, manifest, model, images, callbacks, performance.now() - started);
    return scene;
  } catch (error) {
    if (initialized) app.destroy(true, { children: true });
    images.forEach((image) => image.close());
    throw error;
  }
}

export class RichmanScene {
  readonly model: Traversal;
  private readonly world = new Container();
  private readonly objects = new Container();
  private readonly paths = new Graphics();
  private readonly choices = new Graphics();
  private readonly ring = new Graphics();
  private readonly textures = new Map<string, Texture>();
  private readonly actors: Sprite[] = [];
  private readonly roots: Texture[] = [];
  private readonly observer: ResizeObserver;
  private disposed = false;
  private debug = false;
  private follow = true;
  private zoom = 1.2;
  private center = { x: 0, y: 0 };
  private drag: { id: number; x: number; y: number; moved: boolean } | null = null;
  private animationMs = 0;
  private statsMs = 0;
  private frames = 0;
  private readonly loadMs: number;
  private readonly listeners: (() => void)[] = [];

  constructor(
    private readonly app: Application,
    host: HTMLElement,
    readonly manifest: Manifest,
    model: Traversal,
    private readonly images: ImageBitmap[],
    private readonly callbacks: Callbacks,
    loadMs: number,
  ) {
    this.model = model;
    this.loadMs = loadMs;
    const ground = Texture.from(images[0]);
    const atlas = Texture.from(images[1]);
    ground.source.scaleMode = 'linear';
    atlas.source.scaleMode = 'nearest';
    this.roots.push(ground, atlas);
    for (const [id, frame] of Object.entries(manifest.sprites)) {
      this.textures.set(id, new Texture({ source: atlas.source, frame: new Rectangle(frame.x, frame.y, frame.width, frame.height) }));
    }
    this.world.addChild(new Sprite(ground), this.paths, this.ring, this.objects, this.choices);
    this.objects.sortableChildren = true;
    for (const item of manifest.map.scenery) {
      const sprite = new Sprite(this.textures.get(item.sprite)!);
      const frame = manifest.sprites[item.sprite];
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      sprite.position.set(item.x, item.y);
      sprite.zIndex = item.y;
      this.objects.addChild(sprite);
    }
    manifest.characters.forEach((character) => {
      const sprite = new Sprite(this.textures.get(character.idle[4])!);
      this.actors.push(sprite);
      this.objects.addChild(sprite);
    });
    this.drawPaths();
    this.paths.visible = false;
    app.stage.addChild(this.world);
    const canvas = app.canvas;
    canvas.setAttribute('aria-label', '日本地图，可拖动平移，滚轮缩放；使用旁边的按钮掷骰和选择岔路');
    canvas.setAttribute('role', 'img');
    host.appendChild(canvas);
    this.observer = new ResizeObserver(() => {
      if (this.disposed) return;
      app.renderer.resize(host.clientWidth, host.clientHeight);
      this.camera();
    });
    this.observer.observe(host);
    this.listen(canvas, 'pointerdown', this.pointerDown as EventListener);
    this.listen(canvas, 'pointermove', this.pointerMove as EventListener);
    this.listen(canvas, 'pointerup', this.pointerUp as EventListener);
    this.listen(canvas, 'pointercancel', this.pointerCancel as EventListener);
    this.listen(canvas, 'wheel', this.wheel as EventListener, { passive: false });
    this.listen(canvas, 'webglcontextlost', this.contextLost as EventListener);
    this.listen(document, 'visibilitychange', this.visibility);
    model.onChange = (state) => {
      if (this.disposed) return;
      this.drawChoices(state);
      callbacks.state(state);
    };
    this.focus();
    this.renderActors();
    callbacks.state(model.snapshot());
    this.reportStats(0);
    app.ticker.maxFPS = 60;
    app.ticker.add(this.tick);
    if (!document.hidden) app.start();
  }

  private listen(target: EventTarget, type: string, listener: EventListener, options?: AddEventListenerOptions) {
    target.addEventListener(type, listener, options);
    this.listeners.push(() => target.removeEventListener(type, listener, options));
  }

  private visibility = () => {
    if (this.disposed) return;
    if (document.hidden) this.app.stop();
    else { this.statsMs = this.frames = 0; this.app.start(); }
  };

  private contextLost = (event: Event) => {
    event.preventDefault();
    if (!this.disposed) this.callbacks.error('图形连接已中断，请重新加载场景。');
  };

  private tick = () => {
    if (this.disposed) return;
    const elapsed = this.app.ticker.elapsedMS;
    this.model.tick(elapsed);
    if (!this.model.state.paused) this.animationMs += Math.min(elapsed, 50);
    this.renderActors();
    if (this.follow) {
      const actor = this.model.actor;
      this.center.x += (actor.x - this.center.x) * 0.15;
      this.center.y += (actor.y - 55 - this.center.y) * 0.15;
    }
    this.camera();
    this.frames++;
    this.statsMs += elapsed;
    if (this.statsMs >= 1000) {
      this.reportStats(Math.round(this.frames * 1000 / this.statsMs));
      this.frames = this.statsMs = 0;
    }
  };

  private reportStats(fps: number) {
    this.callbacks.stats({ fps, zoom: Math.round(this.zoom * 100), sprites: this.textures.size, loadMs: Math.round(this.loadMs) });
  }

  private renderActors() {
    const state = this.model.state;
    this.actors.forEach((sprite, index) => {
      const actor = state.actors[index];
      const character = this.manifest.characters[index];
      const moving = index === state.active && state.phase === 'moving';
      const key = moving
        ? character.walk[actor.direction * character.walkFramesPerDirection + Math.floor(this.animationMs / 95) % character.walkFramesPerDirection]
        : character.idle[actor.direction];
      const frame = this.manifest.sprites[key];
      sprite.texture = this.textures.get(key)!;
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      sprite.position.set(actor.x, actor.y);
      sprite.zIndex = actor.y + 0.5;
    });
    const actor = this.model.actor;
    const color = this.manifest.characters[state.active].color;
    this.ring.clear().ellipse(actor.x, actor.y, 21, 10).fill({ color, alpha: 0.18 }).stroke({ color: '#fff7ca', width: 2 });
  }

  private drawPaths() {
    for (const node of this.manifest.map.nodes) {
      for (const id of node.adjacent) {
        const to = this.model.nodes.get(id)!;
        this.paths.moveTo(node.x, node.y).lineTo(to.x, to.y).stroke({ color: '#fff1aa', width: 2, alpha: 0.6 });
      }
      this.paths.circle(node.x, node.y, 4).fill({ color: '#fff4bc', alpha: 0.85 });
    }
  }

  private drawChoices(state: Snapshot) {
    this.choices.clear();
    for (const id of state.choices) {
      const node = this.model.nodes.get(id)!;
      this.choices.circle(node.x, node.y, 20).fill({ color: '#f4cf73', alpha: 0.45 }).stroke({ color: '#fff7d4', width: 3 });
    }
  }

  private camera() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const halfW = width / this.zoom / 2;
    const halfH = height / this.zoom / 2;
    const clamp = (value: number, half: number, size: number) => half * 2 > size ? size / 2 : Math.max(half - 80, Math.min(size - half + 80, value));
    this.center.x = clamp(this.center.x, halfW, this.manifest.map.width);
    this.center.y = clamp(this.center.y, halfH, this.manifest.map.height);
    this.world.scale.set(this.zoom);
    this.world.position.set(width / 2 - this.center.x * this.zoom, height / 2 - this.center.y * this.zoom);
  }

  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || this.drag) return;
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    this.app.canvas.setPointerCapture(event.pointerId);
  };
  private pointerMove = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
    if (!this.drag.moved && Math.hypot(dx, dy) < 4) return;
    this.follow = false;
    this.drag.moved = true;
    this.center.x -= dx / this.zoom;
    this.center.y -= dy / this.zoom;
    this.drag.x = event.clientX;
    this.drag.y = event.clientY;
    this.camera();
  };
  private pointerUp = (event: PointerEvent) => {
    if (!this.drag || this.drag.id !== event.pointerId) return;
    if (!this.drag.moved && this.model.state.phase === 'choosing') {
      const rect = this.app.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.world.x) / this.zoom;
      const y = (event.clientY - rect.top - this.world.y) / this.zoom;
      const id = this.model.state.choices.find((choice) => {
        const node = this.model.nodes.get(choice)!;
        return Math.hypot(node.x - x, node.y - y) < 24;
      });
      if (id !== undefined) this.model.choose(id);
    }
    this.pointerCancel();
  };
  private pointerCancel = () => {
    if (this.drag && this.app.canvas.hasPointerCapture(this.drag.id)) this.app.canvas.releasePointerCapture(this.drag.id);
    this.drag = null;
  };
  private wheel = (event: WheelEvent) => {
    event.preventDefault();
    this.changeZoom(event.deltaY > 0 ? -0.1 : 0.1);
  };

  changeZoom(delta: number) {
    this.zoom = Math.max(0.25, Math.min(2.5, this.zoom + delta));
    this.camera();
    this.reportStats(Math.round(this.app.ticker.FPS));
  }
  focus() {
    this.follow = true;
    this.center = { x: this.model.actor.x, y: this.model.actor.y - 55 };
    this.camera();
  }
  overview() {
    this.follow = false;
    this.zoom = Math.min(this.app.screen.width / this.manifest.map.width, this.app.screen.height / this.manifest.map.height) * 0.96;
    this.center = { x: this.manifest.map.width / 2, y: this.manifest.map.height / 2 };
    this.camera();
    this.reportStats(Math.round(this.app.ticker.FPS));
  }
  followPlayer() {
    this.zoom = 1.2;
    this.focus();
    this.reportStats(Math.round(this.app.ticker.FPS));
  }
  setDebug(value: boolean) { this.debug = value; this.paths.visible = this.debug; }
  select(index: number) { this.model.select(index); this.focus(); }
  reset() { this.model.reset(); this.followPlayer(); }
  junction() { this.model.visitJunction(); this.followPlayer(); }
  roll() {
    // Uniform 1–6 without modulo bias; no server or model call is needed.
    let value: number;
    do { value = crypto.getRandomValues(new Uint8Array(1))[0]; } while (value >= 252);
    this.model.roll(value % 6 + 1);
    this.focus();
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.model.onChange = () => undefined;
    this.pointerCancel();
    this.observer.disconnect();
    this.listeners.forEach((off) => off());
    this.app.stop();
    this.app.ticker.remove(this.tick);
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
    this.textures.forEach((texture) => texture.destroy(false));
    this.roots.forEach((texture) => texture.destroy(true));
    this.images.forEach((image) => image.close());
  }
}
