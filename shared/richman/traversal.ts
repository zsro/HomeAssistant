import type { Actor, Manifest, MapNode, Snapshot } from './types';

export function exits(node: MapNode, previous: number | null): number[] {
  const onward = [...new Set(node.adjacent)].filter((id) => id !== previous);
  return onward.length ? onward : [...new Set(node.adjacent)];
}

// Original sprite groups run counterclockwise on screen: N=3, E=1, S=7, W=5.
export function directionFor(dx: number, dy: number): number {
  return (Math.round(Math.atan2(-dx, -dy) / (Math.PI / 4)) + 11) % 8;
}

export class Traversal {
  readonly nodes: Map<number, MapNode>;
  state: Snapshot;
  private elapsed = 0;
  private segment: { from: MapNode; to: MapNode; duration: number } | null = null;
  onChange: (state: Snapshot) => void = () => undefined;

  constructor(readonly manifest: Manifest) {
    this.nodes = new Map(manifest.map.nodes.map((node) => [node.id, node]));
    if (!this.nodes.size || manifest.characters.length !== 4) throw new Error('地图或角色数据不完整');
    for (const node of this.nodes.values()) {
      if (!node.adjacent.length || node.adjacent.some((id) => !this.nodes.has(id))) throw new Error('地图道路连接无效');
    }
    this.state = this.initial();
  }

  private initial(): Snapshot {
    const start = this.manifest.map.nodes.slice(0, 4);
    return {
      active: 0, actors: this.manifest.characters.map((_, i): Actor => ({
        node: start[i].id, previous: null, x: start[i].x, y: start[i].y, direction: 4,
      })),
      phase: 'idle', paused: false, dice: 0, remaining: 0, choices: [], completed: 0,
      message: '选择一位角色，掷骰开启日本之旅。',
    };
  }

  snapshot(): Snapshot {
    return { ...this.state, choices: [...this.state.choices], actors: this.state.actors.map((actor) => ({ ...actor })) };
  }

  private publish() { this.onChange(this.snapshot()); }
  get actor() { return this.state.actors[this.state.active]; }
  get node() { return this.nodes.get(this.actor.node)!; }

  roll(value: number) {
    if (this.state.phase !== 'idle' || this.state.paused || !Number.isInteger(value) || value < 1 || value > 6) return;
    this.elapsed = 0;
    this.state = { ...this.state, phase: 'rolling', dice: value, remaining: value, choices: [], message: '骰子转动中…' };
    this.publish();
  }

  select(index: number) {
    if (this.state.phase !== 'idle' || this.state.paused || !this.state.actors[index]) return;
    this.state.active = index;
    this.state.message = `轮到${this.manifest.characters[index].name}，可以掷骰了。`;
    this.publish();
  }

  pause(value: boolean) { this.state.paused = value; this.publish(); }

  reset() {
    this.segment = null;
    this.elapsed = 0;
    this.state = this.initial();
    this.publish();
  }

  // A reproducible branch fixture for the technical validation; not a gameplay teleport.
  visitJunction() {
    if (this.state.phase !== 'idle' || this.state.paused) return;
    const junction = this.manifest.map.nodes.find((node) => node.adjacent.length > 2);
    if (!junction) return;
    Object.assign(this.actor, { node: junction.id, previous: null, x: junction.x, y: junction.y });
    this.state.message = '已定位到岔路。掷骰后可选择前进方向。';
    this.publish();
  }

  choose(id: number) {
    if (this.state.phase !== 'choosing' || this.state.paused || !this.state.choices.includes(id)) return;
    this.beginSegment(id);
  }

  private next() {
    if (this.state.remaining === 0) {
      this.state.phase = 'idle';
      this.state.choices = [];
      this.state.completed += 1;
      this.state.message = `${this.manifest.characters[this.state.active].name}已到达${this.node.name} · ${this.node.id}号路格。`;
      this.publish();
      return;
    }
    const choices = exits(this.node, this.actor.previous);
    if (choices.length > 1) {
      this.state.phase = 'choosing';
      this.state.choices = choices;
      this.state.message = `还有 ${this.state.remaining} 步，选择前进方向。`;
      this.publish();
    } else this.beginSegment(choices[0]);
  }

  private beginSegment(id: number) {
    const target = this.nodes.get(id)!;
    const from = this.node;
    this.segment = { from, to: target, duration: Math.max(240, Math.hypot(target.x - from.x, target.y - from.y) / 115 * 1000) };
    this.actor.direction = directionFor(target.x - from.x, target.y - from.y);
    this.elapsed = 0;
    this.state.phase = 'moving';
    this.state.choices = [];
    this.state.message = `${this.manifest.characters[this.state.active].name}前进中…`;
    this.publish();
  }

  tick(milliseconds: number) {
    if (this.state.paused || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
    // Resume from the background without skipping a turn or teleporting an actor.
    this.elapsed += Math.min(milliseconds, 50);
    if (this.state.phase === 'rolling') {
      if (this.elapsed >= 650) this.next();
    } else if (this.state.phase === 'moving' && this.segment) {
      const { from, to, duration } = this.segment;
      const progress = Math.min(this.elapsed / duration, 1);
      this.actor.x = from.x + (to.x - from.x) * progress;
      this.actor.y = from.y + (to.y - from.y) * progress;
      if (progress === 1) {
        this.actor.node = to.id;
        this.actor.previous = from.id;
        this.state.remaining -= 1;
        this.segment = null;
        this.elapsed = 0;
        this.next();
      }
    }
  }
}
