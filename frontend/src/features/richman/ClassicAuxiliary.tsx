import { useMemo } from 'react';
import type { Manifest } from './types';
import type { SessionSnapshot } from './game/session';
import type { SceneStats } from './scene';
import { calendarMonth } from './classic-presentation';
import { calendarClosed } from './game/calendar-date';
import { PROPERTY_CATALOG } from './game/economy';

export type AuxiliaryView = 'calendar' | 'map';
export function ClassicAuxiliary({ manifest, snapshot, view, onView, camera, onPan }: {
  manifest: Manifest | null; snapshot: SessionSnapshot | null; view: AuxiliaryView; onView: (view: AuxiliaryView) => void;
  camera?: SceneStats['camera']; onPan: (x: number, y: number) => void;
}) {
  const date = snapshot?.calendar?.date, month = date ? calendarMonth(date) : null;
  const roads = useMemo(() => {
    if (!manifest) return '';
    const nodes = new Map(manifest.map.nodes.map(n => [n.id, n]));
    const seen = new Set<string>();
    return manifest.map.nodes.flatMap(n => n.adjacent.flatMap(id => {
      const key = [n.id, id].sort((a, b) => a - b).join(':'), other = nodes.get(id);
      if (!other || seen.has(key)) return [];
      seen.add(key);
      return [`M${n.x} ${n.y}L${other.x} ${other.y}`];
    })).join('');
  }, [manifest]);
  return <section className="rm-classic-auxiliary" aria-label="日期与小地图">
    <img className="rm-classic-background" src={`/richman/generated/ui/Panel-2/00${(month?.season ?? 0) + (date && view === 'calendar' ? 4 : 0)}.png`} alt="" draggable={false} />
    {view === 'calendar' ? <div className="rm-classic-calendar" aria-label="游戏日历">
      {date && month ? <>
        <time dateTime={date}>{date}</time>
        <div className="rm-calendar-days" aria-label={`${date.slice(0, 7)} 月历`}>
          {Array.from({ length: month.days }, (_, i) => {
            const day = i + 1, full = `${date.slice(0, 7)}-${String(day).padStart(2, '0')}`;
            return <span key={day} style={i === 0 ? { gridColumnStart: month.first + 1 } : undefined} aria-current={day === month.today ? 'date' : undefined} title={`${full} ${calendarClosed(full) || '交易日'}`} className={calendarClosed(full) ? 'is-closed' : ''}>{day}</span>;
          })}
        </div>
      </> : <p className="rm-calendar-empty">当前模式未启用日期<br />第 {snapshot?.round ?? 1} 轮 · 第 {snapshot?.turn ?? 1} 回合</p>}
    </div> : manifest && snapshot ? <div className="rm-minimap-content">
      <svg className="rm-classic-minimap" role="button" tabIndex={0} aria-label="小地图定位（点击或方向键移动视角）" viewBox={`0 0 ${manifest.map.width} ${manifest.map.height}`}
        style={{ aspectRatio: `${manifest.map.width} / ${manifest.map.height}` }}
        onPointerDown={event => {
          if (event.button !== 0) return;
          event.preventDefault(); event.currentTarget.focus();
          const rect = event.currentTarget.getBoundingClientRect();
          onPan((event.clientX - rect.left) / rect.width * manifest.map.width, (event.clientY - rect.top) / rect.height * manifest.map.height);
        }}
        onKeyDown={event => {
          const delta: Record<string, [number, number]> = { ArrowLeft: [-120, 0], ArrowRight: [120, 0], ArrowUp: [0, -120], ArrowDown: [0, 120] };
          const d = delta[event.key];
          if (d) { event.preventDefault(); onPan((camera?.x ?? manifest.map.width / 2) + d[0], (camera?.y ?? manifest.map.height / 2) + d[1]); }
        }}>
        <image href="/richman/generated/japan.webp" width={manifest.map.width} height={manifest.map.height} />
        <path d={roads} fill="none" stroke="#e5cf9b" strokeWidth={13} />
        {snapshot.economy?.properties.filter(p => p.ownerId).map(p => {
          const d = PROPERTY_CATALOG.properties.find(d => d.id === p.id), index = snapshot.participants[Number(p.ownerId!.split('-')[1]) - 1];
          return d && <rect key={p.id} x={d.x - 13} y={d.y - 13} width={26} height={26} fill={manifest.characters[index]?.color ?? '#fff'} />;
        })}
        {snapshot.participants.filter(index => !snapshot.eliminated.includes(index) && !snapshot.g2?.players[`player-${snapshot.participants.indexOf(index) + 1}`]?.travel).map(index => <circle key={index} cx={snapshot.actors[index].x} cy={snapshot.actors[index].y} r={index === snapshot.active ? 35 : 24} fill={manifest.characters[index].color} stroke="#fff" strokeWidth={8} />)}
        {camera && <rect data-testid="minimap-camera" x={camera.x - camera.width / 2} y={camera.y - camera.height / 2} width={camera.width} height={camera.height} fill="none" stroke="#fff" strokeWidth={12} />}
      </svg>
      <small>点击定位 · 方向键浏览</small>
    </div> : <p className="rm-calendar-empty">地图准备中</p>}
    <div className="rm-auxiliary-tabs" role="group" aria-label="辅助视图">
      <button aria-pressed={view === 'calendar'} onClick={() => onView('calendar')}>日历</button>
      <button aria-pressed={view === 'map'} onClick={() => onView('map')}>小地图</button>
    </div>
  </section>;
}
