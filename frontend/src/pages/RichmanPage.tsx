import { decisionSelector, navigateGame } from '../features/richman/decision-navigation';
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
import { Link } from 'react-router-dom';
import { ASSET_ROOT, createScene } from '../features/richman/scene';
import type { RichmanScene, SceneStats } from '../features/richman/scene';
import type { Manifest } from '../features/richman/types';
import type { SessionOptions, SessionSnapshot } from '../features/richman/game/session';
import '../features/richman/richman.css';
import { FinancePanel } from '../features/richman/FinancePanel';
import { PropertyPanel } from '../features/richman/PropertyPanel';
import { INITIAL_FUNDS, ECONOMY_RULES } from '../features/richman/game/economy';

const DICE = ['·', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const PHASES = { surrender: '认输后选人', minigame:'小游戏', facility:'设施探访', magic: '魔法屋', idle: '等待掷骰', rolling: '掷骰中', moving: '前进中', choosing: '选择岔路', property: '地产决策', bank: '银行存取款', debt: '债务处理', finished: '本局结束', turnEnd: '本回合结束', shop: '商店', effect: '道具选择', reaction: '反应决策', auction: '地产拍卖', news: '新闻事件', fortune: '命运事件', company: '公司营业', commerce: '公司服务', lottery: '彩票购买' };

export function RichmanPage() {
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
  const [stats, setStats] = useState<SceneStats | null>(null);
  const [debug, setDebug] = useState(false);
  const resetDialog = useRef<HTMLDialogElement>(null);
  const setupDialog = useRef<HTMLDialogElement>(null);
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
  const pendingDecisionFocus = useRef(false);
  const lastGameFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = game.current;
    const remember = (event: FocusEvent) => {
      lastGameFocus.current = event.target instanceof HTMLElement ? event.target : null;
    };
    root?.addEventListener('focusin', remember);
    return () => root?.removeEventListener('focusin', remember);
  }, []);

  useEffect(() => {
    // A completed decision can remove the focused button (including another seat's response).
    const lostFocus = lastGameFocus.current && !lastGameFocus.current.isConnected && document.activeElement === document.body;
    if ((!pendingDecisionFocus.current && !lostFocus) || !snapshot || !game.current) return;
    pendingDecisionFocus.current = false;
    lastGameFocus.current = null;
    navigateGame(game.current, decisionSelector(snapshot));
  }, [snapshot]);

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
      if (event.key === 'Escape' && !resetDialog.current?.open && !setupDialog.current?.open) setExpanded(false);
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
    setAttempt((value) => value + 1);
  };
  const reset = () => {
    scene.current?.reset();
    setWorkerSelection(null); setWorkerMiss(null);
    pendingDecisionFocus.current = true;
    resetDialog.current?.close();
  };

  const openReset = () => {
    setSurrenderConfirm(false);
    pausedBeforeDialog.current = paused;
    scene.current?.model.pause(true);
    resetDialog.current?.showModal();
  };
  const cancelReset = () => {
    resetDialog.current?.close();
    scene.current?.model.pause(pausedBeforeDialog.current);
  };
  const openSetup = () => {
    setSurrenderConfirm(false);
    pausedBeforeDialog.current = paused;
    scene.current?.model.pause(true);
    setSetupMode(snapshot?.mode ?? 'lottery');
    setSetupComputers(snapshot?.computer?.ids??[]);
    setSetupPolicy(snapshot?.computer?.policy??'basic-v1');
    setSetupFunds(scene.current?.model.exportReplay()?.config.initialFunds ?? ECONOMY_RULES.initialFunds);
    setSetupIds(manifest?.characters.filter((_, i) => snapshot?.participants.includes(i)).map((c) => c.id) ?? []);
    setSetupDate(scene.current?.model.exportReplay()?.config.startDate??'1998-01-01');
    setSetupSeed(''); setSetupError('');
    setupDialog.current?.showModal();
  };
  const cancelSetup = () => {
    setupDialog.current?.close();
    scene.current?.model.pause(pausedBeforeDialog.current);
  };
  const startGame = () => {
    if (!manifest || !scene.current) return;
    const characterIds = manifest.characters.filter((c) => setupMode === 'sandbox' || setupIds.includes(c.id)).map((c) => c.id);
    if (characterIds.length < 2) { setSetupError('请至少选择两位角色。'); return; }
    try {
      setSurrenderConfirm(false);
      scene.current.model.start({ mode: setupMode, characterIds, ...((setupMode === 'stockCircuit' || (setupMode === 'godPairs' || (setupMode === 'specialObjects' || setupMode === 'surrender')))&&setupComputers.some(id=>characterIds.includes(id))?{computerPolicy:setupPolicy,computerIds:setupComputers.filter(id=>characterIds.includes(id))}:{}), ...(['surrender','specialObjects','godPairs','stockCircuit','stockLedger','stockMarket','minigames','shopAcquisition','siteServices', 'magicNested','magicActions','magic','batches','payments','disposal','estateSales','indexedEconomy','dateBusiness','insurance', 'commerce', 'company', 'dividends', 'lottery', 'calendar', 'finalFortune', 'trafficFortune', 'assetFortune', 'fortune', 'completeNews', 'statusNews', 'operatingNews', 'propertyNews', 'news', 'events', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'wealth', 'cards', 'roadTools', 'nearby', 'construction', 'tools', 'economy'].includes(setupMode) ? { initialFunds: setupFunds } : {}),
        ...((setupMode==='calendar'||(setupMode === 'lottery' || (setupMode === 'dividends' || (setupMode === 'company' || (setupMode === 'commerce' || (setupMode === 'insurance' || (setupMode === 'dateBusiness' || (setupMode === 'indexedEconomy'||(setupMode === 'estateSales'||(setupMode === 'disposal' || (setupMode === 'payments' || (setupMode === 'batches' || (setupMode === 'magic' || (setupMode === 'magicActions' || (setupMode === 'magicNested' || (setupMode === 'siteServices' || (setupMode === 'shopAcquisition' || (setupMode === 'minigames' || (setupMode === 'stockMarket' || (setupMode==='stockLedger' || (setupMode === 'stockCircuit' || (setupMode === 'godPairs' || (setupMode === 'specialObjects' || setupMode === 'surrender')))))))))))))))))))))))?{startDate:setupDate}:{}), seed: setupSeed.trim() || crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0') });
      scene.current.followPlayer();
      setWorkerSelection(null); setWorkerMiss(null);
      pendingDecisionFocus.current = true;
      setupDialog.current?.close();
    } catch (cause) { setSetupError(cause instanceof Error ? cause.message : '无法开始对局'); }
  };
  const downloadReplay = () => {
    const replay = scene.current?.model.exportReplay();
    if (!replay) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(replay, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'richman-replay.json';
    link.click(); URL.revokeObjectURL(url);
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
          <div className="rm-map-tag"><span aria-hidden="true">◈</span><div><strong>日本地图</strong><span>本地轮流体验 · 原版素材</span></div></div>
        </div>

        <div className="rm-game-toolbar">
          <span>{fullscreen ? '按 Esc 或按钮退出全屏' : snapshot?.mode === 'sandbox' ? '自由验证 · 手动切换角色' : `第 ${snapshot?.round ?? 1} 轮 · 第 ${snapshot?.turn ?? 1} 回合`}</span>
          <div className="rm-toolbar-actions">
          <button className="rm-button rm-button-light" disabled={!ready} onClick={openSetup}>新建对局</button>
          <button className="rm-button rm-button-light" aria-pressed={fullscreen} onClick={() => void toggleFullscreen()}>
            <span aria-hidden="true">{fullscreen ? '↙' : '⛶'}</span> {fullscreen ? '退出全屏' : '全屏游戏'}
          </button>
          </div>
        </div>
        <nav className="rm-decision-nav" aria-label="对局快捷导航">
          <span>{paused ? '已暂停' : computerBusy ? '电脑正在应答' : snapshot ? PHASES[snapshot.phase] : '加载中'}</span>
          <button disabled={!ready} onClick={() => { if (game.current) navigateGame(game.current, '.rm-board'); }}>回到地图</button>
          <button disabled={!ready} onClick={() => { if (game.current && snapshot) navigateGame(game.current, decisionSelector(snapshot)); }}>当前操作</button>
          <button disabled={!ready} onClick={() => { if (game.current) navigateGame(game.current, '.rm-help'); }}>操作帮助</button>
        </nav>
        <AudioPanel audio={audio.current} status={audioStatus}/>
        <div className="rm-layout">
          <section className="rm-board" aria-label="游戏地图">
            <div className="rm-map-top"><span><i /> {ready ? (snapshot?.phase === 'finished' ? '对局已结束' : paused ? '旅程已暂停' : '旅程进行中') : '准备出发'}</span><span>JAPAN · 01</span></div>
            {snapshot?.minigame&&<MinigamePanel decision={snapshot.minigame} paused={paused||computerBusy} act={input=>scene.current?.model.minigame(snapshot.minigame!.id,input)?.ok??false}/>}
            <div style={snapshot?.minigame?{display:"none"}:undefined} className="rm-viewport" ref={host} data-testid="richman-viewport" data-revision={snapshot?.revision} data-turn={snapshot?.turn} data-phase={snapshot?.phase ?? 'loading'}>
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
            <div className="rm-action-bar">
              <div className={`rm-die ${snapshot?.phase === 'rolling' ? 'is-rolling' : ''}`} aria-label={`骰子点数 ${snapshot?.dice || '尚未掷骰'}`}>{DICE[snapshot?.dice ?? 0] ?? snapshot?.dice}</div>
              <div className="rm-turn-copy"><small>{paused ? '已暂停' : snapshot ? PHASES[snapshot.phase] : '加载中'}</small><strong>{snapshot?.phase === 'finished' ? '本局已结束' : active ? `${active.name}的旅程` : '准备好，就出发'}</strong><span>{snapshot?.phase === 'moving' || snapshot?.phase === 'choosing' ? `剩余 ${snapshot.remaining} 步` : snapshot && ['property', 'bank', 'debt', 'shop', 'effect', 'reaction', 'auction', 'news', 'fortune', 'company', 'commerce', 'lottery', 'facility', 'magic', 'surrender', 'minigame'].includes(snapshot.phase) ? '点“当前操作”前往决策面板' : snapshot?.phase === 'finished' ? '查看结果或开启新局' : '掷骰前进，看看下一站在哪里'}</span></div>
              {snapshot?.phase === 'turnEnd'
                ? <button className="rm-roll" disabled={paused || !ready||computerBusy} onClick={() => { scene.current?.model.endTurn(); scene.current?.followPlayer(); }}>下一位 <span aria-hidden="true">→</span></button>
                : snapshot?.phase === 'finished' ? <button className="rm-roll" onClick={openSetup}>再开一局</button>
                : <button className="rm-roll" disabled={!idle} onClick={() => scene.current?.roll()}><span aria-hidden="true">⚄</span> 掷骰出发 <span aria-hidden="true">→</span></button>}
            </div>
          </section>

          <aside className="rm-sidebar">
            {snapshot&&manifest&&<ComputerPanel snapshot={snapshot} manifest={manifest} retry={()=>scene.current?.model.retryComputer()}/>}
            <fieldset className="rm-controlled-actions" disabled={computerBusy} aria-label="当前决策操作">
            {snapshot && <ItemPanel snapshot={snapshot}
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
                if (result?.ok && (action.type === 'confirm' || action.type === 'cancel')) { setWorkerSelection(null); setWorkerMiss(null); pendingDecisionFocus.current = true; scene.current?.focus(); }
                return result?.ok ?? false;
              }}
              locateRoad={(node) => scene.current?.previewRoad(node)}
              sell={(id,itemId)=>scene.current?.model.sellItem(id,itemId)?.ok??false}
              buy={(id, itemId) => scene.current?.model.buyItem(id, itemId)?.ok ?? false}
              leave={(id) => { scene.current?.model.leaveShop(id); }} />}
            {snapshot?.lottery && <LotteryPanel snapshot={snapshot} buy={(id,n)=>scene.current?.model.buyLottery(id,n)} leave={id=>scene.current?.model.leaveLottery(id)}/>}
            {snapshot?.finance?.disposal && <DisposalPanel snapshot={snapshot}/>}
            {snapshot?.finance?.sales && <EstateSalesPanel snapshot={snapshot} act={action=>scene.current?.model.operateSales(action)??false}/>}
            {snapshot?.calendar && <><InsurancePanel snapshot={snapshot} spin={id=>scene.current?.model.spinInsurance(id)}/><CommercePanel snapshot={snapshot} construct={(id,p,t)=>scene.current?.model.constructCompany(id,p,t)} subscribe={(id,n)=>scene.current?.model.subscribeCompany(id,n)} locate={id=>scene.current?.previewProperty(id)}/><CompanyPanel snapshot={snapshot} ack={id=>scene.current?.model.ackCompany(id)}/><DividendPanel snapshot={snapshot}/><CalendarPanel snapshot={snapshot}/></>}
            {snapshot?.g6 && <G6Panel key={`${snapshot.seed}:${snapshot.turn}`} snapshot={snapshot} trade={(id, side, quantity) => scene.current?.model.trade(id, side, quantity)?.ok ?? false} />}
            {snapshot?.g5 && <><ResearchPanel snapshot={snapshot} start={(propertyId, itemId) => scene.current?.model.research(propertyId, itemId)?.ok ?? false} /><G5Status snapshot={snapshot} /></>}
            {snapshot?.magicNested && <MagicNestedPanel batch={snapshot.magicNested}/> }
            {snapshot?.facilityDecision&&<FacilityPanel key={snapshot.facilityDecision.id} snapshot={snapshot} act={(id,target)=>scene.current?.model.facility(id,target)?.ok??false}/>}
            {snapshot?.siteServices&&<ShopReportPanel snapshot={snapshot}/>}
            {snapshot?.magicDecision && <MagicPanel key={snapshot.magicDecision.id} decision={snapshot.magicDecision} paused={paused} act={(id,e)=>scene.current?.model.magic(id,e)?.ok??false} build={(id,t)=>scene.current?.model.magicBuild(id,t)?.ok??false}/> }
            {snapshot?.fortuneDecision && <FortunePanel key={snapshot.fortuneDecision.id} decision={snapshot.fortuneDecision} paused={paused} collect={(id,item) => scene.current?.model.collectFortuneCard(id,item)?.ok ?? false} acknowledge={id => scene.current?.model.acknowledgeFortune(id)?.ok ?? false} />}
            {snapshot?.newsDecision && <NewsPanel key={snapshot.newsDecision.id} decision={snapshot.newsDecision} paused={paused} acknowledge={id => scene.current?.model.acknowledgeNews(id)?.ok ?? false} />}
            {snapshot?.auction && <AuctionPanel key={snapshot.auction.id} snapshot={snapshot} bid={(id, increment) => scene.current?.model.bid(id, increment)?.ok ?? false} />}
            {snapshot?.reaction && <ReactionPanel key={snapshot.reaction.id} snapshot={snapshot} respond={(id, choice, target) => scene.current?.model.react(id, choice, target)?.ok ?? false} />}
            {snapshot && manifest && <FinancePanel snapshot={snapshot} manifest={manifest}
              loan={(id, operation, amount) => scene.current?.model.loan(id, operation, amount) ?? false}
              transfer={(id, operation, amount) => { scene.current?.model.transfer(id, operation, amount); }}
              leaveBank={(id) => { scene.current?.model.leaveBank(id); }} settleDebt={(id) => { scene.current?.model.settleDebt(id); }} newGame={openSetup} />}
            {snapshot && manifest && !['bank', 'debt', 'finished', 'shop', 'effect', 'reaction', 'auction', 'news', 'fortune'].includes(snapshot.phase) && <PropertyPanel snapshot={snapshot} manifest={manifest} decide={(id, accept, buildingType) => { scene.current?.model.decide(id, accept, buildingType); }} />}
            {snapshot?.g2 && (() => {
              const id = `player-${snapshot.participants.indexOf(snapshot.active) + 1}`, m = snapshot.g2.players[id];
              return <section className="rm-property" aria-label="行动与交通"><h2>行动与交通</h2><p>{mobilityText(m, true)}</p>
                {!!snapshot.g2.lastDice.length && <p aria-label="本次骰子">{snapshot.g2.lastDice.join(' + ')} = {snapshot.dice} 步</p>}
                <label className="rm-form-field">骰子数量<select value={m.diceCount} disabled={paused || snapshot.phase !== 'idle' || actionLocked(m) || !!snapshot.g5?.engineers[id]} onChange={e => scene.current?.model.traffic(Number(e.target.value))}>
                  {Array.from({length:maxDice(m.vehicle)}, (_, i) => <option key={i+1} value={i+1}>{i+1} 颗</option>)}
                </select></label>
                {m.vehicle !== 'foot' && <button className="rm-button rm-button-light" disabled={paused || snapshot.phase !== 'idle' || actionLocked(m) || !!snapshot.g5?.engineers[id]} onClick={() => scene.current?.model.traffic(1, true)}>改为步行</button>}
                <p className="rm-property-note">停留不移动；乌龟固定一格；梦游无法用卡或购买地产。状态在轮到该玩家时计时，暂停不推进。</p>
              </section>;
            })()}
            </fieldset>
            <section className="rm-travelers"><div className="rm-section-title"><h2>同行的伙伴</h2><span>{String(snapshot?.participants.length ?? 4).padStart(2, '0')}</span></div><p>{snapshot?.mode === 'sandbox' ? '点击角色，切换你的旅伴' : `第 ${snapshot?.turn ?? 1} 回合 · 按列表顺序轮流行动`}</p>
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
            <section className="rm-journey"><div className="rm-section-title"><h2>旅途记录</h2><span aria-hidden="true">↗</span></div>
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
            {snapshot?.mode==='surrender'&&<section className="rm-property" aria-label="认输与衰神">
              {snapshot.surrenderDecision ? <><h2>认输已完成</h2><p>退出处置已经结束。可以选择一位存活玩家附身衰神；放弃选择不会撤销认输。</p>{snapshot.surrenderDecision.targets.map(id=><button key={id} disabled={paused} onClick={()=>scene.current?.model.chooseDeath(snapshot.surrenderDecision!.id,id)}>衰神附身玩家 {id.split('-')[1]}</button>)}<button disabled={paused} onClick={()=>scene.current?.model.chooseDeath(snapshot.surrenderDecision!.id,null)}>放弃附身</button></> : surrenderConfirm&&snapshot.canSurrender ? <><p>确认认输将退出本局，先处置资产，再按人数条件选择衰神目标。旧时光机历史会清除。</p><button disabled={paused} onClick={()=>{scene.current?.model.surrender();setSurrenderConfirm(false);}}>确认认输</button><button onClick={()=>setSurrenderConfirm(false)}>继续对局</button></> : <button disabled={!snapshot.canSurrender||paused} onClick={()=>setSurrenderConfirm(true)}>认输退出本局</button>}
            </section>}
            <div className="rm-secondary-actions"><button disabled={!ready || snapshot?.phase === 'finished'} onClick={() => scene.current?.model.pause(!paused)}>{paused ? '继续' : '暂停'}</button><button disabled={!ready} onClick={openReset}>重新开始</button></div>
            {snapshot && <GameHelp snapshot={snapshot} />}
          </aside>
        </div>

        <details className="rm-diagnostics" data-object-ids={stats?.objectIds.join(',') ?? ''}><summary>运行信息与验证工具 <span>{ready ? `${stats?.fps ?? '—'} FPS · ${stats?.sprites ?? 0} 个精灵帧 · ${stats?.objectSprites ?? 0} 个对象实例` : '资源准备中'}</span></summary>
          <div className="rm-diagnostic-body"><p>WebGL · 地图 2304 × 2304 · 110 个道路节点 · 首次场景加载 {stats?.loadMs ?? '—'} ms。地产模式按真实归属和等级显示建筑；住宅五级素材与朝向映射仍待原版运行对照。</p>
            <label><input type="checkbox" checked={debug} disabled={!ready} onChange={(event) => { setDebug(event.target.checked); scene.current?.setDebug(event.target.checked); }} /> 高亮道路节点</label>
            <button className="rm-button rm-button-light" disabled={!idle || snapshot?.mode !== 'sandbox'} onClick={() => scene.current?.junction()}>定位岔路验证</button>
            <p className="rm-replay-note">{snapshot && snapshot.mode !== 'sandbox' ? `本局种子：${snapshot.seed} · 状态版本：${snapshot.revision}。相同配置、种子和选择可复现对局。` : '自由验证模式不记录回放。'} 岔路定位仅在新建对局选择“自由验证”后可用。</p>
            <button className="rm-button rm-button-light" disabled={!ready || snapshot?.mode === 'sandbox'} onClick={downloadReplay}>下载回放记录</button>
          </div>
        </details>
      </div>
      <dialog ref={resetDialog} className="rm-dialog" aria-labelledby="rm-reset-heading" onCancel={(event) => { event.preventDefault(); cancelReset(); }}><h2 id="rm-reset-heading">重新开始这段旅程？</h2><p>参与角色将返回起点，资金、地产、道具、点数和记录恢复初始状态。轮流模式保留配置和种子，使用相同选择可重现路线。</p><div><button className="rm-button rm-button-light" autoFocus onClick={cancelReset}>继续当前旅程</button><button className="rm-button" onClick={reset}>确认重新开始</button></div></dialog>
      <dialog ref={setupDialog} className="rm-dialog rm-setup" aria-labelledby="rm-setup-heading" onCancel={(event) => { event.preventDefault(); cancelSetup(); }}>
        <h2 id="rm-setup-heading">开启一场新旅程</h2><p>开始后会替换当前进度。角色按下方顺序轮流行动。</p>
        <form onSubmit={(event) => { event.preventDefault(); startGame(); }}>
          <label className="rm-form-field">游戏模式<select value={setupMode} onChange={(event) => setSetupMode(event.target.value as SessionOptions['mode'])}><option value="surrender">认输与衰神候选（v47）</option><option value="specialObjects">特殊道路对象候选（v46）</option><option value="godPairs">神仙配对刷新对局（v45，普通五组）</option><option value="stockCircuit">日本股票组合（v44候选）</option><option value="stockLedger">日本股票账本（v43候选）</option><option value="stockMarket">日本股票行情（v42候选）</option><option value="minigames">日本小游戏（v41候选）</option><option value="shopAcquisition">商店赠品与货架（v40候选）</option><option value="siteServices">地点服务候选 v39（探访与商店卖出）</option><option value="magicNested">魔法屋十二效果（v38候选）</option><option value="magicActions">魔法屋十效果（v37候选）</option><option value="magic">魔法屋六效果（v36候选）</option><option value="batches">多人税款与分红破产（v35）</option><option value="payments">公司/命运/贷款破产（v34）</option><option value="disposal">租金破产处置（v33）</option><option value="estateSales">地产挂牌与竞价（v32）</option><option value="indexedEconomy">物价与地产经营（v31）</option><option value="dateBusiness">节日与日期经营（v30）</option><option value="insurance">保险与公司经营（v29）</option><option value="commerce">日产建造与现场认股（v28）</option><option value="company">公司营业首组候选 · v27</option><option value="dividends">公司日期分红候选 · v26</option><option value="lottery">彩票与日期开奖候选 · v25</option><option value="calendar">日期与银行结算候选 · v24</option><option value="finalFortune">日本37槽命运候选 · v23</option><option value="trafficFortune">交通命运候选（32项＋完整新闻）</option><option value="assetFortune">资产命运候选（21项＋完整新闻）</option><option value="fortune">命运候选（16项＋完整新闻）</option><option value="completeNews">完整新闻候选（36条）</option><option value="statusNews">新闻状态候选（十七条）</option><option value="operatingNews">新闻经营候选（十一条）</option><option value="propertyNews">新闻事件候选（八条，含地产组）</option><option value="news">新闻事件候选（首批四条）</option><option value="events">地图事件候选（随机得卡）</option><option value="g7">完整物品候选（G7）</option><option value="g6">神仙与股票（G6 四卡）</option><option value="g5">建拆与道路攻击（G5 七项）</option><option value="g4">地产经营对局（G4 五卡）</option><option value="g3">反应与同盟对局（六卡组合）</option><option value="g2">状态与车辆对局（七项组合）</option><option value="g1">地产与方向卡片对局（五卡组合）</option><option value="wealth">卡片与道具对局（均富卡＋均贫卡）</option><option value="cards">卡片与道具对局（均贫卡）</option><option value="roadTools">道具组合对局（路障与机器娃娃）</option><option value="nearby">邻近建造对局（候选版）</option><option value="construction">建造对局（机器工人限定版）</option><option value="tools">道具对局（遥控骰子，候选规则）</option><option value="economy">地产对局（2–4 人，候选规则）</option><option value="turns">仅移动（2–4 人）</option><option value="sandbox">自由验证（四角色手动切换）</option></select></label>
          <fieldset disabled={setupMode === 'sandbox'}><legend>参与角色（至少两位）</legend>{manifest?.characters.map((c) => <label key={c.id}><input type="checkbox" checked={setupIds.includes(c.id)} onChange={(event) => setSetupIds((ids) => event.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id))} />{c.name}</label>)}</fieldset>
          {(setupMode === 'stockCircuit' || (setupMode === 'godPairs' || (setupMode === 'specialObjects' || setupMode === 'surrender')))&&<><fieldset className="rm-seat-controls"><legend>座位控制</legend>{manifest?.characters.filter(c=>setupIds.includes(c.id)).map(c=><label key={c.id}>{c.name}<select aria-label={`${c.name}控制方式`} value={setupComputers.includes(c.id)?'computer':'human'} onChange={e=>setSetupComputers(ids=>e.target.value==='computer'?[...new Set([...ids,c.id])]:ids.filter(id=>id!==c.id))}><option value="human">人类</option><option value="computer">电脑</option></select></label>)}<small>可配置多人对局、与电脑对战或电脑观战；暂停、重开和退出会停止电脑动作。</small></fieldset><label className="rm-form-field">电脑策略<select aria-label="电脑策略" value={setupPolicy} onChange={e=>setSetupPolicy(e.target.value as ComputerPolicy)}><option value="basic-v1">基础：购地与资金</option><option value="tools-v1">道具：遥控骰子与机器工人</option><option value="rent-v1">租金：免费与嫁祸反应（含道具）</option><option value="defense-v1">防御：陷害与梦游嫁祸（含租金/道具）</option><option value="estate-v1">地产：购地、换地、换屋与拆除（含防御）</option><option value="cash-v1">资金：均贫、均富与查税（含地产）</option><option value="status-v1">状态：停留、冬眠、梦游、陷害与乌龟（含资金）</option><option value="inventory-v1">库存：抢夺与同盟（含状态）</option><option value="commerce-v1">经营：改建、拍卖、涨价与查封（含库存）</option><option value="area-v1">建拆：天使、恶魔与怪兽（含经营）</option><option value="roads-v1">道路：清路、放置与飞弹（含建拆）</option><option value="research-v1">高级科研（research-v1）</option><option value="capital-v1">股票与资金（capital-v1）</option><option value="gods-v1">神仙与行情卡（gods-v1）</option><option value="mobility-v1">移动：转向、机车、汽车与工程车（含道路）</option></select></label></>}
          {['surrender','specialObjects','godPairs','stockCircuit','stockLedger','stockMarket','minigames','shopAcquisition','siteServices', 'magicNested','magicActions','magic','batches','payments','disposal','estateSales','indexedEconomy','dateBusiness','insurance', 'commerce', 'company', 'dividends', 'lottery', 'calendar', 'finalFortune', 'trafficFortune', 'assetFortune', 'fortune', 'completeNews', 'statusNews', 'operatingNews', 'propertyNews', 'news', 'events', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'wealth', 'cards', 'roadTools', 'nearby', 'construction', 'tools', 'economy'].includes(setupMode) && <label className="rm-form-field">每人初始资金<select value={setupFunds} onChange={(event) => setSetupFunds(Number(event.target.value))}>{INITIAL_FUNDS.map((funds) => <option key={funds} value={funds}>{funds.toLocaleString()} 元</option>)}</select><small>现金与存款各半；新日期模式按资产更新物价，旧模式沿用固定物价。租金不足将破产退出（神仙股票模式先卖出持仓偿租），最后一位未破产玩家获胜。采用候选规则；{(setupMode === 'calendar' || (setupMode === 'lottery' || (setupMode === 'dividends' || (setupMode === 'company' || (setupMode === 'commerce' || (setupMode === 'insurance' || (setupMode === 'dateBusiness' || (setupMode === 'indexedEconomy'||(setupMode === 'estateSales'||(setupMode === 'disposal' || (setupMode === 'payments' || (setupMode === 'batches' || (setupMode === 'magic' || (setupMode === 'magicActions' || (setupMode === 'magicNested' || (setupMode === 'siteServices' || (setupMode === 'shopAcquisition' || (setupMode === 'minigames' || (setupMode === 'stockMarket' || (setupMode==='stockLedger' || (setupMode === 'stockCircuit' || (setupMode === 'godPairs' || (setupMode === 'specialObjects' || setupMode === 'surrender'))))))))))))))))))))))) ? '本模式包含日期、月息与贷款到期催收；' : '旧模式不含定期利息；'}完整新闻及后续模式支持基础贷款；地产经营及后续模式支持卡片拍卖。</small></label>}
          {(setupMode === 'calendar' || (setupMode === 'lottery' || (setupMode === 'dividends' || (setupMode === 'company' || (setupMode === 'commerce' || (setupMode === 'insurance' || (setupMode === 'dateBusiness' || (setupMode === 'indexedEconomy'||(setupMode === 'estateSales'||(setupMode === 'disposal' || (setupMode === 'payments' || (setupMode === 'batches' || (setupMode === 'magic' || (setupMode === 'magicActions' || (setupMode === 'magicNested' || (setupMode === 'siteServices' || (setupMode === 'shopAcquisition' || (setupMode === 'minigames' || (setupMode === 'stockMarket' || (setupMode==='stockLedger' || (setupMode === 'stockCircuit' || (setupMode === 'godPairs' || (setupMode === 'specialObjects' || setupMode === 'surrender'))))))))))))))))))))))) && <label className="rm-form-field">开局日期<input type="date" min="1998-01-01" max="2099-12-31" value={setupDate} onChange={e=>setSetupDate(e.target.value)}/><small>可复现起点；轮转一圈推进一天。</small></label>}
          {setupMode !== 'sandbox' && <label className="rm-form-field">对局种子（可选）<input value={setupSeed} maxLength={64} onChange={(event) => setSetupSeed(event.target.value)} placeholder="留空自动生成" /><small>相同种子和操作可复现移动结果。</small></label>}
          {setupError && <p role="alert">{setupError}</p>}
          <div className="rm-setup-actions"><button type="button" className="rm-button rm-button-light" autoFocus onClick={cancelSetup}>取消</button><button type="submit" className="rm-button">开始新对局</button></div>
        </form>
      </dialog>
    </main>
  );
}
