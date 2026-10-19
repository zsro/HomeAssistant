import { useRef, useState } from 'react';
import type { SessionSnapshot } from './game/session';
import { turnControls } from './classic-presentation';
import art from './classic-ui-art.json';

const source = (n: number) => `/richman/generated/ui/Panel-7/${String(n).padStart(3, '0')}.png`;
const clip = (mask: '2' | '3') => ({ clipPath: `path('${art.go.maskPaths[mask]}')` });
export function ClassicGo({ snapshot, ready, onGo, onDiceCount }: {
  snapshot: SessionSnapshot | null; ready: boolean; onGo: () => void; onDiceCount: (count: number) => void;
}) {
  const [position, setPosition] = useState({ x: art.go.initialRect[0], y: art.go.initialRect[1] });
  const drag = useRef<{ pointer: number; x: number; y: number; left: number; top: number; scale: number } | null>(null);
  const controls = turnControls(snapshot, ready);
  const move = (x: number, y: number) => setPosition({ x: Math.max(0, Math.min(368, x)), y: Math.max(40, Math.min(413, y)) });
  // Keep every map target reachable while a decision or movement is in progress.
  if (!snapshot || !['idle', 'rolling', 'turnEnd'].includes(snapshot.phase)) return null;
  return <div className="rm-classic-go" aria-label="GO 与骰数" style={{ left: position.x, top: position.y }}>
    <img className="rm-go-art" src={source(controls.frame)} alt="" draggable={false} />
    <img className={`rm-go-art rm-go-flash${controls.go ? ' is-ready' : ''}`} src={source(controls.frame + 1)} alt="" draggable={false} />
    <button className="rm-go-drag" style={clip('2')} aria-label="移动 GO 控件（方向键移动）" title="拖动，或用方向键移动 GO"
      onPointerDown={event => {
        if (event.button !== 0) return;
        const plane = event.currentTarget.closest('.rm-classic-map-plane');
        const stage = plane ?? event.currentTarget.closest('.rm-classic-stage')!;
        drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: position.x, top: position.y, scale: stage.getBoundingClientRect().width / (plane ? 440 : 640) };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const d = drag.current;
        if (d && d.pointer === event.pointerId) move(d.left + (event.clientX - d.x) / d.scale, d.top + (event.clientY - d.y) / d.scale);
      }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={event => {
        const delta: Record<string, [number, number]> = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -8], ArrowDown: [0, 8] };
        if (delta[event.key]) { event.preventDefault(); move(position.x + delta[event.key][0], position.y + delta[event.key][1]); }
      }} />
    <button className="rm-go-start" style={clip('3')} disabled={!controls.go} onClick={onGo}
      aria-label={snapshot.phase === 'turnEnd' ? 'GO：下一位' : controls.frame === 2 ? 'GO：结束停留' : controls.frame === 4 ? 'GO：乌龟前进' : 'GO：掷骰出发'}
      title={snapshot.phase === 'turnEnd' ? '下一位' : '出发'} />
    <div className="rm-go-counts" role="group" aria-label="投骰数量">
      {Array.from({ length: controls.maximum }, (_, i) => <button key={i} disabled={!controls.select} aria-label={`使用 ${i + 1} 颗骰子`} aria-pressed={controls.count === i + 1}
        style={{ left: 7, top: controls.maximum === 1 ? 26 : controls.maximum === 2 ? 16 + i * 19 : 9 + i * 16 }}
        onClick={() => onDiceCount(i + 1)}><img src={source(6 + i * 2 + (i < controls.count && controls.frame !== 2 ? 1 : 0))} alt="" draggable={false} /></button>)}
    </div>
  </div>;
}
