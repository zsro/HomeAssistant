import { ClassicTitleMenu } from '../features/richman/ClassicTitleMenu';
import { ClassicSetupForm } from '../features/richman/ClassicSetupForm';
import { ClassicPrompt, ClassicDecisionActions } from '../features/richman/ClassicDecisionArt';
import { hasCalendar, hasComputer, hasFunds } from '../features/richman/setup-options';
import { SurrenderPanel } from '../features/richman/SurrenderPanel';
import type { InventoryView } from '../features/richman/ClassicBusinessArt';
import { preventRepeatedClick, preventRepeatedKey } from '../features/richman/window-input';
import { GameWindowHost, WindowPanel } from '../features/richman/GameWindowHost';
import { ClassicGameShell } from '../features/richman/ClassicGameShell';
import { decisionSelector, navigateGame } from '../features/richman/decision-navigation';
import { ClassicDice } from '../features/richman/ClassicDice';
import type { AuxiliaryView } from '../features/richman/ClassicAuxiliary';
import { GameHelp } from '../features/richman/GameHelp';
import {AudioPanel} from '../features/richman/AudioPanel';
import {RichmanAudio, audioPreferences, AUDIO_STORAGE} from '../features/richman/audio';
import type {AudioStatus} from '../features/richman/audio';
import type {ComputerPolicy} from '../features/richman/game/computer';
import {ComputerPanel} from '../features/richman/ComputerPanel';
import {MinigamePanel} from '../features/richman/MinigamePanel';
import {FacilityPanel,ShopReportPanel} from '../features/richman/SiteServicesPanel';
import {MagicPanel,MagicNestedPanel} from '../features/richman/MagicPanel';
import {DisposalPanel} from '../features/richman/DisposalPanel';
import {EstateSalesPanel} from '../features/richman/EstateSalesPanel';
import {InsurancePanel} from '../features/richman/InsurancePanel';
import {CommercePanel} from '../features/richman/CommercePanel';
import {CompanyPanel} from '../features/richman/CompanyPanel';
import {DividendPanel} from '../features/richman/DividendPanel';
import {LotteryPanel} from '../features/richman/LotteryPanel';
import {CalendarPanel} from '../features/richman/CalendarPanel';
import { FortunePanel } from '../features/richman/FortunePanel';
import { NewsPanel } from '../features/richman/NewsPanel';
import { G6Panel } from '../features/richman/G6Panel';
import { ResearchPanel, G5Status } from '../features/richman/G5Panel';
import { AuctionPanel } from '../features/richman/G4Choice';
import { ReactionPanel } from '../features/richman/G3Choice';
import { maxDice, mobilityText, actionLocked } from '../features/richman/game/g2';
import type { WorkerSelection } from '../features/richman/NearbyWorkerChoice';
import { ItemPanel } from '../features/richman/ItemPanel';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ASSET_ROOT, createScene } from '../features/richman/scene';
import type { RichmanScene, SceneStats } from '../features/richman/scene';
import type { Manifest } from '../features/richman/types';
import type { SessionOptions, SessionSnapshot } from '../features/richman/game/session';
import '../features/richman/richman.css';
import { FinancePanel } from '../features/richman/FinancePanel';
import { PropertyPanel } from '../features/richman/PropertyPanel';
import { ECONOMY_RULES } from '../features/richman/game/economy';

const PHASES = { surrender: '认输后选人', minigame:'小游戏', facility:'设施探访', magic: '魔法屋', idle: '等待掷骰', rolling: '掷骰中', moving: '前进中', choosing: '选择岔路', property: '地产决策', bank: '银行存取款', debt: '债务处理', finished: '本局结束', turnEnd: '本回合结束', shop: '商店', effect: '道具选择', reaction: '反应决策', auction: '地产拍卖', news: '新闻事件', fortune: '命运事件', company: '公司营业', commerce: '公司服务', lottery: '彩票购买' };

type SystemScreen = 'title' | 'options' | 'help' | 'setup' | 'reset' | 'pause' | 'exit' | 'notice';
export function RichmanPage() {
  const navigate = useNavigate();
  const systemDialog = useRef<HTMLDialogElement>(null);
  const [systemScreen, setSystemScreen] = useState<SystemScreen | null>(null);
  const systemTrail = useRef<SystemScreen[]>([]);
  const initialMenu = useRef(false);
  const audio = useRef<RichmanAudio | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus | null>(null);
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
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [auxiliaryView, setAuxiliaryView] = useState<AuxiliaryView>('calendar');
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [debug, setDebug] = useState(false);
  const [notice, setNotice] = useState({ title: '', message: '' });
  const [workerMiss, setWorkerMiss] = useState<string | null>(null);
  const [workerSelection, setWorkerSelection] = useState<WorkerSelection | null>(null);
  const [surrenderConfirm, setSurrenderConfirm] = useState(false);
  const [setupMode, setSetupMode] = useState<SessionOptions['mode']>('surrender');
  const [setupIds, setSetupIds] = useState<string[]>([]);
  const [setupPolicy,setSetupPolicy]=useState<ComputerPolicy>('basic-v1');
  const [setupComputers,setSetupComputers]=useState<string[]>([]);
  const [setupFunds, setSetupFunds] = useState<number>(ECONOMY_RULES.initialFunds);
  const [setupDate, setSetupDate] = useState('1998-01-01');
  const [setupSeed, setSetupSeed] = useState('');
  const [setupError, setSetupError] = useState('');
  const pausedBeforeDialog = useRef(false);
  const [windowEpoch, setWindowEpoch] = useState(0);
  const commandEpoch = useRef(0);
  const systemModal = systemScreen !== null;
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
      if (event.key === 'Escape' && !event.defaultPrevented && !game.current?.querySelector('dialog[open]')) setExpanded(false);
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
    let saved: string | null = null;
    try { saved = localStorage.getItem(AUDIO_STORAGE); } catch { /* optional preference storage */ }
    const sound = new RichmanAudio(undefined, audioPreferences(saved));
    audio.current = sound;
    sound.onChange = value => {
      setAudioStatus(value);
      try { localStorage.setItem(AUDIO_STORAGE, JSON.stringify({muted:value.muted,music:value.music,effects:value.effects,voice:value.voice})); } catch { /* optional storage */ }
    };
    const visibility = () => sound.visibility(document.hidden);
    visibility(); document.addEventListener('visibilitychange', visibility);
    void fetch(ASSET_ROOT + 'audio/manifest.json', {signal:controller.signal})
      .then(response => { if (!response.ok) throw new Error('audio unavailable'); return response.json(); })
      .then(value => sound.configure(value)).catch(() => { if (!controller.signal.aborted) sound.unavailable(); });
    let owned: RichmanScene | null = null;
    const failed = (message: string) => {
      if (controller.signal.aborted) return;
      owned?.destroy();
      sound.dispose();
      scene.current = null;
      setReady(false);
      setError(message);
    };
    void createScene(host.current, controller.signal, {
      presentation: packet => sound.receive(packet),
      state: (value) => { if (!controller.signal.aborted) setSnapshot(value); },
      stats: (value) => { if (!controller.signal.aborted) setStats(value); },
      progress: (value) => { if (!controller.signal.aborted) setProgress(value); },
      error: failed,
      propertySelected: (propertyId, decisionId) => { if (!controller.signal.aborted) { setWorkerSelection({ propertyId, decisionId }); setWorkerMiss(null); } },
      propertyMissed: decisionId => { if (!controller.signal.aborted) setWorkerMiss(decisionId); },
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
      sound.dispose();
      document.removeEventListener('visibilitychange', visibility);
      if (audio.current === sound) audio.current = null;
      owned?.destroy();
      if (scene.current === owned) scene.current = null;
    };
  }, [attempt]);

  const computerBusy=!!snapshot?.computer?.automatic;
  const idle = ready && snapshot?.phase === 'idle' && !snapshot.paused&&!computerBusy;
  const active = manifest && snapshot ? manifest.characters[snapshot.active] : null;
  const actor = snapshot?.actors[snapshot.active];
  const node = manifest?.map.nodes.find((item) => item.id === actor?.node);
  const paused = snapshot?.paused ?? false;
  const retry = () => {
    setError(''); setReady(false); setSnapshot(null); setStats(null); setDebug(false);
    commandEpoch.current += 1; setWindowEpoch(commandEpoch.current);
    setAttempt((value) => value + 1);
  };
  const finishSystem = () => {
    systemTrail.current = []; systemDialog.current?.close(); setSystemScreen(null);
  };
  const closeSystem = () => {
    finishSystem(); scene.current?.model.pause(pausedBeforeDialog.current);
  };
  const backSystem = () => {
    const previous = systemTrail.current.pop();
    if (previous) setSystemScreen(previous); else closeSystem();
  };
  const openSystem = (screen: SystemScreen) => {
    if (systemScreen === screen) return;
    if (systemDialog.current?.open && systemScreen) systemTrail.current.push(systemScreen);
    else {
      systemTrail.current = [];
      pausedBeforeDialog.current = scene.current?.model.state.paused ?? false;
      scene.current?.model.pause(true);
    }
    setSystemScreen(screen); systemDialog.current?.showModal();
  };
  useEffect(() => {
    if (!ready || initialMenu.current) return;
    initialMenu.current = true;
    pausedBeforeDialog.current = scene.current?.model.state.paused ?? false;
    scene.current?.model.pause(true);
    setSystemScreen('title'); systemDialog.current?.showModal();
  }, [ready]);
  useEffect(() => {
    if (systemScreen) {
      systemDialog.current?.querySelector<HTMLElement>('#rm-system-heading')?.focus();
      systemDialog.current?.scrollTo?.(0,0);
    }
  }, [systemScreen]);
  const reset = () => {
    if (!systemDialog.current?.open || systemScreen !== 'reset') return;
    scene.current?.reset(); setWorkerSelection(null); setWorkerMiss(null); setSurrenderConfirm(false);
    commandEpoch.current += 1; setWindowEpoch(commandEpoch.current); finishSystem();
  };
  const openReset = () => { setSurrenderConfirm(false); openSystem('reset'); };
  const openSetup = () => {
    if (systemScreen === 'setup') return;
    setSurrenderConfirm(false);
    setSetupMode(snapshot?.mode ?? 'surrender');
    setSetupComputers(snapshot?.computer?.ids??[]); setSetupPolicy(snapshot?.computer?.policy??'basic-v1');
    setSetupFunds(scene.current?.model.exportReplay()?.config.initialFunds ?? ECONOMY_RULES.initialFunds);
    setSetupIds(manifest?.characters.filter((_, i) => snapshot?.participants.includes(i)).map(c => c.id) ?? []);
    setSetupDate(scene.current?.model.exportReplay()?.config.startDate??'1998-01-01');
    setSetupSeed(''); setSetupError(''); openSystem('setup');
  };
  const startGame = () => {
    if (!manifest || !scene.current || !systemDialog.current?.open || systemScreen !== 'setup') return;
    const characterIds = manifest.characters.filter(c => setupMode === 'sandbox' || setupIds.includes(c.id)).map(c => c.id);
    if (characterIds.length < 2) { setSetupError('请至少选择两位角色。'); return; }
    try {
      scene.current.model.start({mode:setupMode, characterIds,
        ...(hasComputer(setupMode) && setupComputers.some(id=>characterIds.includes(id)) ? {computerPolicy:setupPolicy,computerIds:setupComputers.filter(id=>characterIds.includes(id))} : {}),
        ...(hasFunds(setupMode) ? {initialFunds:setupFunds} : {}), ...(hasCalendar(setupMode) ? {startDate:setupDate} : {}),
        seed:setupSeed.trim() || crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8,'0')});
      scene.current.followPlayer(); setSurrenderConfirm(false); setWorkerSelection(null); setWorkerMiss(null);
      commandEpoch.current += 1; setWindowEpoch(commandEpoch.current); finishSystem();
    } catch(cause) { setSetupError(cause instanceof Error ? cause.message : '无法开始对局'); }
  };
  const togglePause = () => {
    if (paused) scene.current?.model.pause(false); else openSystem('pause');
  };
  const downloadReplay = () => {
    const replay = scene.current?.model.exportReplay();
    if (!replay) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'richman-replay.json';
    link.click(); URL.revokeObjectURL(url);
  };

  const [inventoryView, setInventoryView] = useState<InventoryView>('all');
  const openTool = (id: string, title: string) => {
    if (id === 'options' || id === 'help') { openSystem(id); return; }
    if (id === 'small-map') { setAuxiliaryView(view => view === 'map' ? 'calendar' : 'map'); return; }
    if (id === 'ai-settings' && ready) { openSetup(); return; }
    if (id === 'tools' || id === 'cards') setInventoryView(id);
    const targets: Record<string, string> = {
      help: '[data-richman-panel="help"]', options: '[data-richman-panel="settings"]', 'player-info': '[data-richman-panel="players"]',
      tools: '[data-richman-panel="items"]', cards: '[data-richman-panel="items"]', sale: '[data-richman-panel="sales"]', stock: '[data-richman-panel="stocks"]',
    };
    if (targets[id] && game.current && navigateGame(game.current, targets[id])) return;
    setNotice({ title, message: id === 'load' || id === 'save'
      ? '功能暂未接入。已保留原版入口，存读档业务暂时挂起。回放下载可在菜单或验证工具中使用。'
      : !ready ? '地图准备完成后即可使用此入口。'
      : '当前对局模式未启用此功能。入口已保留，可在新建对局中选择支持的模式。' });
    openSystem('notice');
  };

  return (
    <main ref={game} onClickCapture={preventRepeatedClick} onKeyDownCapture={preventRepeatedKey} className={`rm-page rm-classic-page${fullscreen ? ' is-fullscreen' : ''}${expanded ? ' is-expanded' : ''}`}>
      <header className="rm-classic-sitebar">
        <Link to="/" className="rm-back" onClick={event => { if (ready) { event.preventDefault(); openSystem('exit'); } }}><span aria-hidden="true">←</span> 模块集合</Link>
        <strong>大富翁 · 日本地图</strong>
        <span>本地轮流对局</span>
      </header>
      <div className="rm-content">
        <div className="rm-game-toolbar">
          <span>{fullscreen ? '按 Esc 或按钮退出全屏' : snapshot?.mode === 'sandbox' ? '自由验证 · 手动切换角色' : `第 ${snapshot?.round ?? 1} 轮 · 第 ${snapshot?.turn ?? 1} 回合`}</span>
          <div className="rm-toolbar-actions"><button className="rm-button rm-button-light" disabled={!ready} onClick={() => openSystem('title')}>主菜单</button>
          <button className="rm-button rm-button-light" disabled={!ready} onClick={openSetup}>新建对局</button>
          <button className="rm-button rm-button-light" aria-pressed={fullscreen} onClick={() => void toggleFullscreen()}>
            <span aria-hidden="true">{fullscreen ? '↙' : '⛶'}</span> {fullscreen ? '退出全屏' : '全屏游戏'}
          </button>
          </div>
        </div>
        <ClassicGameShell manifest={manifest} snapshot={snapshot} onOpen={openTool} ready={ready}
          auxiliaryView={auxiliaryView} onAuxiliaryView={setAuxiliaryView} camera={stats?.camera} onPan={(x, y) => scene.current?.panTo(x, y)}
          onDiceCount={count => scene.current?.model.traffic(count)}
          onGo={() => { if (scene.current?.model.state.phase === 'turnEnd') { scene.current.model.endTurn(); scene.current.followPlayer(); } else scene.current?.roll(); }}>
          <section className="rm-board" aria-label="游戏地图">
            <div className="rm-viewport" ref={host} data-testid="richman-viewport" data-revision={snapshot?.revision} data-turn={snapshot?.turn} data-phase={snapshot?.phase ?? 'loading'}>
              {!ready && <div className="rm-loading" role={error ? 'alert' : 'status'}>
                <span className="rm-loading-icon" aria-hidden="true">⚄</span>
                <strong>{error ? '暂时无法展开地图' : '旅程即将开始'}</strong>
                <p>{error || progress}</p>
                {error && <button className="rm-button" onClick={retry}>重新加载</button>}
              </div>}
              {ready && <>
                <div className="rm-map-label"><span>日本 / JAPAN</span><strong>{snapshot?.bankDecision ? '富士銀行' : node?.name === '道路' ? '沿途探索' : node?.name}</strong></div>
                <div className="rm-map-controls" aria-label="地图视角">
                  <button onClick={() => scene.current?.changeZoom(0.2)} aria-label="放大地图">＋</button>
                  <span>{stats?.zoom ?? 120}%</span>
                  <button onClick={() => scene.current?.changeZoom(-0.2)} aria-label="缩小地图">−</button>
                  <button onClick={() => scene.current?.followPlayer()} aria-label="跟随当前角色">◎</button>
                  <button onClick={() => scene.current?.overview()} aria-label="查看全图">▧</button>
                </div>
                <span className="rm-map-hint">拖动浏览 · 按钮或滚轮缩放</span>
                {workerMiss && workerMiss === snapshot?.effects?.pending?.id && <p className="rm-map-feedback" role="status">此处未选中可建造地块。已有选择保持，可点“当前操作”从列表选择。</p>}
                {paused && <div className="rm-pause-shade"><strong>休息一下</strong><button className="rm-button" onClick={() => scene.current?.model.pause(false)}>继续旅程</button></div>}
              </>}
            </div>
          </section>

        </ClassicGameShell>
            <div className="rm-action-bar">
              <ClassicDice snapshot={snapshot} />
              <div className="rm-turn-copy"><small>{paused ? '已暂停' : snapshot ? PHASES[snapshot.phase] : '加载中'}</small><strong>{snapshot?.phase === 'finished' ? '本局已结束' : active ? `${active.name}的旅程` : '准备好，就出发'}</strong><span>{snapshot?.phase === 'moving' || snapshot?.phase === 'choosing' ? `剩余 ${snapshot.remaining} 步` : snapshot && ['property', 'bank', 'debt', 'shop', 'effect', 'reaction', 'auction', 'news', 'fortune', 'company', 'commerce', 'lottery', 'facility', 'magic', 'surrender', 'minigame'].includes(snapshot.phase) ? '点“当前操作”前往决策面板' : snapshot?.phase === 'finished' ? '查看结果或开启新局' : '掷骰前进，看看下一站在哪里'}</span></div>
              {snapshot?.phase === 'turnEnd'
                ? <button className="rm-roll" disabled={paused || !ready||computerBusy} onClick={() => { scene.current?.model.endTurn(); scene.current?.followPlayer(); }}>下一位 <span aria-hidden="true">→</span></button>
                : snapshot?.phase === 'finished' ? <button className="rm-roll" onClick={openSetup}>再开一局</button>
                : <button className="rm-roll" disabled={!idle} onClick={() => scene.current?.roll()}><span aria-hidden="true">⚄</span> 掷骰出发 <span aria-hidden="true">→</span></button>}
            </div>
        <nav className="rm-decision-nav" aria-label="对局快捷导航">
          <span>{paused ? '已暂停' : computerBusy ? '电脑正在应答' : snapshot ? PHASES[snapshot.phase] : '加载中'}</span>
          <button disabled={!ready} onClick={() => { if (game.current) { navigateGame(game.current, '.rm-board'); } }}>回到地图</button>
          <button disabled={!ready} onClick={() => { if (game.current && snapshot) navigateGame(game.current, decisionSelector(snapshot)); }}>当前操作</button>
          <button disabled={!ready} onClick={() => { if (game.current) navigateGame(game.current, '.rm-help'); }}>操作帮助</button>
        </nav>
        <div className="rm-window-launcher">
          <button className="rm-button rm-button-light" onClick={() => { if (game.current) navigateGame(game.current, '[data-richman-panel="directory"]'); }}>更多功能</button>
          <button className="rm-button rm-button-light" disabled={!ready || snapshot?.phase === 'finished'} onClick={togglePause}>{paused ? '继续' : '暂停'}</button>
          <button className="rm-button rm-button-light" disabled={!ready} onClick={openReset}>重新开始</button>
        </div>
        <GameWindowHost root={game} snapshot={snapshot} epoch={windowEpoch} suspended={systemModal}
          isCurrent={() => snapshot?.revision === scene.current?.model.state.revision && windowEpoch === commandEpoch.current}
          onPause={togglePause} onNewGame={openSetup}>
          <WindowPanel id="settings"><section className="rm-options-content" aria-label="声音设置"><img className="rm-options-art" src="/richman/generated/ui/Data-3/000.png" alt=""/><div><AudioPanel audio={audio.current} status={audioStatus}/><button className="rm-button" onClick={()=>openSystem('options')}>显示与操作设置</button></div></section></WindowPanel>
          <aside className="rm-sidebar">
            <WindowPanel id="minigame">{snapshot?.minigame&&<MinigamePanel decision={snapshot.minigame} paused={paused||computerBusy} act={input=>scene.current?.model.minigame(snapshot.minigame!.id,input)?.ok??false}/>}</WindowPanel>
            <WindowPanel id="computer">{snapshot&&manifest&&<ComputerPanel snapshot={snapshot} manifest={manifest} retry={()=>scene.current?.model.retryComputer()}/>}</WindowPanel>
            <fieldset className="rm-controlled-actions" disabled={computerBusy} aria-label="当前决策操作">
            <WindowPanel id="items">{snapshot && <ItemPanel snapshot={snapshot} inventoryView={inventoryView} onInventoryView={setInventoryView}
              selection={workerSelection}
              select={(propertyId) => {
                const current = scene.current?.model.state;
                if (current?.paused || current?.computer?.automatic || !current?.effects?.pending || !current.workerTargets?.includes(propertyId)) return;
                setWorkerSelection({ propertyId, decisionId: current.effects.pending.id });
                setWorkerMiss(null);
                scene.current?.previewProperty(propertyId);
              }}
              preview={(id) => scene.current?.previewProperty(id)}
              onUse={(action, value, stolenItemId) => {
                const result = scene.current?.model.useItem(action, value, stolenItemId);
                if (result?.ok && (action.type === 'confirm' || action.type === 'cancel')) { setWorkerSelection(null); setWorkerMiss(null); scene.current?.focus(); }
                return result?.ok ?? false;
              }}
              locateRoad={(node) => scene.current?.previewRoad(node)}
              sell={(id,itemId)=>scene.current?.model.sellItem(id,itemId)?.ok??false}
              buy={(id, itemId) => scene.current?.model.buyItem(id, itemId)?.ok ?? false}
              leave={(id) => { scene.current?.model.leaveShop(id); }} />}</WindowPanel>
            <WindowPanel id="lottery">{snapshot?.lottery && <LotteryPanel snapshot={snapshot} buy={(id,n)=>scene.current?.model.buyLottery(id,n)} leave={id=>scene.current?.model.leaveLottery(id)}/>}</WindowPanel>
            <WindowPanel id="disposal">{snapshot?.finance?.disposal && <DisposalPanel snapshot={snapshot}/>}</WindowPanel>
            <WindowPanel id="sales">{snapshot?.finance?.sales && <EstateSalesPanel snapshot={snapshot} act={action=>scene.current?.model.operateSales(action)??false}/>}</WindowPanel>
            <WindowPanel id="insurance">{snapshot?.calendar && <InsurancePanel snapshot={snapshot} spin={id=>scene.current?.model.spinInsurance(id)}/>}</WindowPanel>
            <WindowPanel id="commerce">{snapshot?.calendar && <CommercePanel snapshot={snapshot} construct={(id,p,t)=>scene.current?.model.constructCompany(id,p,t)} subscribe={(id,n)=>scene.current?.model.subscribeCompany(id,n)} locate={id=>scene.current?.previewProperty(id)}/>}</WindowPanel>
            <WindowPanel id="company">{snapshot?.calendar && <CompanyPanel snapshot={snapshot} ack={id=>scene.current?.model.ackCompany(id)}/>}</WindowPanel>
            <WindowPanel id="calendar">{snapshot?.calendar && <><DividendPanel snapshot={snapshot}/><CalendarPanel snapshot={snapshot}/></>}</WindowPanel>
            <WindowPanel id="stocks">{snapshot?.g6 && <G6Panel key={`${snapshot.seed}:${snapshot.turn}`} snapshot={snapshot} trade={(id, side, quantity) => scene.current?.model.trade(id, side, quantity)?.ok ?? false} />}</WindowPanel>
            <WindowPanel id="research">{snapshot?.g5 && <><ResearchPanel snapshot={snapshot} start={(propertyId, itemId) => scene.current?.model.research(propertyId, itemId)?.ok ?? false} /><G5Status snapshot={snapshot} /></>}</WindowPanel>
            <WindowPanel id="magic-report">{snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/> }</WindowPanel>
            <WindowPanel id="facility">{snapshot?.facilityDecision&&<FacilityPanel key={snapshot.facilityDecision.id} snapshot={snapshot} act={(id,target)=>scene.current?.model.facility(id,target)?.ok??false}/>}</WindowPanel>
            <WindowPanel id="shop-report">{snapshot?.siteServices&&<ShopReportPanel snapshot={snapshot}/>}</WindowPanel>
            <WindowPanel id="magic">{snapshot?.magicDecision && <MagicPanel key={snapshot.magicDecision.id} decision={snapshot.magicDecision} paused={paused} act={(id,e)=>scene.current?.model.magic(id,e)?.ok??false} build={(id,t)=>scene.current?.model.magicBuild(id,t)?.ok??false}/> }</WindowPanel>
            <WindowPanel id="fortune">{snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/>}{snapshot?.fortuneDecision && <FortunePanel key={snapshot.fortuneDecision.id} decision={snapshot.fortuneDecision} paused={paused} collect={(id,item) => scene.current?.model.collectFortuneCard(id,item)?.ok ?? false} acknowledge={id => scene.current?.model.acknowledgeFortune(id)?.ok ?? false} />}</WindowPanel>
            <WindowPanel id="news">{snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/>}{snapshot?.newsDecision && <NewsPanel key={snapshot.newsDecision.id} decision={snapshot.newsDecision} paused={paused} acknowledge={id => scene.current?.model.acknowledgeNews(id)?.ok ?? false} />}</WindowPanel>
            <WindowPanel id="auction">{snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/>}{snapshot?.auction && <AuctionPanel key={snapshot.auction.id} snapshot={snapshot} bid={(id, increment) => scene.current?.model.bid(id, increment)?.ok ?? false} />}</WindowPanel>
            <WindowPanel id="reaction">{snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/>}{snapshot?.reaction && <ReactionPanel key={snapshot.reaction.id} snapshot={snapshot} respond={(id, choice, target) => scene.current?.model.react(id, choice, target)?.ok ?? false} />}</WindowPanel>
            <WindowPanel id="finance">{snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/>}{snapshot && manifest && <FinancePanel snapshot={snapshot} manifest={manifest}
              loan={(id, operation, amount) => scene.current?.model.loan(id, operation, amount) ?? false}
              transfer={(id, operation, amount) => { scene.current?.model.transfer(id, operation, amount); }}
              leaveBank={(id) => { scene.current?.model.leaveBank(id); }} settleDebt={(id) => { scene.current?.model.settleDebt(id); }} newGame={openSetup} downloadReplay={downloadReplay} />}</WindowPanel>
            <WindowPanel id="property">{snapshot && manifest && !['bank', 'debt', 'finished', 'shop', 'effect', 'reaction', 'auction', 'news', 'fortune'].includes(snapshot.phase) && <PropertyPanel snapshot={snapshot} manifest={manifest} decide={(id, accept, buildingType) => { scene.current?.model.decide(id, accept, buildingType); }} />}</WindowPanel>
            <WindowPanel id="traffic">{snapshot?.g2 && (() => {
              const id = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`, m = snapshot.g2.players[id];
              return <section className="rm-property" aria-label="行动与交通"><h2>行动与交通</h2><p>{mobilityText(m, true)}</p>
                {!!snapshot.g2.lastDice.length && <p aria-label="本次骰子">{snapshot.g2.lastDice.join(' + ')} = {snapshot.dice} 步</p>}
                <label className="rm-form-field">骰子数量<select value={m.diceCount} disabled={paused || snapshot.phase !== 'idle' || actionLocked(m) || !!snapshot.g5?.engineers[id]} onChange={e => scene.current?.model.traffic(Number(e.target.value))}>
                  {Array.from({length:maxDice(m.vehicle)}, (_, i) => <option key={i+1} value={i+1}>{i+1} 颗</option>)}
                </select></label>
                {m.vehicle !== 'foot' && <button className="rm-button rm-button-light" disabled={paused || snapshot.phase !== 'idle' || actionLocked(m) || !!snapshot.g5?.engineers[id]} onClick={() => scene.current?.model.traffic(1, true)}>改为步行</button>}
                <p className="rm-property-note">停留不移动；乌龟固定一格；梦游无法用卡或购买地产。状态在轮到该玩家时计时，暂停不推进。</p>
              </section>;
            })()}</WindowPanel>
            </fieldset>
            <WindowPanel id="players"><section className="rm-travelers"><div className="rm-section-title"><h2>同行的伙伴</h2><span>{String(snapshot?.participants.length ?? 4).padStart(2, '0')}</span></div><p>{snapshot?.mode === 'sandbox' ? '点击角色，切换你的旅伴' : `第 ${snapshot?.turn ?? 1} 回合 · 按列表顺序轮流行动`}</p>
              <div className="rm-character-list">
                {manifest?.characters.map((character, index) => snapshot?.participants.includes(index) && <button
                  key={character.id} className={`rm-character ${snapshot?.active === index ? 'is-active' : ''}${snapshot.eliminated.includes(index) ? ' is-bankrupt' : ''}`}
                  aria-pressed={snapshot?.active === index} aria-label={`选择${character.name}`} disabled={!idle || snapshot?.mode !== 'sandbox'}
                  onClick={() => scene.current?.select(index)}>
                  <span className="rm-avatar" style={{ backgroundColor: `${character.color}18` }}><img src={`${ASSET_ROOT}${character.id}.webp`} alt="" /></span>
                  <span className="rm-character-copy"><strong>{character.name}</strong>{snapshot.computer&&<small>{snapshot.computer.ids.includes(character.id)?'电脑':'人类'}</small>}<small>{snapshot.eliminated.includes(index) ? '已破产' : snapshot.phase === 'finished' ? '本局胜者' : snapshot?.active === index ? '当前角色' : '等待出发'}</small>{snapshot.economy && <small className="rm-balance">现金 {snapshot.economy.balances[`player-${snapshot.participants.indexOf(index) + 1}`].cash.toLocaleString()}<br />存款 {snapshot.economy.balances[`player-${snapshot.participants.indexOf(index) + 1}`].bank.toLocaleString()}</small>}{snapshot.items && <small>点数 {snapshot.items.points[`player-${snapshot.participants.indexOf(index) + 1}`]}</small>}{snapshot.g3?.allies[`player-${snapshot.participants.indexOf(index) + 1}`] && <small>同盟：玩家 {snapshot.g3.allies[`player-${snapshot.participants.indexOf(index) + 1}`]!.partner.split('-')[1]} · {snapshot.g3.allies[`player-${snapshot.participants.indexOf(index) + 1}`]!.remaining === 128 ? '下次解除' : `${snapshot.g3.allies[`player-${snapshot.participants.indexOf(index) + 1}`]!.remaining}（行动计时）`}</small>}{!!snapshot.g4?.hotel[`player-${snapshot.participants.indexOf(index) + 1}`] && <small>住宿：{snapshot.g4.hotel[`player-${snapshot.participants.indexOf(index) + 1}`] === 128 ? '下次解除' : `剩余${snapshot.g4.hotel[`player-${snapshot.participants.indexOf(index) + 1}`]}次行动`}</small>}{snapshot.g2 && <small className="rm-mobility-status">{mobilityText(snapshot.g2.players[`player-${snapshot.participants.indexOf(index) + 1}`], index === snapshot.active)}</small>}</span>
                  <span className="rm-character-dot" style={{ background: character.color }} />
                </button>)}
                {!manifest && <div className="rm-character-placeholder">正在邀请四位老朋友…</div>}
              </div>
            </section>
            </WindowPanel>
            <WindowPanel id="journey"><section className="rm-journey"><div className="rm-section-title"><h2>旅途记录</h2><span aria-hidden="true">↗</span></div>
              <p className="rm-message" role="status" aria-live="polite">{snapshot?.message ?? '地图和伙伴就位后，即可开始。'}</p>
              {snapshot?.phase === 'choosing' && <div className="rm-branches" role="group" aria-label="选择岔路">
                {snapshot.choices.map((id, index) => <button key={id} disabled={paused||computerBusy} onClick={() => scene.current?.model.choose(id)}>
                  <span>路线 {index + 1}</span><strong>{manifest?.map.nodes.find((item) => item.id === id)?.name} · {id}号</strong><span aria-hidden="true">→</span>
                </button>)}
              </div>}
              <div className="rm-progress"><span>已完成移动<strong>{String(snapshot?.completed ?? 0).padStart(2, '0')}</strong></span><span>当前路格<strong>{String(actor?.node ?? 0).padStart(2, '0')}</strong></span></div>
              {((snapshot?.mode === 'lottery' || (snapshot?.mode === 'dividends' || snapshot?.mode === 'company')) || snapshot?.mode === 'calendar' || snapshot?.mode === 'finalFortune' || snapshot?.mode === 'trafficFortune' || snapshot?.mode === 'assetFortune' || snapshot?.mode === 'fortune' || snapshot?.mode === 'completeNews' || snapshot?.mode === 'statusNews' || snapshot?.mode === 'operatingNews' || snapshot?.mode === 'propertyNews' || snapshot?.mode === 'events' || snapshot?.mode === 'news') && <p className="rm-property-note">98号得卡格：停下免费抽取一张剩余卡池中的卡；满15张时替换最便宜的一张。经过和梦游不触发。</p>}
              {!!snapshot?.recentEvents.length && <ol className="rm-event-log" aria-label="最近回合记录">{snapshot.recentEvents.slice(-4).map((event, i) => <li key={`${i}-${event}`}>{event}</li>)}</ol>}
            </section>
            </WindowPanel>
            <WindowPanel id="surrender">{snapshot?.mode==='surrender'&&<SurrenderPanel snapshot={snapshot} confirming={surrenderConfirm} setConfirming={setSurrenderConfirm} surrender={()=>scene.current?.model.surrender()?.ok??false} chooseDeath={(id,target)=>scene.current?.model.chooseDeath(id,target)?.ok??false} />}</WindowPanel>

            <WindowPanel id="help">{snapshot && <GameHelp snapshot={snapshot} />}</WindowPanel>
          </aside>

        <WindowPanel id="diagnostics"><details className="rm-diagnostics" data-object-ids={stats?.objectIds.join(',') ?? ''}><summary>运行信息与验证工具 <span>{ready ? `${stats?.fps ?? '—'} FPS · ${stats?.sprites ?? 0} 个精灵帧 · ${stats?.objectSprites ?? 0} 个对象实例` : '资源准备中'}</span></summary>
          <div className="rm-diagnostic-body"><p>WebGL · 地图 2304 × 2304 · 110 个道路节点 · 首次场景加载 {stats?.loadMs ?? '—'} ms。地产模式按真实归属和等级显示建筑；住宅五级素材与朝向映射仍待原版运行对照。</p>
            <label><input type="checkbox" checked={debug} disabled={!ready} onChange={(event) => { setDebug(event.target.checked); scene.current?.setDebug(event.target.checked); }} /> 高亮道路节点</label>
            <button className="rm-button rm-button-light" disabled={!idle || snapshot?.mode !== 'sandbox'} onClick={() => scene.current?.junction()}>定位岔路验证</button>
            <p className="rm-replay-note">{snapshot && snapshot.mode !== 'sandbox' ? `本局种子：${snapshot.seed} · 状态版本：${snapshot.revision}。相同配置、种子和选择可复现对局。` : '自由验证模式不记录回放。'} 岔路定位仅在新建对局选择“自由验证”后可用。</p>
            <button className="rm-button rm-button-light" disabled={!ready || snapshot?.mode === 'sandbox'} onClick={downloadReplay}>下载回放记录</button>
          </div>
        </details></WindowPanel>
        </GameWindowHost>
      </div>
      <dialog ref={systemDialog} className={`rm-system-dialog rm-system-${systemScreen ?? 'closed'}`} aria-labelledby="rm-system-heading"
        onCancel={event => { event.preventDefault(); backSystem(); }} onClose={() => { if (!systemDialog.current?.open) setSystemScreen(null); }}>
        <header className="rm-system-header"><h2 id="rm-system-heading" tabIndex={-1}>{({title:'大富翁4 · 主菜单',options:'游戏设置',help:'操作帮助',setup:'开启一场新旅程',reset:'重新开始这段旅程？',pause:'游戏已暂停',exit:'返回模块集合？',notice:notice.title})[systemScreen ?? 'title']}</h2>
          <button type="button" onClick={backSystem}>{systemTrail.current.length ? '返回上一级' : '返回对局'}</button></header>
        {systemScreen === 'title' && <><ClassicTitleMenu onSelect={id => { if (id === 'start') openSetup(); else if (id === 'load') openTool('load','读档'); else openSystem(id as 'options'|'exit'); }}/>
          <div className="rm-system-links"><button onClick={closeSystem}>继续当前对局</button><button onClick={() => openSystem('help')}>操作帮助</button><button disabled={snapshot?.mode === 'sandbox'} onClick={downloadReplay}>下载回放记录</button></div></>}
        {systemScreen === 'setup' && <ClassicSetupForm manifest={manifest} draft={{mode:setupMode,ids:setupIds,computers:setupComputers,policy:setupPolicy,funds:setupFunds,date:setupDate,seed:setupSeed}} error={setupError} onSubmit={startGame} onCancel={backSystem} onChange={patch => {
          if(patch.mode!==undefined)setSetupMode(patch.mode); if(patch.ids)setSetupIds(patch.ids); if(patch.computers)setSetupComputers(patch.computers); if(patch.policy)setSetupPolicy(patch.policy); if(patch.funds!==undefined)setSetupFunds(patch.funds); if(patch.date!==undefined)setSetupDate(patch.date); if(patch.seed!==undefined)setSetupSeed(patch.seed);
        }} />}
        {systemScreen === 'options' && <section className="rm-options-content" aria-label="游戏设置内容"><img className="rm-options-art" src="/richman/generated/ui/Data-3/000.png" alt="" />
          <div><h3>声音</h3><AudioPanel audio={audio.current} status={audioStatus}/><h3>显示与操作</h3><button className="rm-button" aria-pressed={fullscreen} onClick={() => void toggleFullscreen()}>{fullscreen ? '退出全屏' : '全屏游戏'}</button><p>屏幕变化时保留当前对局和选择；手机工具栏支持点按，地图支持拖动。</p><button className="rm-button rm-button-light" onClick={() => openSystem('help')}>查看操作帮助</button><button className="rm-button rm-button-light" onClick={openSetup}>开局与电脑配置</button></div></section>}
        {systemScreen === 'help' && snapshot && <div className="rm-help-content"><GameHelp snapshot={snapshot} expanded /><p>LOAD / SAVE 入口已保留，实际存读档暂未接入。下载回放用于复现，不能恢复当前页面进度。</p><button className="rm-button" disabled={snapshot.mode==='sandbox'} onClick={downloadReplay}>下载回放记录</button></div>}
        {systemScreen === 'pause' && <div className="rm-system-confirm"><ClassicPrompt><h3>休息一下</h3><p>移动、小游戏和电脑行动已暂停。继续后恢复当前操作。</p></ClassicPrompt><ClassicDecisionActions accept="继续旅程" disabled={false} onAccept={() => { finishSystem(); scene.current?.model.pause(false); }}/><div className="rm-system-links"><button onClick={() => openSystem('options')}>游戏设置</button><button onClick={openReset}>重新开始</button><button onClick={() => openSystem('exit')}>返回模块集合</button></div></div>}
        {systemScreen === 'reset' && <div className="rm-system-confirm"><ClassicPrompt><p>资金、地产、道具、点数和记录将恢复初始状态。保留配置和种子，使用相同选择可重现路线。</p></ClassicPrompt><ClassicDecisionActions accept="确认重新开始" decline="继续当前旅程" disabled={false} onAccept={reset} onDecline={backSystem}/></div>}
        {systemScreen === 'exit' && <div className="rm-system-confirm"><ClassicPrompt><p>返回模块集合将离开当前对局。未导出的进度会丢失，原版存档暂未接入。</p></ClassicPrompt><div className="rm-system-links"><button disabled={snapshot?.mode==='sandbox'} onClick={downloadReplay}>下载回放记录</button></div><ClassicDecisionActions accept="确认返回模块集合" decline="留在对局" disabled={false} onAccept={() => navigate('/')} onDecline={backSystem}/></div>}
        {systemScreen === 'notice' && <div className="rm-system-confirm"><ClassicPrompt><p>{notice.message}</p></ClassicPrompt><button className="rm-button" onClick={backSystem}>知道了</button></div>}
      </dialog>
    </main>
  );
}
