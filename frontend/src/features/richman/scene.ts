import {objectPoses, validObjectArt} from './object-presentation';
import {actorSprite, roadToolPoses} from './actor-presentation';
import type {ObjectArt} from './object-presentation';
import type {AudioPacket} from './audio';
import {godTrafficView} from './god-traffic-view';
import { buildingName, priceText } from './game/g4';
import { ROBOT_EFFECT } from './game/road-tools';
import { atlasMask, pickMapTarget, pointerToWorld } from './map-picking';
import type { PixelMask, PickLayer } from './map-picking';
import { propertyOutline, roadSegments } from './map-geometry';
import { propertyAppearance, propertySprite, validMapArt } from './property-art';
import { NEARBY_WORKER_EFFECT } from './game/nearby-construction';
import { Application, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { PROPERTY_CATALOG } from './game/economy';
import { GameSession } from './game/session';
import type { SessionSnapshot } from './game/session';
import type { Frame, Manifest, Snapshot } from './types';

export const ASSET_ROOT = '/richman/generated/';
export type SceneStats = { fps: number; zoom: number; sprites: number; objectSprites: number; objectIds: string[]; loadMs: number };
type Callbacks = {
  presentation?: (packet: AudioPacket) => void;
  propertySelected?: (propertyId: string, decisionId: string) => void;
  propertyMissed?: (decisionId: string) => void;
  state: (snapshot: SessionSnapshot) => void;
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
  if (manifest.sourceHashes?.['MapDat.MKF'] !== PROPERTY_CATALOG.sourceHash || !validMapArt(manifest) ||
    PROPERTY_CATALOG.properties.some((p) => p.nodeIds.some((id) => {
      const node = manifest.map.nodes.find((n) => n.id === id);
      return node?.kind !== (p.kind === 'land' ? 2000 : 4000) + Number(p.id.split(':')[2]);
    })) || PROPERTY_CATALOG.properties.some(p => !Number.isInteger(manifest.map.propertyDirections?.[p.id]))) {
    throw new Error('地产数据与素材版本不一致，请重新运行资源转换脚本。');
  }
  const model = new GameSession(manifest, undefined, 'surrender');
  callbacks.progress('正在展开地图和人物图集…');
  const results = await Promise.allSettled([bitmap('japan.webp', signal), bitmap('sprites.webp', signal)]);
  const images = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  if (signal.aborted || images.length !== 2) {
    images.forEach((image) => image.close());
    const failure = results.find((result) => result.status === 'rejected');
    throw failure?.status === 'rejected' ? failure.reason : new DOMException('Aborted', 'AbortError');
  }
  // Optional presentation package. Missing/corrupt art retains established markers and badges.
  let objectArt: ObjectArt | undefined;
  let objectImage: ImageBitmap | undefined;
  try {
    const response = await fetch(ASSET_ROOT + 'animation/manifest.json', {signal});
    if (response.ok) {
      const candidate: unknown = await response.json();
      objectImage = await bitmap('animation/objects.webp', signal);
      if (validObjectArt(candidate, objectImage.width, objectImage.height)) objectArt = candidate;
      else { objectImage.close(); objectImage = undefined; }
    }
  } catch { objectImage?.close(); objectImage = undefined; }
  if (objectImage) images.push(objectImage);
  if (signal.aborted) { images.forEach(image => image.close()); signal.throwIfAborted(); }
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
    const scene = new RichmanScene(app, host, manifest, model, images, callbacks, performance.now() - started, objectArt);
    return scene;
  } catch (error) {
    if (initialized) app.destroy(true, { children: true });
    images.forEach((image) => image.close());
    throw error;
  }
}

export class RichmanScene {
  readonly model: GameSession;
  private readonly world = new Container();
  private readonly objects = new Container();
  private readonly paths = new Graphics();
  private readonly groundTiles = new Container();
  private readonly pathDebug = new Graphics();
  private readonly roadMarkers = new Graphics();
  private readonly choices = new Graphics();
  private readonly propertyPreview = new Graphics();
  private readonly ring = new Graphics();
  private mask: PixelMask | null = null;
  private readonly spriteFrames = new Map<Sprite, Frame>();
  private readonly pickTargets = new Map<Container, string>();
  private readonly textures = new Map<string, Texture>();
  private readonly actors: Sprite[] = [];
  private readonly actorBadges: Text[] = [];
  private readonly propertyViews = new Map<string, { marker: Graphics; house: Sprite; label: Text }>();
  private propertySignature = '';
  private readonly roots: Texture[] = [];
  private readonly observer: ResizeObserver;
  private disposed = false;
  private debug = false;
  private follow = true;
  private zoom = 1.2;
  private center = { x: 0, y: 0 };
  private drag: { id: number; x: number; y: number; moved: boolean; decisionId: string | null } | null = null;
  private animationMs = 0;
  private presentationGame: string | null = null;
  private readonly godSprites = new Map<string, Sprite>();
  private readonly toolSprites = new Map<string, Sprite>();
  private statsMs = 0;
  private frames = 0;
  private readonly loadMs: number;
  private readonly listeners: (() => void)[] = [];

  constructor(
    private readonly app: Application,
    host: HTMLElement,
    readonly manifest: Manifest,
    model: GameSession,
    private readonly images: ImageBitmap[],
    private readonly callbacks: Callbacks,
    loadMs: number,
    private readonly objectArt?: ObjectArt,
  ) {
    this.model = model;
    this.loadMs = loadMs;
    const ground = Texture.from(images[0]);
    const atlas = Texture.from(images[1]);
    ground.source.scaleMode = 'linear';
    atlas.source.scaleMode = 'nearest';
    this.roots.push(ground, atlas);
    const pixels = document.createElement('canvas');
    pixels.width = images[1].width; pixels.height = images[1].height;
    const context = pixels.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('无法读取地图点选像素，请重新加载。');
    context.drawImage(images[1], 0, 0);
    this.mask = atlasMask(pixels.width, pixels.height, context.getImageData(0, 0, pixels.width, pixels.height).data);
    pixels.width = pixels.height = 1;
    for (const [id, frame] of Object.entries(manifest.sprites)) {
      this.textures.set(id, new Texture({ source: atlas.source, frame: new Rectangle(frame.x, frame.y, frame.width, frame.height) }));
    }
    if (objectArt && images[2]) {
      const objectsAtlas = Texture.from(images[2]); objectsAtlas.source.scaleMode = 'nearest'; this.roots.push(objectsAtlas);
      for (const [key, f] of Object.entries(objectArt.sprites)) this.textures.set(key, new Texture({source: objectsAtlas.source, frame: new Rectangle(f.x, f.y, f.width, f.height)}));
    }
    this.world.addChild(new Sprite(ground), this.paths, this.groundTiles, this.pathDebug, this.ring, this.objects, this.roadMarkers, this.choices, this.propertyPreview);
    for (const tile of manifest.map.roadTiles ?? []) {
      const sprite = new Sprite(this.textures.get(tile.sprite)!);
      const frame = manifest.sprites[tile.sprite];
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      sprite.position.set(tile.x, tile.y);
      this.groundTiles.addChild(sprite);
    }
    this.objects.sortableChildren = true;
    for (const item of manifest.map.scenery.filter((item) => !item.sprite.startsWith('building-'))) {
      const sprite = new Sprite(this.textures.get(item.sprite)!);
      const frame = manifest.sprites[item.sprite];
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      this.spriteFrames.set(sprite, frame);
      sprite.position.set(item.x, item.y);
      sprite.zIndex = item.y;
      this.objects.addChild(sprite);
    }
    for (const definition of PROPERTY_CATALOG.properties) {
      const property = propertyAppearance(definition, manifest);
      const marker = new Graphics(), house = new Sprite(), label = new Text({ text: '',
        style: { fontFamily: 'sans-serif', fontSize: 11, fill: '#fff', stroke: { color: '#183746', width: 3 } } });
      marker.position.set(property.x, property.y); marker.zIndex = property.y - 1;
      house.position.set(property.x, property.y); house.zIndex = property.y;
      const outline = propertyOutline(property);
      label.anchor.set(0.5, 0); label.position.set(property.x, property.y + Math.max(...outline.filter((_, i) => i % 2 === 1)) + 3); label.zIndex = property.y + 1;
      this.propertyViews.set(property.id, { marker, house, label });
      this.pickTargets.set(marker, property.id); this.pickTargets.set(house, property.id);
      this.objects.addChild(marker, house, label);
    }
    manifest.characters.forEach((character) => {
      const sprite = new Sprite(this.textures.get(character.idle[4])!);
      this.actors.push(sprite);
      const badge = new Text({text: '', style: {fontFamily: 'sans-serif', fontSize: 13, fontWeight: 'bold', fill: '#fff4ba', stroke: {color: '#24382e', width: 4}}});
      badge.anchor.set(0.5, 1); badge.eventMode = 'none';
      this.actorBadges.push(badge); this.world.addChild(badge);
      this.objects.addChild(sprite);
    });
    this.drawPaths();
    this.pathDebug.visible = false;
    app.stage.addChild(this.world);
    const canvas = app.canvas;
    canvas.setAttribute('aria-label', '日本地图，可拖动平移，滚轮缩放；邻近建造时可点选地块，再在面板确认；使用旁边按钮掷骰和选择岔路');
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
    this.listen(canvas, 'lostpointercapture', this.pointerCancel as EventListener);
    this.listen(canvas, 'wheel', this.wheel as EventListener, { passive: false });
    this.listen(canvas, 'webglcontextlost', this.contextLost as EventListener);
    this.listen(document, 'visibilitychange', this.visibility);
    model.onPresentation = packet => {
      if (this.disposed) return;
      if (this.presentationGame !== packet.gameId || packet.flush) this.animationMs = 0;
      this.presentationGame = packet.gameId;
      callbacks.presentation?.(packet);
    };
    const initial = model.gameState!;
    callbacks.presentation?.({gameId:initial.gameId,revision:initial.revision,paused:initial.paused,active:initial.phase!=='finished',landings:[]});
    model.onChange = (state) => {
      if (this.disposed) return;
      // A command, pause or new game invalidates an in-flight gesture.
      this.pointerCancel();
      this.drawChoices(state);
      this.drawRoadTools(state);
      if (state.phase !== 'effect') this.propertyPreview.clear();
      this.renderProperties(state);
      callbacks.state(state);
    };
    this.focus();
    this.renderActors();
    this.drawRoadTools(model.state); // Initial fallback markers must not wait for the first command.
    this.renderProperties(model.state);
    callbacks.state(model.snapshot());
    this.reportStats(0);
    app.ticker.maxFPS = 60;
    app.ticker.add(this.tick);
    if (!document.hidden) app.start();
  }

  private renderProperties(state: SessionSnapshot) {
    const signature = JSON.stringify([state.participants, state.economy?.properties]);
    if (signature === this.propertySignature) return;
    this.propertySignature = signature;
    for (const catalogDefinition of PROPERTY_CATALOG.properties) {
      const definition = propertyAppearance(catalogDefinition, this.manifest);
      const view = this.propertyViews.get(definition.id)!;
      const property = state.economy?.properties.find((p) => p.id === definition.id);
      view.marker.visible = view.label.visible = !!property;
      view.house.visible = !!property && property.level > 0;
      if (!property) continue;
      const ownerIndex = property.ownerId ? Number(property.ownerId.split('-')[1]) - 1 : -1;
      const owner = ownerIndex >= 0 ? this.manifest.characters[state.participants[ownerIndex]] : null;
      const color = owner?.color ?? '#d9ded4';
      view.marker.clear().poly(propertyOutline(definition)).fill({ color, alpha: owner ? 0.3 : 0.08 }).stroke({ color, width: 2 });
      view.label.text = owner ? `${owner.name} · ${property.level}级` : definition.kind === 'facility' ? '大型用地' : property.level ? `待售 · ${property.level}级` : '空地';
      if (state.g4) view.label.text = `${owner?.name ?? '待售'} · ${buildingName(property, definition)} ${property.level}级 ${priceText(property)}${property.research ? ` · 研究 ${property.research.remaining}` : ''}`;
      if (view.house.visible) {
        const key = propertySprite(property, definition)!;
        const frame = this.manifest.sprites[key];
        view.house.texture = this.textures.get(key)!;
        this.spriteFrames.set(view.house, frame);
        view.house.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      }
    }
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
    this.callbacks.stats({ fps, zoom: Math.round(this.zoom * 100), sprites: this.textures.size, objectSprites: this.godSprites.size, objectIds: [...this.godSprites.keys()].sort(), loadMs: Math.round(this.loadMs) });
  }

  private renderActors() {
    const state = this.model.state;
    this.actors.forEach((sprite, index) => {
      sprite.visible = state.participants.includes(index) && !state.eliminated.includes(index) && !state.g2?.players[`player-${state.participants.indexOf(index)+1}`]?.travel;
      const badge = this.actorBadges[index], seat = state.participants.indexOf(index);
      const status = seat >= 0 ? godTrafficView(state, seat) : null;
      badge.visible = sprite.visible && !!status?.badge;
      if (status) { badge.text = status.badge; badge.style.fill = status.bad ? '#ffd1ca' : '#fff4ba'; }
      if (!sprite.visible) return;
      const actor = state.actors[index];
      const key = actorSprite(this.manifest, state, index, this.animationMs);
      const frame = this.manifest.sprites[key];
      sprite.texture = this.textures.get(key)!;
      this.spriteFrames.set(sprite, frame);
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      sprite.position.set(actor.x, actor.y);
      badge.position.set(actor.x, actor.y - 65);
      sprite.zIndex = actor.y + 0.5;
    });
    this.renderGods(state);
    this.renderRoadToolSprites(state);
    const actor = this.model.actor;
    const color = this.manifest.characters[state.active].color;
    this.ring.visible = !state.eliminated.includes(state.active) && !state.g2?.players[`player-${state.participants.indexOf(state.active)+1}`]?.travel;
    this.ring.clear().ellipse(actor.x, actor.y, 21, 10).fill({ color, alpha: 0.18 }).stroke({ color: '#fff7ca', width: 2 });
  }

  private renderGods(state: SessionSnapshot) {
    if (!this.objectArt) return;
    const poses = objectPoses(state, this.model.nodes, this.objectArt), live = new Set(poses.map(p => p.id));
    for (const [id, sprite] of this.godSprites) if (!live.has(id)) { sprite.destroy(); this.godSprites.delete(id); }
    for (const pose of poses) {
      let sprite = this.godSprites.get(pose.id);
      if (!sprite) { sprite = new Sprite(); sprite.eventMode = 'none'; this.godSprites.set(pose.id, sprite); this.objects.addChild(sprite); }
      const frame = this.objectArt.sprites[pose.key];
      sprite.texture = this.textures.get(pose.key)!;
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      sprite.position.set(pose.x, pose.y); sprite.zIndex = pose.y + 0.25;
      // Presentation overlay: intentionally absent from the original atlas's property hit mask.
    }
  }

  private drawRoadTools(state: SessionSnapshot) {
    const graphics = this.roadMarkers.clear();
    if (state.effects?.pending?.definitionId === ROBOT_EFFECT) {
      const start = this.model.nodes.get(state.actors[state.active].node)!;
      graphics.moveTo(start.x, start.y);
      for (const id of state.robotRoute ?? []) { const node = this.model.nodes.get(id)!; graphics.lineTo(node.x, node.y); }
      graphics.stroke({ color: '#ffe183', width: 4, alpha: 0.7 });
    }
    for (const g of state.g6?.gods ?? []) {
      if (g.carrier || this.objectArt) continue;
      const node = this.model.nodes.get(g.node)!;
      graphics.circle(node.x, node.y - 20, 12).stroke({ color: '#e8b53f', width: 3 }).circle(node.x, node.y - 20, 5).fill('#fff4ba');
    }
    for(const g of this.objectArt ? [] : state.g6?.objects??[]){const n=this.model.nodes.get(g.node)!;graphics.rect(n.x-10,n.y-32,20,20).fill(g.type===11?'#d65545':g.type===13?'#5496df':'#68b573').stroke({color:'#fff4ba',width:2});}
    for (const h of state.g5?.hazards ?? []) {
      if (this.textures.has(`tool-${h.itemId === 'tool:03' ? 'mine' : 'bomb'}-0`)) continue;
      const node = this.model.nodes.get(h.carrier ? this.model.gameState!.players.find(p => p.id === h.carrier)!.node : h.node)!;
      graphics.circle(node.x, node.y - (h.carrier ? 45 : 6), 10).fill(h.itemId === 'tool:03' ? '#b94b42' : '#342b46').stroke({ color: '#ffe183', width: 2 });
    }
    for (const id of state.roadTools?.blocks ?? []) {
      if (this.textures.has('tool-block-0')) continue;
      const node = this.model.nodes.get(id)!;
      graphics.rect(node.x - 13, node.y - 13, 26, 12).fill('#f8d36b').stroke({ color: '#672d24', width: 2 });
      for (const dx of [-8, 0, 8]) graphics.moveTo(node.x + dx - 3, node.y - 12).lineTo(node.x + dx + 3, node.y - 2).stroke({ color: '#c94631', width: 3 });
      graphics.moveTo(node.x - 9, node.y - 1).lineTo(node.x - 11, node.y + 6).moveTo(node.x + 9, node.y - 1).lineTo(node.x + 11, node.y + 6).stroke({ color: '#fff2c9', width: 3 });
    }
  }

  private renderRoadToolSprites(state: SessionSnapshot) {
    const poses = roadToolPoses(state, this.model.nodes).filter(p => this.textures.has(p.key));
    const live = new Set(poses.map(p => p.id));
    for (const [id, sprite] of this.toolSprites) if (!live.has(id)) {
      this.spriteFrames.delete(sprite); sprite.destroy(); this.toolSprites.delete(id);
    }
    for (const pose of poses) {
      let sprite = this.toolSprites.get(pose.id);
      if (!sprite) { sprite = new Sprite(); sprite.eventMode = 'none'; this.toolSprites.set(pose.id, sprite); this.objects.addChild(sprite); }
      const frame = this.manifest.sprites[pose.key];
      sprite.texture = this.textures.get(pose.key)!;
      sprite.anchor.set(frame.anchorX / frame.width, frame.anchorY / frame.height);
      sprite.position.set(pose.x, pose.y); sprite.zIndex = pose.z;
      this.spriteFrames.set(sprite, frame);
    }
  }

  previewRoad(id: number) {
    const node = this.model.nodes.get(id);
    if (!node || this.model.state.paused || (!this.model.state.g7Choices?.['tool:13']?.some(o => o.target.id === String(id)) && !this.model.state.g7Choices?.['tool:11']?.some(o => o.destinations?.some(d => d.target.kind === 'node' && d.target.id === String(id))) && !this.model.state.roadTargets?.includes(id) && !Object.values(this.model.state.g5Choices ?? {}).flat().some(o => o.target.kind === 'node' && o.target.id === String(id)))) return;
    this.follow = false; this.center = { x: node.x, y: node.y }; this.camera();
    this.propertyPreview.clear().circle(node.x, node.y, 22).stroke({ color: '#ffe183', width: 3 });
  }

  private drawPaths() {
    const segments = roadSegments(this.manifest.map.nodes);
    // A permanent route layer also connects the gaps in the original ground bitmap.
    for (const { from, to } of segments) this.paths.moveTo(from.x, from.y).lineTo(to.x, to.y);
    this.paths.stroke({ color: '#283039', width: 6, alpha: 0.85 });
    for (const { from, to } of segments) this.paths.moveTo(from.x, from.y).lineTo(to.x, to.y);
    this.paths.stroke({ color: '#ead8a0', width: 2, alpha: 0.8 });
    for (const node of this.manifest.map.nodes) {
      const special = node.kind >= 6000;
      this.paths.circle(node.x, node.y, special ? 8 : 3).fill({ color: special ? '#66533a' : '#ead8a0', alpha: 0.9 });
      if (special) this.paths.stroke({ color: '#fff1bb', width: 2 });
      this.pathDebug.circle(node.x, node.y, 12).stroke({ color: '#76e4ed', width: 2 });
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
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, decisionId: this.model.state.effects?.pending?.id ?? null };
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
    const state = this.model.state;
    const point = pointerToWorld({ x: event.clientX, y: event.clientY }, this.app.canvas.getBoundingClientRect(),
      this.app.screen, { x: this.world.x, y: this.world.y, zoom: this.zoom });
    if (!this.drag.moved && this.app.canvas.hasPointerCapture(event.pointerId) && !state.paused && !state.computer?.automatic && point) {
      if (state.phase === 'choosing') {
        const id = state.choices.find((choice) => {
          const node = this.model.nodes.get(choice)!;
          return Math.hypot(node.x - point.x, node.y - point.y) < 24;
        });
        if (id !== undefined) this.model.choose(id);
      } else if (state.phase === 'effect' && state.effects?.pending?.definitionId === NEARBY_WORKER_EFFECT && state.effects.pending.id === this.drag.decisionId && this.mask) {
        this.objects.sortChildren();
        const layers: PickLayer[] = [];
        for (const child of this.objects.children) {
          if (!child.visible || child.alpha <= 0) continue;
          const target = this.pickTargets.get(child) ?? null;
          if (child instanceof Sprite) {
            const frame = this.spriteFrames.get(child);
            if (frame) layers.push({ kind: 'sprite', target, x: child.x, y: child.y, frame });
          } else if (target) layers.push({ kind: 'land', target, x: child.x, y: child.y,
            shape: propertyAppearance(PROPERTY_CATALOG.properties.find(property => property.id === target)!, this.manifest) });
          // Labels, rings and debug paths are UI annotations, not game-object occluders.
        }
        const id = pickMapTarget(point, layers, this.mask, state.workerTargets ?? []);
        if (id) {
          this.highlightProperty(id);
          this.callbacks.propertySelected?.(id, state.effects.pending.id);
        } else this.callbacks.propertyMissed?.(state.effects.pending.id);
      }
    }
    this.pointerCancel();
  };
  private pointerCancel = () => {
    const drag = this.drag;
    this.drag = null;
    if (drag && this.app.canvas.hasPointerCapture(drag.id)) this.app.canvas.releasePointerCapture(drag.id);
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
  private highlightProperty(id: string) {
    const definition = propertyAppearance(PROPERTY_CATALOG.properties.find(p => p.id === id)!, this.manifest);
    this.propertyPreview.clear().poly(propertyOutline(definition).map((value, i) => value + (i % 2 === 0 ? definition.x : definition.y)))
      .stroke({ color: '#ffce67', width: 4 });
  }
  previewProperty(id: string) {
    const state = this.model.state;
    const teleportTarget = this.model.state.g7Choices?.['tool:11']?.some(o => (o.target.kind === 'property' && o.target.id === id) || o.destinations?.some(d => d.target.kind === 'property' && d.target.id === id));
    const cardTarget = teleportTarget || Object.values({ ...state.g4Choices, ...state.g5Choices }).flat().some(o => o.target.kind === 'property' && o.target.id === id);
    if (state.paused || state.phase !== 'effect' || (!state.workerTargets?.includes(id) && !cardTarget)) return;
    const definition = PROPERTY_CATALOG.properties.find(p => p.id === id)!;
    this.follow = false;
    this.center = { x: definition.x, y: definition.y - 35 };
    this.zoom = 1.2;
    this.highlightProperty(id);
    this.camera();
    this.reportStats(Math.round(this.app.ticker.FPS));
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
  setDebug(value: boolean) { this.debug = value; this.pathDebug.visible = this.debug; }
  select(index: number) { this.model.select(index); this.focus(); }
  reset() { this.model.reset(); this.followPlayer(); }
  junction() { this.model.visitJunction(); this.followPlayer(); }
  roll() {
    this.model.roll();
    this.focus();
  }
  destroy() {
    if (this.disposed) return;
    this.disposed = true;
    this.model.dispose();
    this.pointerCancel();
    this.observer.disconnect();
    this.listeners.forEach((off) => off());
    this.app.stop();
    this.app.ticker.remove(this.tick);
    this.app.destroy(true, { children: true, texture: false, textureSource: false });
    this.textures.forEach((texture) => texture.destroy(false));
    this.roots.forEach((texture) => texture.destroy(true));
    this.images.forEach((image) => image.close());
    this.godSprites.clear(); this.toolSprites.clear(); this.mask = null; this.spriteFrames.clear(); this.pickTargets.clear();
  }
}
