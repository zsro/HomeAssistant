import { useEffect, useRef, useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import type { Manifest } from './types';
import type { SessionSnapshot } from './game/session';
import { turnControls } from './classic-presentation';
import { ClassicToolbar } from './ClassicToolbar';
import { ClassicPlayerPanel } from './ClassicPlayerPanel';
import { ClassicGo } from './ClassicGo';
import { ClassicAuxiliary } from './ClassicAuxiliary';
import type { AuxiliaryView } from './ClassicAuxiliary';
import type { SceneStats } from './scene';
import './classic-ui.css';

/** All four regions share a single transform. Pixi keeps a 440x440 logical viewport. */
export function ClassicGameShell({ children, manifest, snapshot, onOpen, ready, onGo, onDiceCount, auxiliaryView, onAuxiliaryView, camera, onPan }: {
  children: ReactNode; manifest: Manifest | null; snapshot: SessionSnapshot | null;
  onOpen: (id: string, label: string) => void;
  ready: boolean; onGo: () => void; onDiceCount: (count: number) => void;
  auxiliaryView: AuxiliaryView; onAuxiliaryView: (view: AuxiliaryView) => void;
  camera?: SceneStats['camera']; onPan: (x: number, y: number) => void;
}) {
  const fit = useRef<HTMLDivElement>(null);
  const [{scale,compact,wide,mapScale}, setLayout] = useState({scale:1,compact:false,wide:false,mapScale:1});
  useEffect(() => {
    const element = fit.current;
    if (!element) return;
    const page = element.closest('.rm-classic-page');
    const chrome = ['.rm-classic-sitebar', '.rm-game-toolbar', '.rm-cloud-status', '.rm-action-bar', '.rm-decision-nav', '.rm-window-launcher']
      .map(selector => page?.querySelector<HTMLElement>(selector)).filter((item): item is HTMLElement => !!item);
    const resize = () => {
      const reserved = chrome.reduce((sum, item) => {
        const css = getComputedStyle(item);
        return sum + item.getBoundingClientRect().height + parseFloat(css.marginTop) + parseFloat(css.marginBottom);
      }, 40);
      const compact = element.clientWidth < 640 || window.innerHeight < 600;
      const wide = compact && element.clientWidth >= 640;
      setLayout({compact,wide,scale:Math.min(element.clientWidth / 640, Math.max(200, window.innerHeight - reserved) / 480, 2),
        mapScale:Math.min((element.clientWidth - (wide ? 252 : 0)) / 440, 1.5)});
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    chrome.forEach(item => observer.observe(item));
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  const controls = turnControls(snapshot,ready);
  return <div className="rm-classic-fit" ref={fit}>
    <div className={`rm-classic-frame${compact ? ' is-compact' : ''}${wide ? ' is-wide' : ''}`} style={compact ? undefined : { width: 640 * scale, height: 480 * scale }}>
      <div className="rm-classic-stage" data-testid="classic-stage" style={compact ? undefined : { transform: `scale(${scale})` }}>
        <ClassicToolbar onOpen={onOpen} />
        <div className="rm-classic-map-slot" style={compact ? {height:440*mapScale} : undefined}><div className="rm-classic-map-plane" style={compact ? {transform:`scale(${mapScale})`, '--rm-map-touch-size':`${44/mapScale}px`} as CSSProperties : undefined}>
          <div className="rm-classic-map" data-testid="classic-map">{children}</div>
          <ClassicGo snapshot={snapshot} ready={ready} onGo={onGo} onDiceCount={onDiceCount} />
        </div></div>
        <div className="rm-compact-dice" role="group" aria-label="触屏投骰数量">{Array.from({length:controls.maximum},(_,i)=><button key={i} type="button" disabled={!controls.select} aria-pressed={controls.count===i+1} onClick={()=>onDiceCount(i+1)}>{i+1} 颗骰子</button>)}</div>
        <ClassicPlayerPanel manifest={manifest} snapshot={snapshot} />
        <ClassicAuxiliary manifest={manifest} snapshot={snapshot} view={auxiliaryView} onView={onAuxiliaryView} camera={camera} onPan={onPan} />
      </div>
    </div>
  </div>;
}
