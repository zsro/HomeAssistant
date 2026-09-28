import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ASSET_ROOT, createScene } from '../features/richman/scene';
import type { RichmanScene, SceneStats } from '../features/richman/scene';
import type { Manifest, Snapshot } from '../features/richman/types';
import '../features/richman/richman.css';

const DICE = ['·', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const PHASES = { idle: '等待掷骰', rolling: '掷骰中', moving: '前进中', choosing: '选择岔路' };

export function RichmanPage() {
  const game = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fullscreen = nativeFullscreen || expanded;
  const scene = useRef<RichmanScene | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [progress, setProgress] = useState('正在准备旅程…');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [debug, setDebug] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const pausedBeforeDialog = useRef(false);

  useEffect(() => {
    const changed = () => setNativeFullscreen(document.fullscreenElement === game.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !resetDialog.current?.open) setExpanded(false);
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', escape);
    };
  }, [expanded]);

  const toggleFullscreen = async () => {
    if (expanded) { setExpanded(false); return; }
    try {
      if (document.fullscreenElement === game.current) await document.exitFullscreen();
      else if (document.fullscreenEnabled && game.current?.requestFullscreen) await game.current.requestFullscreen();
      else setExpanded(true);
    } catch {
      // Browsers without element fullscreen still get an expanded, playable layout.
      if (!document.fullscreenElement) setExpanded(true);
    }
  };

  useEffect(() => {
    if (!host.current) return;
    const controller = new AbortController();
    let owned: RichmanScene | null = null;
    const failed = (message: string) => {
      if (controller.signal.aborted) return;
      owned?.destroy();
      scene.current = null;
      setReady(false);
      setError(message);
    };
    void createScene(host.current, controller.signal, {
      state: (value) => { if (!controller.signal.aborted) setSnapshot(value); },
      stats: (value) => { if (!controller.signal.aborted) setStats(value); },
      progress: (value) => { if (!controller.signal.aborted) setProgress(value); },
      error: failed,
    }).then((created) => {
      if (controller.signal.aborted) { created.destroy(); return; }
      owned = created;
      scene.current = created;
      setManifest(created.manifest);
      setReady(true);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) failed(cause instanceof Error ? cause.message : '画面加载失败，请重试。');
    });
    return () => {
      controller.abort();
      owned?.destroy();
      if (scene.current === owned) scene.current = null;
    };
  }, [attempt]);

  const idle = ready && snapshot?.phase === 'idle' && !snapshot.paused;
  const active = manifest && snapshot ? manifest.characters[snapshot.active] : null;
  const actor = snapshot?.actors[snapshot.active];
  const node = manifest?.map.nodes.find((item) => item.id === actor?.node);
  const paused = snapshot?.paused ?? false;
  const retry = () => {
    setError(''); setReady(false); setSnapshot(null); setStats(null); setDebug(false);
    setAttempt((value) => value + 1);
  };
  const reset = () => {
    scene.current?.reset();
    resetDialog.current?.close();
  };

  const openReset = () => {
    pausedBeforeDialog.current = paused;
    scene.current?.model.pause(true);
    resetDialog.current?.showModal();
  };
  const cancelReset = () => {
    resetDialog.current?.close();
    scene.current?.model.pause(pausedBeforeDialog.current);
  };

  return (
    <main ref={game} className={`rm-page${fullscreen ? ' is-fullscreen' : ''}${expanded ? ' is-expanded' : ''}`}>
      <header className="rm-header">
        <Link to="/" className="rm-back"><span aria-hidden="true">←</span> 模块集合</Link>
        <div className="rm-brand"><span className="rm-brand-dice" aria-hidden="true">⚄</span><strong>大富翁<span>RICHMAN</span></strong></div>
        <span className="rm-version">技术体验版 <i /></span>
      </header>

      <div className="rm-content">
        <div className="rm-heading">
          <div><p className="rm-eyebrow">A LITTLE JOURNEY, A BIG WORLD</p><h1>下一站，日本。</h1><p>和熟悉的老朋友，重新踏上这段旅程。</p></div>
          <div className="rm-map-tag"><span aria-hidden="true">◈</span><div><strong>日本地图</strong><span>四人手动体验 · 原版素材</span></div></div>
        </div>

        <div className="rm-game-toolbar">
          <span>{fullscreen ? '日本地图 · 按 Esc 或点击按钮退出全屏' : '日本地图 · 自由探索'}</span>
          <button className="rm-button rm-button-light" aria-pressed={fullscreen} onClick={() => void toggleFullscreen()}>
            <span aria-hidden="true">{fullscreen ? '↙' : '⛶'}</span> {fullscreen ? '退出全屏' : '全屏游戏'}
          </button>
        </div>
        <div className="rm-layout">
          <section className="rm-board" aria-label="游戏地图">
            <div className="rm-map-top"><span><i /> {ready ? (paused ? '旅程已暂停' : '旅程进行中') : '准备出发'}</span><span>JAPAN · 01</span></div>
            <div className="rm-viewport" ref={host} data-testid="richman-viewport" data-phase={snapshot?.phase ?? 'loading'}>
              {!ready && <div className="rm-loading" role={error ? 'alert' : 'status'}>
                <span className="rm-loading-icon" aria-hidden="true">⚄</span>
                <strong>{error ? '暂时无法展开地图' : '旅程即将开始'}</strong>
                <p>{error || progress}</p>
                {error && <button className="rm-button" onClick={retry}>重新加载</button>}
              </div>}
              {ready && <>
                <div className="rm-map-label"><span>日本 / JAPAN</span><strong>{node?.name === '道路' ? '沿途探索' : node?.name}</strong></div>
                <div className="rm-map-controls" aria-label="地图视角">
                  <button onClick={() => scene.current?.changeZoom(0.2)} aria-label="放大地图">＋</button>
                  <span>{stats?.zoom ?? 120}%</span>
                  <button onClick={() => scene.current?.changeZoom(-0.2)} aria-label="缩小地图">−</button>
                  <button onClick={() => scene.current?.followPlayer()} aria-label="跟随当前角色">◎</button>
                  <button onClick={() => scene.current?.overview()} aria-label="查看全图">▧</button>
                </div>
                <span className="rm-map-hint">拖动浏览 · 滚轮缩放</span>
                {paused && <div className="rm-pause-shade"><strong>休息一下</strong><button className="rm-button" onClick={() => scene.current?.model.pause(false)}>继续旅程</button></div>}
              </>}
            </div>
            <div className="rm-action-bar">
              <div className={`rm-die ${snapshot?.phase === 'rolling' ? 'is-rolling' : ''}`} aria-label={`骰子点数 ${snapshot?.dice || '尚未掷骰'}`}>{DICE[snapshot?.dice ?? 0]}</div>
              <div className="rm-turn-copy"><small>{paused ? '已暂停' : snapshot ? PHASES[snapshot.phase] : '加载中'}</small><strong>{active ? `${active.name}的旅程` : '准备好，就出发'}</strong><span>{snapshot?.phase === 'moving' || snapshot?.phase === 'choosing' ? `剩余 ${snapshot.remaining} 步` : '掷骰前进，看看下一站在哪里'}</span></div>
              <button className="rm-roll" disabled={!idle} onClick={() => scene.current?.roll()}><span aria-hidden="true">⚄</span> 掷骰出发 <span aria-hidden="true">→</span></button>
            </div>
          </section>

          <aside className="rm-sidebar">
            <section className="rm-travelers"><div className="rm-section-title"><h2>同行的伙伴</h2><span>04</span></div><p>点击角色，切换你的旅伴</p>
              <div className="rm-character-list">
                {manifest?.characters.map((character, index) => <button
                  key={character.id} className={`rm-character ${snapshot?.active === index ? 'is-active' : ''}`}
                  aria-pressed={snapshot?.active === index} aria-label={`选择${character.name}`} disabled={!idle}
                  onClick={() => scene.current?.select(index)}>
                  <span className="rm-avatar" style={{ backgroundColor: `${character.color}18` }}><img src={`${ASSET_ROOT}${character.id}.webp`} alt="" /></span>
                  <span className="rm-character-copy"><strong>{character.name}</strong><small>{snapshot?.active === index ? '当前角色' : '等待出发'}</small></span>
                  <span className="rm-character-dot" style={{ background: character.color }} />
                </button>)}
                {!manifest && <div className="rm-character-placeholder">正在邀请四位老朋友…</div>}
              </div>
            </section>
            <section className="rm-journey"><div className="rm-section-title"><h2>旅途记录</h2><span aria-hidden="true">↗</span></div>
              <p className="rm-message" role="status" aria-live="polite">{snapshot?.message ?? '地图和伙伴就位后，即可开始。'}</p>
              {snapshot?.phase === 'choosing' && <div className="rm-branches" role="group" aria-label="选择岔路">
                {snapshot.choices.map((id, index) => <button key={id} disabled={paused} onClick={() => scene.current?.model.choose(id)}>
                  <span>路线 {index + 1}</span><strong>{manifest?.map.nodes.find((item) => item.id === id)?.name} · {id}号</strong><span aria-hidden="true">→</span>
                </button>)}
              </div>}
              <div className="rm-progress"><span>已完成移动<strong>{String(snapshot?.completed ?? 0).padStart(2, '0')}</strong></span><span>当前路格<strong>{String(actor?.node ?? 0).padStart(2, '0')}</strong></span></div>
            </section>
            <div className="rm-secondary-actions"><button disabled={!ready} onClick={() => scene.current?.model.pause(!paused)}>{paused ? '继续' : '暂停'}</button><button disabled={!ready} onClick={openReset}>重新开始</button></div>
            <p className="rm-scope">本版体验地图、角色动画与掷骰移动。买地、收租和胜负结算将在后续加入。</p>
          </aside>
        </div>

        <details className="rm-diagnostics"><summary>运行信息与验证工具 <span>{ready ? `${stats?.fps ?? '—'} FPS · ${stats?.sprites ?? 0} 个精灵帧` : '资源准备中'}</span></summary>
          <div className="rm-diagnostic-body"><p>WebGL · 地图 2304 × 2304 · 110 个道路节点 · 首次场景加载 {stats?.loadMs ?? '—'} ms。建筑用于锚点和遮挡验证，尚不表示地产归属。</p>
            <label><input type="checkbox" checked={debug} disabled={!ready} onChange={(event) => { setDebug(event.target.checked); scene.current?.setDebug(event.target.checked); }} /> 显示道路连线</label>
            <button className="rm-button rm-button-light" disabled={!idle} onClick={() => scene.current?.junction()}>定位岔路验证</button>
          </div>
        </details>
      </div>
      <dialog ref={resetDialog} className="rm-dialog" aria-labelledby="rm-reset-heading" onCancel={(event) => { event.preventDefault(); cancelReset(); }}><h2 id="rm-reset-heading">重新开始这段旅程？</h2><p>四位角色将返回起点，移动记录会清零。</p><div><button className="rm-button rm-button-light" autoFocus onClick={cancelReset}>继续当前旅程</button><button className="rm-button" onClick={reset}>确认重新开始</button></div></dialog>
    </main>
  );
}
