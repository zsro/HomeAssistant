import {eventAudio} from '../audio-events';
import type {AudioPacket} from '../audio';
import {SURRENDER_RULES,canSurrender,type SurrenderDecision} from './surrender';
import {SPECIAL_OBJECT_RULES} from './special-objects-rules';
import {GOD_PAIRS_RULES} from './god-pairs-rules';
import {decideComputer,observeResearch} from './computer-research';
import type {ResearchMemory} from './computer-research';
import type {ComputerPolicy} from './computer';
import {COMPUTER_POLICY,COMPUTER_DELAY,decisionPlayer} from './computer';
import type {ControlledReplay} from './computer';
import {STOCK_CIRCUIT_RULES} from './stock-circuit-rules';
import {STOCK_LEDGER_RULES} from './stock-ledger-rules';
import {STOCK_MARKET_RULES} from './stock-market-rules';
import {MINIGAME_RULES,MINIGAME_NAMES} from './minigames';
import type {MiniDecision,MiniInput} from './minigames';
import {SHOP_ACQUISITION_RULES} from './shop-acquisition';
import {SITE_SERVICES_RULES,saleOptions} from './site-services';
import type {FacilityDecision,SiteServicesState} from './site-services';
import {MAGIC_NESTED_RULES} from './magic-nested';
import type {MagicNested} from './magic-nested';
import {MAGIC_ACTIONS_RULES} from './magic-actions';
import {MAGIC_RULES} from './magic-house';
import type {MagicDecision} from './magic-house';
import {BATCH_RULES} from './payment-batches';
import {PAYMENT_RULES} from './payments';
import {DISPOSAL_RULES} from './disposal';
import {ESTATE_RULES,salesAvailable} from './estate-sales';
import type {SaleAction} from './estate-sales';
import {INDEXED_RULES} from './indexed-economy';
import {DATE_BUSINESS_RULES} from './date-business';
import {INSURANCE_RULES} from './insurance';
import type {InsuranceDecision} from './insurance-state';
import type {CommerceDecision} from './commerce';
import {COMMERCE_RULES} from './commerce-rules';
import {COMPANY_RULES} from './company-services';
import type {CompanyDecision} from './company-services';
import {DIVIDEND_RULES} from './dividends';
import {LOTTERY_RULES} from './lottery';
import type {LotteryDecision} from './lottery';
import {CALENDAR_RULES} from './calendar';
import {FINAL_FORTUNE_RULES} from './final-fortune';
import {TRAFFIC_FORTUNE_RULES} from './traffic-fortune';
import {ASSET_FORTUNE_RULES} from './asset-fortune';
import { FORTUNE_RULES } from './fortune';
import type { FortuneDecision } from './fortune';
import { loanCapacity } from './news-business';
import { COMPLETE_NEWS_RULES, STATUS_NEWS_RULES, OPERATING_NEWS_RULES, PROPERTY_NEWS_RULES, NEWS_RULES } from './news';
import type { NewsDecision } from './news';
import { MAP_EVENT_RULES } from './map-events';
import { G7_RULES, g7Options } from './g7';
import type { G7Option } from './g7';
import { G7_GOODS } from './g7-catalog';
import { G6_RULES, g6Options } from './g6';
import type { G6Option } from './g6';
import { G6_GOODS, JAPAN_STOCKS } from './g6-catalog';
import { marketAvailable } from './g6-market';
import { G5_RULES, g5Options, researchOptions } from './g5';
import type { G5Option } from './g5';
import { G5_GOODS } from './g5-catalog';
import { G4_RULES, G4_GOODS, g4Options, buildingName, priceText } from './g4';
import type { G4Option, AuctionDecision } from './g4';
import { G3_RULES, G3_GOODS, g3Options, itemName } from './g3';
import type { G3Option, ReactionDecision } from './g3';
import { G2_RULES, G2_GOODS, g2Options, mobilityText, detained } from './g2';
import type { G2Option } from './g2';
import { G1_RULES, G1_GOODS, g1Options } from './g1';
import type { G1Option } from './g1';
import { WEALTH_RULES, WEALTH_CARD, WEALTH_EFFECT, wealthParticipants } from './wealth';
import { CARD_RULES, EQUAL_CASH, EQUAL_CASH_EFFECT, equalCashTargets } from './cards';
import { ROAD_RULES, ROAD_GOODS, ROBOT_EFFECT, ROADBLOCK_EFFECT, roadblockTargets, robotPath } from './road-tools';
import { NEARBY_RULES, NEARBY_WORKER_EFFECT, nearbyWorkerTargets } from './nearby-construction';
import { CONSTRUCTION_RULES, WORKER_EFFECT } from './construction';
import { ITEM_RULES, REMOTE_DICE } from './items';
import type { ShopDecision } from './items';
import type { EffectAction } from './effects';
import type { Actor, Manifest, Snapshot } from '../types';
import { directionFor, Traversal } from '../traversal';
import { GameEngine } from './engine';
import { FINANCE_RULES, nextSolventIndex } from './finance';
import type { BankDecision, DebtDecision } from './finance';
import { ECONOMY_RULES, PROPERTY_CATALOG } from './economy';
import type { PropertyDecision } from './economy';
import type { Action, GameEvent, GameState } from './engine';

export type SessionOptions = { computerPolicy?:ComputerPolicy; computerIds?: string[]; mode: 'surrender' | 'specialObjects' | 'godPairs' | 'stockCircuit' | 'stockLedger' | 'stockMarket' | 'minigames' | 'shopAcquisition' | 'siteServices' | 'magicNested' | 'magicActions' | 'magic' | 'batches' | 'payments' | 'disposal' | 'estateSales' | 'indexedEconomy' | 'dateBusiness' | 'insurance' | 'commerce' | 'company' | 'dividends' | 'lottery' | 'calendar' | 'finalFortune' | 'trafficFortune' | 'assetFortune' | 'fortune' | 'completeNews' | 'statusNews' | 'operatingNews' | 'propertyNews' | 'news' | 'events' | 'g7' | 'g6' | 'g5' | 'g4' | 'g3' | 'g2' | 'g1' | 'wealth' | 'cards' | 'roadTools' | 'nearby' | 'construction' | 'tools' | 'economy' | 'turns' | 'sandbox'; characterIds: string[]; seed: string; initialFunds?: number; startDate?: string };
export type SessionSnapshot = Snapshot & {
  canSurrender?:boolean; surrenderDecision?:SurrenderDecision|null;
  computer?: {policy?:ComputerPolicy;ids:string[];playerId:string;automatic:boolean;reason:string;error:string|null;lastReason:string|null};
  mode: SessionOptions['mode']; participants: number[]; seed: string; turn: number; round: number;
  insuranceDecision?:InsuranceDecision|null; commerceDecision?:CommerceDecision|null; companyDecision?:CompanyDecision|null;
  lottery?: GameState['lottery']; lotteryDecision?: LotteryDecision | null;
  salesAvailable?: boolean; calendar?: GameState['calendar']; news?: GameState['news']; loanLimit?:number;
  shopSales?:ReturnType<typeof saleOptions>; siteServices?:SiteServicesState; facilityDecision?:FacilityDecision|null; fortuneDecision?: FortuneDecision | null; magicDecision?: MagicDecision | null; magicNested?:MagicNested|null;
  minigame?:MiniDecision|null; newsDecision?: NewsDecision | null;
  g7Choices?: Record<string, G7Option[]>; g7?: { checkpoint: { round: number; turn: number } | null };
  g6?: GameState['g6']; g6Choices?: Record<string, G6Option[]>; canTrade?: boolean;
  g5?: GameState['g5']; g5Choices?: Record<string, G5Option[]>; researchChoices?: ReturnType<typeof researchOptions>;
  g4?: GameState['g4']; g4Choices?: Record<string, G4Option[]>; auction?: AuctionDecision | null;
  g3?: GameState['g3']; g3Choices?: Record<string, G3Option[]>; reaction?: ReactionDecision | null;
  g2?: GameState['g2']; g2Choices?: Record<string, G2Option[]>;
  g1?: GameState['g1']; g1Choices?: Record<string, G1Option[]>;
  wealth?: GameState['wealth']; wealthPlayers?: { id: string; name: string; cash: number }[];
  cards?: GameState['cards']; cardTargets?: { id: string; characterId: string; name: string }[];
  roadTools?: GameState['roadTools']; roadTargets?: number[]; robotRoute?: number[];
  workerTargets?: string[]; revision: number; nextName: string; recentEvents: string[];
  finance: GameState['finance'] | null; bankDecision: BankDecision | null; debtDecision: DebtDecision | null; eliminated: number[];
  items?: GameState['items'] | null; effects?: GameState['effects'] | null; shopDecision?: ShopDecision | null;
  economy: GameState['economy'] | null; decision: PropertyDecision | null; currentPropertyId: string | null;
};
export function mapCardName(id: string) { return [...G1_GOODS, ...G2_GOODS, ...G3_GOODS, ...G4_GOODS, ...G5_GOODS, ...G6_GOODS].find(g => g.id === id)?.name ?? (id === 'card:01' ? '均富卡' : id === 'card:02' ? '均贫卡' : id); }
const identity: { id: () => string; seed: () => string } = {
  id: () => crypto.randomUUID(),
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8, '0'),
};

/** Keeps interpolation outside GameEngine. Sandbox owns a separate legacy model, never a live turn game. */
export class GameSession {
  readonly nodes;
  private engine!: GameEngine;
  private sandbox: Traversal | null = null;
  private options!: SessionOptions;
  private animation = { token: '', elapsed: 0 };
  private commandSerial = 0;
  private disposed = false;
  private researchMemory: ResearchMemory = {};
  private computerWait = {key:'',elapsed:0};
  private computerError: string | null = null;
  private lastComputerReason: string | null = null;
  private recentEvents: string[] = [];
  private view!: SessionSnapshot;
  onPresentation: (packet: AudioPacket) => void = () => undefined;
  onChange: (state: SessionSnapshot) => void = () => undefined;

  constructor(readonly manifest: Manifest, private readonly ids = identity, initialMode: SessionOptions['mode'] = 'turns') {
    this.nodes = new Map(manifest.map.nodes.map((n) => [n.id, n]));
    this.start({ mode: initialMode, characterIds: manifest.characters.map((c) => c.id), seed: ids.seed() });
  }

  get state() { return this.view; }
  get actor() { return this.view.actors[this.view.active]; }
  snapshot(): SessionSnapshot { return structuredClone(this.view); }
  get gameState(): GameState | null { return this.sandbox ? null : this.engine.state; }
  exportReplay(): ControlledReplay | null { if(this.sandbox)return null;const replay=this.engine.exportReplay();return this.options.computerIds?.length?{...replay,control:{version:1,policy:this.options.computerPolicy??COMPUTER_POLICY,computerIds:[...this.options.computerIds]}}:replay; }

  start(options: SessionOptions) {
    if(this.disposed)throw new Error('对局已关闭');
    const computers=options.computerIds??[];
    if(options.computerPolicy!==undefined&&!['basic-v1','tools-v1','rent-v1','defense-v1','estate-v1','cash-v1','status-v1','inventory-v1','commerce-v1','area-v1','roads-v1','mobility-v1','gods-v1','capital-v1','research-v1'].includes(options.computerPolicy))throw new Error('不支持的电脑策略');
    if(new Set(computers).size!==computers.length||computers.some(id=>!options.characterIds.includes(id)))throw new Error('电脑座位必须是本局参与角色且不能重复');
    if(computers.length&&(options.mode !== 'stockCircuit' && (options.mode !== 'godPairs' && (options.mode !== 'specialObjects' && options.mode !== 'surrender'))))throw new Error('基础电脑目前仅支持v44～v47候选模式');
    if ((options.mode !== 'disposal' && (options.mode !== 'payments' && (options.mode !== 'batches' && (options.mode !== 'magic' && (options.mode !== 'magicActions' && (options.mode !== 'magicNested' && (options.mode !== 'siteServices' && (options.mode !== 'shopAcquisition' && (options.mode !== 'minigames' && (options.mode !== 'stockMarket' && (options.mode!=='stockLedger' && (options.mode !== 'stockCircuit' && (options.mode !== 'godPairs' && (options.mode !== 'specialObjects' && options.mode !== 'surrender')))))))))))))) && options.mode !== 'estateSales' && options.mode !== 'indexedEconomy' && options.mode !== 'dateBusiness' && options.mode !== 'insurance' && options.mode !== 'commerce' && options.mode !== 'company' && options.mode !== 'dividends' && options.mode !== 'lottery' && options.mode !== 'calendar' && options.mode !== 'finalFortune' && options.mode !== 'trafficFortune' && options.mode !== 'assetFortune' && options.mode !== 'fortune' && options.mode !== 'completeNews' && options.mode !== 'statusNews' && options.mode !== 'operatingNews' && options.mode !== 'propertyNews' && options.mode !== 'news' && options.mode !== 'events' && options.mode !== 'g7' && options.mode !== 'g6' && options.mode !== 'g5' && options.mode !== 'g4' && options.mode !== 'g3' && options.mode !== 'g2' && options.mode !== 'g1' && options.mode !== 'wealth' && options.mode !== 'cards' && options.mode !== 'roadTools' && options.mode !== 'nearby' && options.mode !== 'construction' && options.mode !== 'tools' && options.mode !== 'economy' && options.mode !== 'turns' && options.mode !== 'sandbox') throw new Error('不支持的游戏模式');
    if (options.characterIds.some((id) => !this.manifest.characters.some((c) => c.id === id))) throw new Error('角色不存在');
    // Validate a complete new game before replacing the active one.
    const next = new GameEngine(this.manifest.map.nodes, {
      ...(options.mode==='surrender'?{humanIds:options.characterIds.flatMap((id,i)=>computers.includes(id)?[]:[`player-${i+1}`])}:{}),
      ...((options.mode==='calendar'||(options.mode === 'lottery' || (options.mode === 'dividends' || options.mode === 'company' || (options.mode === 'commerce' || (options.mode === 'insurance' || (options.mode === 'dateBusiness' || (options.mode === 'indexedEconomy' || (options.mode === 'estateSales'||(options.mode === 'disposal' || (options.mode === 'payments' || (options.mode === 'batches' || (options.mode === 'magic' || (options.mode === 'magicActions' || (options.mode === 'magicNested' || (options.mode === 'siteServices' || (options.mode === 'shopAcquisition' || (options.mode === 'minigames' || (options.mode === 'stockMarket' || (options.mode==='stockLedger' || (options.mode === 'stockCircuit' || (options.mode === 'godPairs' || (options.mode === 'specialObjects' || options.mode === 'surrender'))))))))))))))))))))))?{startDate:options.startDate??'1998-01-01'}:{}), gameId: this.ids.id(), seed: options.seed, characterIds: options.characterIds,
      ...(['surrender','specialObjects','godPairs','stockCircuit','stockLedger','stockMarket','minigames','shopAcquisition','siteServices','magicNested','magicActions','magic','batches','payments','disposal','estateSales','indexedEconomy','dateBusiness','insurance', 'commerce', 'company', 'dividends', 'lottery', 'calendar', 'finalFortune', 'trafficFortune', 'assetFortune', 'fortune', 'completeNews', 'statusNews', 'operatingNews', 'propertyNews', 'news', 'events', 'g7', 'g6', 'g5', 'g4', 'g3', 'g2', 'g1', 'wealth', 'cards', 'roadTools', 'nearby', 'construction', 'tools', 'economy'].includes(options.mode) ? { rulesId: options.mode==='surrender'?SURRENDER_RULES.id:options.mode==='specialObjects'?SPECIAL_OBJECT_RULES.id:options.mode==='godPairs'?GOD_PAIRS_RULES.id:options.mode === 'stockCircuit'?STOCK_CIRCUIT_RULES.id:options.mode==='stockLedger'?STOCK_LEDGER_RULES.id:options.mode==='stockMarket'?STOCK_MARKET_RULES.id:options.mode==='minigames'?MINIGAME_RULES.id:options.mode === 'shopAcquisition'?SHOP_ACQUISITION_RULES.id:options.mode === 'siteServices'?SITE_SERVICES_RULES.id:options.mode === 'magicNested'?MAGIC_NESTED_RULES.id:options.mode==='magicActions'?MAGIC_ACTIONS_RULES.id:options.mode==='magic'?MAGIC_RULES.id:options.mode==='batches'?BATCH_RULES.id:options.mode==='payments'?PAYMENT_RULES.id:options.mode==='disposal'?DISPOSAL_RULES.id:options.mode==='estateSales'?ESTATE_RULES.id:options.mode==='indexedEconomy'?INDEXED_RULES.id:options.mode==='dateBusiness'?DATE_BUSINESS_RULES.id:options.mode==='insurance'?INSURANCE_RULES.id:options.mode === 'commerce' ? COMMERCE_RULES.id : options.mode === 'company' ? COMPANY_RULES.id : options.mode === 'dividends' ? DIVIDEND_RULES.id : options.mode === 'lottery' ? LOTTERY_RULES.id : options.mode === 'calendar' ? CALENDAR_RULES.id : options.mode === 'finalFortune' ? FINAL_FORTUNE_RULES.id : options.mode === 'trafficFortune' ? TRAFFIC_FORTUNE_RULES.id : options.mode === 'assetFortune' ? ASSET_FORTUNE_RULES.id : options.mode === 'fortune' ? FORTUNE_RULES.id : options.mode === 'completeNews' ? COMPLETE_NEWS_RULES.id : options.mode === 'statusNews' ? STATUS_NEWS_RULES.id : options.mode === 'operatingNews' ? OPERATING_NEWS_RULES.id : options.mode === 'propertyNews' ? PROPERTY_NEWS_RULES.id : options.mode === 'news' ? NEWS_RULES.id : options.mode === 'events' ? MAP_EVENT_RULES.id : options.mode === 'g7' ? G7_RULES.id : options.mode === 'g6' ? G6_RULES.id : options.mode === 'g5' ? G5_RULES.id : options.mode === 'g4' ? G4_RULES.id : options.mode === 'g3' ? G3_RULES.id : options.mode === 'g2' ? G2_RULES.id : options.mode === 'g1' ? G1_RULES.id : options.mode === 'wealth' ? WEALTH_RULES.id : options.mode === 'cards' ? CARD_RULES.id : options.mode === 'roadTools' ? ROAD_RULES.id : options.mode === 'nearby' ? NEARBY_RULES.id : options.mode === 'construction' ? CONSTRUCTION_RULES.id : options.mode === 'tools' ? ITEM_RULES.id : FINANCE_RULES.id, initialFunds: options.initialFunds ?? ECONOMY_RULES.initialFunds } : {}),
    });
    if (this.sandbox) this.sandbox.onChange = () => undefined;
    this.engine = next; this.researchMemory = {};
    this.options = structuredClone({ ...options, seed: options.seed.trim() });
    this.animation = { token: '', elapsed: 0 };
    this.commandSerial = 0; this.recentEvents = [];
    this.computerWait={key:'',elapsed:0};this.computerError=null;this.lastComputerReason=null;
    this.sandbox = options.mode === 'sandbox' ? new Traversal(this.manifest) : null;
    if (this.sandbox) this.sandbox.onChange = () => this.publish();
    this.publish([]);
  }

  private publish(events?: readonly GameEvent[], before?: GameState) {
    this.view = this.project();
    this.onChange(this.snapshot());
    if (!events) return; // Interpolation frames do not copy world snapshots for audio.
    // Detached presentation data only; observers cannot alter state or accepted commands.
    const state = this.engine.state;
    try { this.onPresentation({ gameId: state.gameId, revision: state.revision,
      turn: state.turn, flush: events.some(e => e.type === 'effectCancelled' || (e.type === 'effectConsumed' && e.itemId === 'tool:10')),
      cues: eventAudio(before ?? state, state, events),
      paused: this.view.paused, active: !this.sandbox && state.phase !== 'finished',
      landings: events.flatMap(event => event.type === 'landed' ? [{ sequence: event.sequence,
        node: event.node, dreaming: !!(before ?? state).g2?.players[event.playerId]?.dream }] : []),
    }); } catch { /* Sound failures must never interrupt a turn. */ }
  }

  private eventText(event: GameEvent, state: GameState) {
    const player = state.players.find((p) => p.id === ('payerId' in event ? event.payerId ?? event.playerId : event.playerId))!;
    const name = this.manifest.characters.find((c) => c.id === player.characterId)!.name;
    const prefix = `第 ${event.turn} 回合 · ${name}`;
    switch (event.type) {
      case 'stockMarketUpdated':return `${event.receipt.date} 行情已更新，大盘指数 ${event.receipt.index.toLocaleString()}。`;
      case 'minigameFinished':return `${MINIGAME_NAMES[event.game]}：${event.score} 分，点数 ${event.before} → ${event.balance}。`;
      case 'companyService': return `${event.receipt.name}营业结算：玩家${event.receipt.payerId.split('-')[1]}实付${event.receipt.paid}元，公司本期${event.receipt.fundsAfter}元${event.receipt.bankrupt?'，资金不足退出':''}。`;
      case 'companyDividends': return `${event.settlement.date} 公司分红：${event.settlement.payments.map(p=>`玩家${p.playerId.split('-')[1]} ${p.amount}元${p.bankrupt?'，资金不足退出':''}`).join('；')}。`;
      case 'lotteryOffered': return `${prefix}抵达彩票站，可买一张或离开。`;
      case 'lotteryBought': return `${prefix}购买${event.number}号彩票，现金支付1000元，奖池${event.fund}元。`;
      case 'lotteryReleased': return `玩家${event.ownerId.split('-')[1]}破产，${event.numbers.length}张彩票归还票池，不退款。`;
      case 'lotteryDrawn': return `${event.result.date} 彩票：${event.result.number===null?'无人持票，不开奖':event.result.winnerId?`${event.result.number}号中奖，玩家${event.result.winnerId.split('-')[1]}获现金${event.result.amount}元`:`开出${event.result.number}号，无人中奖，票与奖池结转`}。`;
      case 'loanChanged': return `${prefix}${event.operation==='borrow'?'借款':event.operation==='repay'?'还款':'破产核销'} ${event.amount}元；未偿贷款${event.debt}元。`;
      case 'newsAuctionPrepared': return `${prefix}公共拍卖待竞价。`;
      case 'fortuneCollectionOffered': return `${prefix}命运取卡：请逐位选择。`;
      case 'magicOffered': return '到达魔法屋，请抽取目标组。';
      case 'magicTargets': return '魔法屋目标已确定，请选择效果。';
      case 'magicResolved': return `魔法屋：${event.receipt.title}，已结算。`;
      case 'fortuneSkipped': return '本次没有可执行命运。';
      case 'fortuneResolved': return `${prefix}命运：${event.title}，已结算。`;
      case 'newsSkipped': return '本次没有可执行新闻。';
      case 'newsResolved': return `${prefix}新闻：${event.title}，已结算。`;
      case 'mapCardReceived': return `${prefix}在${event.node}号得卡格${event.itemId ? `获得${mapCardName(event.itemId)}${event.discarded ? `，满包退回${mapCardName(event.discarded)}` : ''}` : '未得卡：公共卡池已空'}。`;
      case 'g7Notice': return event.message;
      case 'g6Notice': return event.message;
      case 'stockTraded': return `玩家${event.traderId.split('-')[1]}${event.forced ? '为偿租自动卖出' : event.side === 'buy' ? '买入' : '卖出'}${JAPAN_STOCKS.find(k => k.id === event.stockId)!.name}${event.quantity}股，银行${event.side === 'buy' ? '扣款' : '入账'}${event.amount}元`;
      case 'g5Notice': return event.message;
      case 'roadblockRemoved': return `${event.node}号路障已${event.reason === 'missile' ? '被飞弹清除' : event.reason === 'robot' ? '被机器娃娃清除' : '截停并回收'}`;
      case 'hazardChanged': return `${event.hazard.itemId === 'tool:03' ? '地雷' : '定时炸弹'} · ${event.reason} · ${event.hazard.carrier ? `玩家 ${event.hazard.carrier.split('-')[1]}携带，剩余${event.hazard.remaining}格` : `${event.hazard.node}号路格`}`;
      case 'g4PropertyChanged': { const d = PROPERTY_CATALOG.properties.find(p => p.id === event.property.id)!; return `${d.name} · ${event.reason} · ${buildingName(event.property, d)} ${event.property.level}级 ${priceText(event.property)}`; }
      case 'surrenderStarted': return `玩家 ${event.sourceId.split('-')[1]}认输，先完成公共资产处置`;
      case 'surrenderCompleted': return event.outcome==='attached'?`衰神附身玩家 ${event.targetId!.split('-')[1]}，期限13次`:event.outcome==='busy'?'衰神两槽均忙，本次不覆盖':event.outcome==='cancelled'?'已放弃附身，认输不撤销':'认输退出完成，本次不进入衰神选人';
      case 'auctionOffered': return `拍卖等待玩家 ${event.decision.responderId.split('-')[1]}出价，当前${event.decision.bid}元`;
      case 'auctionBid': return `${prefix}${event.amount === null ? '退出竞价' : `出价${event.amount}元`}`;
      case 'propertyListed': return `玩家 ${event.record.sellerId.split('-')[1]}挂牌地产 ${event.record.propertyId.split(':').at(-1)}，总价 ${event.record.price} 元`;
      case 'saleCompleted': return `玩家 ${event.receipt.buyerId.split('-')[1]}现金购得挂牌地产，${event.receipt.listing.price} 元存入玩家 ${event.receipt.listing.sellerId.split('-')[1]}银行`;
      case 'listingRemoved': return event.reason==='sold'?null:`挂牌 ${event.listingId} 已${event.reason==='cancelled'?'撤回':'因资产变化撤销'}`;
      case 'paymentCompleted': return `${event.payment.kind==='company'?'公司费用':event.payment.kind==='fortune'?'命运罚款':event.payment.kind==='batch'?'多人批次付款':'到期贷款'}退出处置后完成结算，实付 ${event.payment.paid.cash+event.payment.paid.bank} 元`;
      case 'disposalCompleted': return `玩家 ${event.receipt.payerId.split('-')[1]}退出处置完成，${event.receipt.continuation?'原款待回调':'债权人实收'} ${event.receipt.amount} 元，公开强拍 ${event.receipt.auctions.length} 块`;
      case 'auctionSettled': return event.winnerId ? `玩家 ${event.winnerId.split('-')[1]}以${event.amount}元竞得地产，${event.sourceId === 'public' ? '收入计入公共资金' : `收入存入玩家 ${event.sourceId.split('-')[1]}的银行`}` : '本次流拍，地产恢复待售，建筑保留';
      case 'taxSettled': return `玩家 ${event.payerId.split('-')[1]}${event.waived ? '免付税款' : `支付查税款${event.amount}元给玩家 ${event.sourceId.split('-')[1]}`}`;
      case 'facilityDrawn': return `${prefix}进入${event.buildingType === 1 ? '大饭店，住宿' : '购物中心，消费'}数量${event.count}`;
      case 'hotelChanged': return `玩家 ${event.playerId.split('-')[1]}住宿${event.remaining === 128 ? '下次行动解除' : `剩余${event.remaining}次行动`}`;
      case 'g3Resolved': return `玩家 ${event.sourceId.split('-')[1]}使用${itemName(event.itemId)} → 玩家 ${event.targetId.split('-')[1]}`;
      case 'attackResolved': return `${prefix}${itemName(event.itemId)}${event.targetId ? `对玩家 ${event.targetId.split('-')[1]}生效` : '未生效'}`;
      case 'inventoryTransferred': return `玩家 ${event.sourceId.split('-')[1]}失去${itemName(event.itemId)}；玩家 ${event.targetId.split('-')[1]}${event.received ? '收取' : '已满无法收取'}${event.discarded ? `，丢弃${itemName(event.discarded)}` : ''}`;
      case 'allianceChanged': return `${event.players.map(id => '玩家 ' + id.split('-')[1]).join('与')}：${event.reason}${event.remaining ? '（期限7）' : ''}`;
      case 'reactionOffered': return `等待玩家 ${event.decision.responderId.split('-')[1]}决定是否使用${event.decision.stage === 'free' ? '免费卡' : '嫁祸卡'}`;
      case 'reactionAnswered': return `玩家 ${event.responderId.split('-')[1]}${event.choice === 'use' ? '使用' : '保留'}${event.stage === 'free' ? '免费卡' : '嫁祸卡'}`;
      case 'effectConsumed': return `${prefix}使用${G7_GOODS.find(g => g.id === event.itemId)?.name ?? G6_GOODS.find(g => g.id === event.itemId)?.name ?? G5_GOODS.find(g => g.id === event.itemId)?.name ?? G4_GOODS.find(g => g.id === event.itemId)?.name ?? G3_GOODS.find(g => g.id === event.itemId)?.name ?? G2_GOODS.find(g => g.id === event.itemId)?.name ?? G1_GOODS.find(g => g.id === event.itemId)?.name ?? (event.itemId === WEALTH_CARD ? '均富卡' : event.itemId === EQUAL_CASH ? '均贫卡' : ROAD_GOODS.find(g => g.id === event.itemId)?.name ?? (event.itemId === REMOTE_DICE ? '遥控骰子' : '机器工人'))}`;
      case 'g1Resolved': return `${prefix}使用${G1_GOODS.find(g => g.id === event.itemId)!.name} · ${event.option.title} · ${event.option.detail}`;
      case 'wealthEqualized': return `${prefix}用均富卡平均 ${event.participants.length} 位玩家现金，每人 ${event.average.toLocaleString()} 元，取整舍弃 ${event.discarded} 元`;
      case 'cashEqualized': return `${prefix}用均贫卡与${this.manifest.characters.find(c => c.id === state.players.find(p => p.id === event.targetId)!.characterId)!.name}平均现金，双方各 ${event.average.toLocaleString()} 元${event.discarded ? '（取整损失 1 元）' : ''}`;
      case 'roadblockPlaced': return `${prefix}在 ${event.node} 号路格放置路障`;
      case 'roadblockStopped': return `${prefix}被路障截停，停止剩余 ${event.discarded} 步`;
      case 'robotCleared': return `${prefix}机器娃娃清路九格，移除 ${event.cleared.length} 个路障（${event.path.join(' → ')}）`;
      case 'propertyBuilt': return `${prefix}用机器工人将${PROPERTY_CATALOG.properties.find(p => p.id === event.propertyId)?.name ?? event.propertyId}从 ${event.fromLevel} 级建到 ${event.level} 级`;
      case 'g2Resolved': return `${prefix}使用${G2_GOODS.find(g => g.id === event.itemId)?.name}：${event.option.detail}`;
      case 'mobilityChanged': return `玩家 ${event.targetId.split('-')[1]} · ${event.reason} · ${mobilityText(event.mobility, event.targetId === state.players[state.active].id)}`;
      case 'dateAdvanced': return `${event.date} · ${event.closed||'交易日'}`;
      case 'monthlyInterest': return `${event.date} 月息到账：${event.rows.map(r=>`玩家${r.playerId.split('-')[1]}${r.debt?'有贷款停息':`＋${r.amount}元`}`).join('、')}`;
      case 'loanDateChanged': return `玩家${event.targetId.split('-')[1]}贷款${event.due?`到期日 ${event.due}`:'已清偿，到期日解除'}`;
      case 'loanNotice': return `玩家${event.notice.playerId.split('-')[1]}${event.notice.kind==='reminder'?`贷款还有${event.notice.days}天到期`:`贷款到期：存款${event.notice.bank}＋现金${event.notice.cash}元，未付${event.notice.unpaid}元`}`;
      case 'turnSkipped': return `${prefix}因${{stop:'停留',winter:'冬眠',prison:'监禁',hospital:'住院',hotel:'住宿',travel:'旅行离场'}[event.reason]}暂停本次移动，不结算落点`;
      case 'diceRolled': return `${prefix}骰子 ${event.values.join(' + ')} = ${event.total} 步`;
      case 'rentWaived': return `${prefix}免付本次租金：${event.reason ?? '业主处于冬眠、梦游或设施停留状态'}`;
      case 'itemBought': return `${prefix}花费 ${event.cost} 点购买${G7_GOODS.find(g => g.id === event.itemId)?.name ?? G6_GOODS.find(g => g.id === event.itemId)?.name ?? G5_GOODS.find(g => g.id === event.itemId)?.name ?? G4_GOODS.find(g => g.id === event.itemId)?.name ?? G3_GOODS.find(g => g.id === event.itemId)?.name ?? G2_GOODS.find(g => g.id === event.itemId)?.name ?? G1_GOODS.find(g => g.id === event.itemId)?.name ?? (event.itemId === WEALTH_CARD ? '均富卡' : event.itemId === EQUAL_CASH ? '均贫卡' : ROAD_GOODS.find(g => g.id === event.itemId)?.name ?? '遥控骰子')}`;
      case 'pointsAwarded': return `${prefix}获得 ${event.amount} 点，现有 ${event.balance} 点`;
      case 'shopOffered': return `${prefix}到达三越百货`;
      case 'rolled': return `${prefix}掷出 ${event.value} 点`;
      case 'branchChosen': return `${prefix}选择 ${event.node} 号方向`;
      case 'landed': return `${prefix}停在 ${event.node} 号路格`;
      case 'propertySettled': return `${prefix}${{ buy: '买入', upgrade: '升级', rent: '支付租金' }[event.operation]} · ${PROPERTY_CATALOG.properties.find((p) => p.id === event.propertyId)?.name} · ${event.amount.toLocaleString()} 元${event.operation === 'rent' ? '（入账对方存款）' : ''}`;
      case 'propertySkipped': return `${prefix}放弃本次购买或升级`;
      case 'bankOffered': return `${prefix}${event.decision.arrival === 'passing' ? '经过' : '到达'}富士銀行`;
      case 'bankTransferred': return `${prefix}${event.operation === 'deposit' ? '存入' : '取出'} ${event.amount.toLocaleString()} 元`;
      case 'debtSettled': return `${prefix}支付剩余资金 ${event.amount.toLocaleString()} 元，未偿付 ${event.unpaid.toLocaleString()} 元`;
      case 'bankrupt': return `${prefix}破产退出，${event.released.length} 块地产恢复待售`;
      case 'gameEnded': return `本局结束 · ${this.manifest.characters.find((c) => c.id === state.players.find((p) => p.id === event.winnerId)!.characterId)!.name}获胜`;
      case 'turnStarted': return `${prefix}开始行动`;
      default: return null;
    }
  }

  operateSales(action:SaleAction){return this.send(action).ok;}

  private send(action: Action, playerId?: string, automatic=false): import('./engine').Result {
    if(this.disposed)return {ok:false,reason:'illegal-action'};
    const state = this.engine.state;
    const actor=playerId??state.players[state.active].id;
    if(!automatic&&action.type!=='pause'&&action.type!=='animationDone'&&!(action.type==='minigame'&&action.input.kind==='tick')&&this.isComputer(actor,state))return {ok:false,reason:'wrong-player'};
    const result = this.engine.dispatch({ id: `command-${++this.commandSerial}`, gameId: state.gameId,
      expectedRevision: state.revision, playerId: playerId ?? state.players[state.active].id, action });
    if (result.ok) {
      if(this.options.computerPolicy==='research-v1')this.researchMemory=observeResearch(this.researchMemory,state,action,this.engine.state,result.events);
      this.computerWait={key:'',elapsed:0};
      for (const event of result.events) {
        const text = this.eventText(event, this.engine.state);
        if (text) this.recentEvents.push(text);
      }
      this.recentEvents = this.recentEvents.slice(-8);
      this.publish(result.events, state);
    }
    return result;
  }

  private project(): SessionSnapshot {
    if (this.sandbox) return { ...this.sandbox.snapshot(), mode: 'sandbox',
      participants: this.manifest.characters.map((_, i) => i), seed: this.options.seed,
      turn: 0, round: 0, revision: 0, nextName: '', recentEvents: [], finance: null, bankDecision: null, debtDecision: null, eliminated: [], economy: null, decision: null, currentPropertyId: null };
    const state = this.engine.state;
    // Presentation only: retain the old serialized decision scopes for replay compatibility.
    if((this.options.mode === 'batches' || (this.options.mode === 'magic' || (this.options.mode === 'magicActions' || (this.options.mode === 'magicNested' || (this.options.mode === 'siteServices' || (this.options.mode === 'shopAcquisition' || (this.options.mode === 'minigames' || (this.options.mode === 'stockMarket' || (this.options.mode==='stockLedger' || (this.options.mode === 'stockCircuit' || (this.options.mode === 'godPairs' || (this.options.mode === 'specialObjects' || this.options.mode === 'surrender'))))))))))))&&(state.pending?.kind==='fortune'||(state.pending?.kind==='news'&&![12,13].includes(state.pending.newsId))))state.pending.scope='公司、保险与日期经营已接入；租金、公司费、命运罚款、新闻税、负分红和到期贷款支持退出处置。其他资产挂牌、特殊角色及原转盘/魔法屋仍保留。';
    const participants = state.players.map((p) => this.manifest.characters.findIndex((c) => c.id === p.characterId));
    const active = participants[state.active];
    const actors: Actor[] = this.manifest.characters.map((_, index) => {
      const player = state.players.find((p) => p.characterId === this.manifest.characters[index].id);
      const node = this.nodes.get(player?.node ?? this.manifest.map.nodes[0].id)!;
      const previous = player?.previous ? this.nodes.get(player.previous) : null;
      const actor = { node: node.id, previous: player?.previous ?? null, x: node.x, y: node.y,
        direction: (player && state.g1?.facing[player.id]) ?? (previous ? directionFor(node.x - previous.x, node.y - previous.y) : 4) };
      const m = player && state.g2?.players[player.id];
      const location = m && (m.prison ? this.manifest.map.scenery.find(s => s.name === '監獄') : m.hospital ? this.manifest.map.scenery.find(s => s.name === '醫院') : undefined);
      if (location) { actor.x = location.x; actor.y = location.y; }
      if (index === active && state.pending?.kind === 'segment') {
        const to = this.nodes.get(state.pending.to)!;
        const progress = this.animation.token === state.pending.id
          ? Math.min(this.animation.elapsed / this.duration(node.id, to.id), 1) : 0;
        actor.x += (to.x - node.x) * progress; actor.y += (to.y - node.y) * progress;
        actor.direction = directionFor(to.x - node.x, to.y - node.y);
      }
      return actor;
    });
    const name = this.manifest.characters[active].name;
    const nextIndex = nextSolventIndex(state.players.map((p) => p.id), state.finance?.eliminated ?? [], state.active);
    const nextName = nextIndex >= 0 ? this.manifest.characters[participants[nextIndex]].name : '';
    const eliminated = state.players.flatMap((p, i) => state.finance?.eliminated.includes(p.id) ? [participants[i]] : []);
    const definition = PROPERTY_CATALOG.properties.find((p) => p.nodeIds.includes(actors[active].node));
    if((this.options.mode === 'magic' || (this.options.mode === 'magicActions' || (this.options.mode === 'magicNested' || (this.options.mode === 'siteServices' || (this.options.mode === 'shopAcquisition' || (this.options.mode === 'minigames' || (this.options.mode === 'stockMarket' || (this.options.mode==='stockLedger' || (this.options.mode === 'stockCircuit' || (this.options.mode === 'godPairs' || (this.options.mode === 'specialObjects' || this.options.mode === 'surrender')))))))))))&&(state.pending?.kind==='fortune'||state.pending?.kind==='news'))state.pending.scope='公司、保险、日期和破产批次已接入；魔法屋开放六种效果，剩余六种、原转盘动画、其他资产挂牌和特殊角色待补。';
    const decision = state.pending?.kind === 'property' ? state.pending : null;
    const bankDecision = state.pending?.kind === 'bank' ? state.pending : null;
    const debtDecision = state.pending?.kind === 'debt' ? state.pending : null;
    const mobility = state.g2?.players[state.players[state.active].id];
    const reaction = state.pending?.kind === 'reaction' ? state.pending : null;
    const auction = state.pending?.kind === 'auction' ? state.pending : null;
    if((this.options.mode === 'magicActions' || (this.options.mode === 'magicNested' || (this.options.mode === 'siteServices' || (this.options.mode === 'shopAcquisition' || (this.options.mode === 'minigames' || (this.options.mode === 'stockMarket' || (this.options.mode==='stockLedger' || (this.options.mode === 'stockCircuit' || (this.options.mode === 'godPairs' || (this.options.mode === 'specialObjects' || this.options.mode === 'surrender'))))))))))&&(state.pending?.kind==='fortune'||state.pending?.kind==='news'))state.pending.scope='魔法屋已开放十种效果；三连命运、当格拍卖、其他地点、原转盘、特殊角色与原终局待补。';
    if((this.options.mode === 'magicNested' || (this.options.mode === 'siteServices' || (this.options.mode === 'shopAcquisition' || (this.options.mode === 'minigames' || (this.options.mode === 'stockMarket' || (this.options.mode==='stockLedger' || (this.options.mode === 'stockCircuit' || (this.options.mode === 'godPairs' || (this.options.mode === 'specialObjects' || this.options.mode === 'surrender')))))))))&&(state.pending?.kind==='fortune'||state.pending?.kind==='news'))state.pending.scope='魔法屋十二项候选效果已接入；小游戏、其他地点、原转盘、其他资产挂牌和特殊角色待补。';
    if((this.options.mode === 'siteServices' || (this.options.mode === 'shopAcquisition' || (this.options.mode === 'minigames' || (this.options.mode === 'stockMarket' || (this.options.mode==='stockLedger' || (this.options.mode === 'stockCircuit' || (this.options.mode === 'godPairs' || (this.options.mode === 'specialObjects' || this.options.mode === 'surrender'))))))))&&(state.pending?.kind==='fortune'||state.pending?.kind==='news'))state.pending.scope='魔法屋十二项、监狱/医院探访和商店卖出已接入；随机货架/经营者赠品、小游戏、原转盘、其他资产挂牌、特殊角色及原终局待补。';
    if((this.options.mode === 'shopAcquisition' || (this.options.mode === 'minigames' || (this.options.mode === 'stockMarket' || (this.options.mode==='stockLedger' || (this.options.mode === 'stockCircuit' || (this.options.mode === 'godPairs' || (this.options.mode === 'specialObjects' || this.options.mode === 'surrender')))))))&&(state.pending?.kind==='fortune'||state.pending?.kind==='news'))state.pending.scope='设施探访、商店赠品/随机货架/买卖和魔法屋十二项已接入；三个小游戏、原转盘、其他资产挂牌、特殊角色及原终局待补。';
    const message = state.phase==='minigame'?'小游戏进行中，完成后返回当前回合。':state.phase === 'magic' ? '魔法屋：先抽取目标组，再选择一种效果。' : state.phase === 'company' ? '公司营业已结算，请查看账单后继续。' : state.phase === 'fortune' ? (state.pending?.kind === 'fortune' && state.pending.collection ? '命运取卡尚未完成，请逐位选择。' : '命运已结算，请查看变化后继续回合。') : state.phase === 'news' ? '新闻已结算，请查看变化后继续回合。' : auction ? `请玩家 ${auction.responderId.split('-')[1]}出价或退出竞价。` : reaction ? `请玩家 ${reaction.responderId.split('-')[1]}应答，当前行动保持不变。` : mobility && (mobility.prison || mobility.hospital || mobility.winter) ? `${name} · ${mobilityText(mobility, true)}，本次暂停行动，请交给下一位。`
      : mobility?.dream && state.phase === 'idle' ? `${name}梦游中，点击出发；岔路自动选择，无法使用卡片或道具。`
      : state.phase === 'finished' ? '本局已结束，可以查看资产汇总或开启新局。'
      : state.phase === 'effect' ? `${name}正在${[...G1_GOODS, ...G2_GOODS, ...G3_GOODS, ...G4_GOODS, ...G5_GOODS, ...G6_GOODS, ...G7_GOODS].some(g => g.effect === state.effects?.pending?.definitionId) ? '预览卡片结算' : state.effects?.pending?.definitionId === WEALTH_EFFECT ? '预览均富卡全员现金结算' : state.effects?.pending?.definitionId === EQUAL_CASH_EFFECT ? '选择均贫卡目标' : state.effects?.pending?.definitionId === ROBOT_EFFECT ? '确认机器娃娃清路路线' : state.effects?.pending?.definitionId === ROADBLOCK_EFFECT ? '选择路障放置位置' : [WORKER_EFFECT, NEARBY_WORKER_EFFECT].includes(state.effects?.pending?.definitionId ?? '') ? '选择机器工人建造目标' : '选择遥控骰子点数'}，取消不会消耗道具。`
      : state.phase === 'shop' ? `${name}在三越百货，可以使用点数补购道具。`
      : bankDecision ? `${name}在银行办理存取款，离开后${state.remaining ? `继续前进 ${state.remaining} 步` : '结束本回合'}。`
      : debtDecision ? `${name}资金不足，请确认债务与破产清算。`
      : eliminated.includes(active) ? `${name}已破产，下一位是${nextName}。`
      : state.phase === 'idle' ? `轮到${name}，请掷骰。`
      : state.phase === 'rolling' ? `${name}掷骰中…`
      : state.phase === 'choosing' ? `还有 ${state.remaining} 步，请${name}选择前进方向。`
      : state.phase === 'moving' ? `${name}前进中…`
      : decision ? `${name}到达${definition?.name}，请处理地产决策。`
      : definition?.kind === 'facility' && state.economy && !state.g4 ? `${definition.name}是大型用地，专属建筑玩法尚未开放，可交给${nextName}。`
      : `${name}到达 ${actors[active].node} 号路格，确认后交给${nextName}。`;
    const responder=decisionPlayer(state),automatic=this.isComputer(responder,state);
    return { ...(this.options.computerIds?.length?{computer:{policy:this.options.computerPolicy??COMPUTER_POLICY,ids:[...this.options.computerIds],playerId:responder,automatic,reason:automatic?(decideComputer(state,this.manifest.map.nodes,this.options.computerPolicy,this.researchMemory)?.reason??'等待当前动画完成'):'等待人类操作',error:this.computerError,lastReason:this.lastComputerReason}}:{}),active, actors, phase: state.phase, paused: state.paused, dice: state.dice,
      remaining: state.remaining, choices: state.pending?.kind === 'branch' ? state.pending.choices : [],
      canSurrender:canSurrender(state),surrenderDecision:state.pending?.kind==='surrender'?state.pending:null,
      completed: state.completed, message, mode: this.options.mode, participants, seed: state.seed,
      turn: state.turn, round: state.finance?.round ?? Math.floor((state.turn - 1) / participants.length) + 1,
      workerTargets: (state.rulesId === NEARBY_RULES.id || (state.rulesId === ROAD_RULES.id || (state.rulesId === CARD_RULES.id || (state.rulesId === WEALTH_RULES.id || (state.rulesId === G1_RULES.id || (state.rulesId === G2_RULES.id || (state.rulesId === G3_RULES.id || (state.rulesId === G4_RULES.id || (state.rulesId === G5_RULES.id || (state.rulesId === G6_RULES.id || (state.rulesId === G7_RULES.id || (state.rulesId === MAP_EVENT_RULES.id || (state.rulesId === NEWS_RULES.id || (state.rulesId === PROPERTY_NEWS_RULES.id || (state.rulesId === OPERATING_NEWS_RULES.id || (state.rulesId === STATUS_NEWS_RULES.id || (state.rulesId === COMPLETE_NEWS_RULES.id || (state.rulesId === FORTUNE_RULES.id || (state.rulesId === ASSET_FORTUNE_RULES.id || (state.rulesId === TRAFFIC_FORTUNE_RULES.id || (state.rulesId === FINAL_FORTUNE_RULES.id || (state.rulesId === CALENDAR_RULES.id || (state.rulesId === LOTTERY_RULES.id || (state.rulesId === DIVIDEND_RULES.id || (state.rulesId === COMPANY_RULES.id || (state.rulesId === COMMERCE_RULES.id || (state.rulesId === 'japan-events-candidate-v29' || (state.rulesId === 'japan-events-candidate-v30' || (state.rulesId === 'japan-events-candidate-v31' || (state.rulesId === 'japan-events-candidate-v32' || (state.rulesId === 'japan-events-candidate-v33' || (state.rulesId === 'japan-events-candidate-v34' || (state.rulesId === 'japan-events-candidate-v35' || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))))))))))) && state.economy
        ? nearbyWorkerTargets(this.nodes.get(state.players[state.active].node)!, PROPERTY_CATALOG.properties, state.economy.properties) : [],
      insuranceDecision:state.pending?.kind==='insurance'?state.pending:null,commerceDecision:state.pending?.kind==='construction'||state.pending?.kind==='subscription'?state.pending:null,companyDecision:state.pending?.kind==='company'?state.pending:null,lottery:state.lottery,lotteryDecision:state.pending?.kind==='lottery'?state.pending:null,salesAvailable:salesAvailable(state),calendar: state.calendar, news: state.news, loanLimit:state.news?.business?loanCapacity(state,state.players[state.active].id,PROPERTY_CATALOG.properties):undefined,
      magicNested: state.magic?.nested??null,
      shopSales:(state.rulesId===SITE_SERVICES_RULES.id || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47'))))))))?saleOptions(state):undefined, siteServices:state.siteServices, facilityDecision:state.pending?.kind==='facility'?state.pending:null,
      minigame:state.pending?.kind==='minigame'?state.pending:null,
      magicDecision: state.pending?.kind==='magic'?state.pending:null,
      fortuneDecision: state.pending?.kind === 'fortune' ? state.pending : null,
      newsDecision: state.pending?.kind === 'news' ? state.pending : null,
      g7: state.g7 ? { checkpoint: state.g7.checkpoints[state.players[state.active].id] ? { turn: state.g7.checkpoints[state.players[state.active].id]!.turn, round: state.g7.checkpoints[state.players[state.active].id]!.round } : null } : undefined,
      g7Choices: state.g7 ? Object.fromEntries(G7_GOODS.map(g => [g.id, g7Options(state, this.manifest.map.nodes, PROPERTY_CATALOG.properties, g.id)])) : {},
      g6: state.g6, canTrade: marketAvailable(state), g6Choices: state.g6 ? Object.fromEntries(G6_GOODS.map(g => [g.id, g6Options(state, this.manifest.map.nodes, g.id)])) : {},
      g5: state.g5, researchChoices: researchOptions(state, PROPERTY_CATALOG.properties), g5Choices: state.g5 ? Object.fromEntries(G5_GOODS.map(g => [g.id, g5Options(state, this.manifest.map.nodes, PROPERTY_CATALOG.properties, g.id)])) : {},
      g4: state.g4, auction, g4Choices: state.g4 ? Object.fromEntries(G4_GOODS.map(g => [g.id, g4Options(state, this.manifest.map.nodes, PROPERTY_CATALOG.properties, g.id)])) : {},
      g3: state.g3, reaction,
      g3Choices: state.g3 ? Object.fromEntries(G3_GOODS.map(g => [g.id, g3Options(state, this.manifest.map.nodes, g.id)])) : {},
      g2: state.g2,
      g2Choices: state.g2 ? Object.fromEntries(G2_GOODS.map(g => [g.id, g2Options(state, this.manifest.map.nodes, g.id)])) : {},
      g1: state.g1,
      g1Choices: state.g1 ? Object.fromEntries(G1_GOODS.map(g => [g.id, g1Options(state, this.manifest.map.nodes, PROPERTY_CATALOG.properties, g.id)])) : {},
      wealth: state.wealth,
      wealthPlayers: state.wealth ? wealthParticipants(state.players, state.finance?.eliminated ?? []).map(id => ({ id,
        name: this.manifest.characters.find(c => c.id === state.players.find(p => p.id === id)!.characterId)!.name,
        cash: state.economy!.balances[id].cash })) : [],
      cards: state.cards,
      cardTargets: state.cards ? equalCashTargets(state.players, state.active, [...(state.finance?.eliminated ?? []), ...state.players.filter(p => detained(state.g2?.players[p.id]) || !!state.g4?.hotel[p.id]).map(p => p.id)], this.manifest.map.nodes).map(id => {
        const player = state.players.find(p => p.id === id)!;
        return { id, characterId: player.characterId, name: this.manifest.characters.find(c => c.id === player.characterId)!.name };
      }) : [],
      roadTools: state.roadTools,
      roadTargets: state.roadTools ? roadblockTargets(this.nodes.get(state.players[state.active].node)!, this.manifest.map.nodes, state.roadTools.blocks.concat(state.g5?.hazards.filter(h => !h.carrier).map(h => h.node) ?? [])) : [],
      robotRoute: state.roadTools ? robotPath(this.manifest.map.nodes, state.players[state.active].node, state.players[state.active].previous) : [],
      revision: state.revision, nextName, recentEvents: [...this.recentEvents],
      finance: state.finance ?? null, bankDecision, debtDecision, eliminated,
      items: state.items ?? null, effects: state.effects ?? null, shopDecision: state.pending?.kind === 'shop' ? state.pending : null,
      economy: state.economy ?? null, decision, currentPropertyId: state.economy ? definition?.id ?? null : null };
  }

  private duration(from: number, to: number) {
    const a = this.nodes.get(from)!, b = this.nodes.get(to)!;
    return Math.max(240, Math.hypot(b.x - a.x, b.y - a.y) / 115 * 1000);
  }

  private isComputer(id:string,state:GameState){return !!this.options.computerIds?.includes(state.players.find(p=>p.id===id)!.characterId);}
  retryComputer(){if(this.disposed)return;this.computerError=null;this.computerWait={key:'',elapsed:0};this.publish();}
  dispose(){this.onPresentation=()=>undefined;this.disposed=true;this.computerWait={key:'',elapsed:0};this.onChange=()=>undefined;if(this.sandbox)this.sandbox.onChange=()=>undefined;}

  tick(milliseconds: number) {
    if(this.disposed)return;
    if (this.sandbox) { this.sandbox.tick(milliseconds); this.view = this.project(); return; }
    const state = this.engine.state;
    if (state.phase==='finished'||state.paused || !Number.isFinite(milliseconds) || milliseconds <= 0) return;
    const pending = state.pending;
    if(this.isComputer(decisionPlayer(state),state)&&(!pending||!['roll','segment'].includes(pending.kind))){
      if(this.computerError)return;
      const key=state.gameId+':'+state.revision;
      if(this.computerWait.key!==key)this.computerWait={key,elapsed:0};
      this.computerWait.elapsed+=Math.min(milliseconds,50);
      if(this.computerWait.elapsed<COMPUTER_DELAY)return;
      const decision=decideComputer(state,this.manifest.map.nodes,this.options.computerPolicy,this.researchMemory);
      if(!decision){this.computerError='电脑无法处理当前决策，请暂停或重新开始。';this.publish();return;}
      this.lastComputerReason=decision.reason;
      const result=this.send(decision.action,decision.playerId,true);
      if(!result.ok){this.computerError='电脑操作被拒绝（'+result.reason+'），已停止自动操作。';this.publish();}
      return;
    }
    if(pending?.kind==='minigame'){if(pending.stage!=='playing')return;if(this.animation.token!==pending.id)this.animation={token:pending.id,elapsed:0};this.animation.elapsed+=Math.min(milliseconds,50);const duration=pending.game==='sky'?50:100;if(this.animation.elapsed>=duration){this.animation.elapsed-=duration;this.send({type:'minigame',decisionId:pending.id,input:{kind:'tick'}});}return;}
    if (!pending || (pending.kind !== 'roll' && pending.kind !== 'segment')) return;
    if (this.animation.token !== pending.id) this.animation = { token: pending.id, elapsed: 0 };
    this.animation.elapsed += Math.min(milliseconds, 50);
    const duration = pending.kind === 'roll' ? 650 : this.duration(pending.from, pending.to);
    if (this.animation.elapsed >= duration) this.send({ type: 'animationDone', token: pending.id });
    else this.view = this.project();
  }

  surrender() { return this.send({type:'surrender'}); }
  chooseDeath(decisionId:string,targetId:string|null) { return this.send({type:'chooseDeath',decisionId,targetId},this.view.surrenderDecision?.sourceId); }
  bid(decisionId: string, increment: number | null) { if (!this.sandbox) return this.send({ type: 'auction', decisionId, increment }, this.view.auction?.responderId); }
  react(decisionId: string, choice: 'use' | 'decline', targetId?: string) {
    if (!this.sandbox) return this.send({ type: 'reaction', decisionId, choice, ...(targetId ? { targetId } : {}) }, this.view.reaction?.responderId);
  }
  roll() {
    if (this.sandbox) {
      // The sandbox retains manual inspection; its random outcomes are not replay records.
      let value: number;
      do { value = crypto.getRandomValues(new Uint8Array(1))[0]; } while (value >= 252);
      this.sandbox.roll(value % 6 + 1);
    } else this.send({ type: 'roll' });
  }
  choose(node: number) {
    if (this.sandbox) { this.sandbox.choose(node); return; }
    const pending = this.engine.state.pending;
    if (pending?.kind === 'branch') this.send({ type: 'choose', decisionId: pending.id, node });
  }
  pause(value: boolean) {
    if (this.sandbox) this.sandbox.pause(value);
    else this.send({ type: 'pause', value });
  }
  decide(decisionId: string, accept: boolean, buildingType?: number) {
    if (!this.sandbox) return this.send({ type: 'property', decisionId, accept, ...(buildingType !== undefined ? { buildingType } : {}) }, this.view.decision?.payerId);
  }
  loan(decisionId:string,operation:'borrow'|'repay',amount:number){return this.send({type:'loan',decisionId,operation,amount}).ok;}
  transfer(decisionId: string, operation: 'deposit' | 'withdraw', amount: number) {
    if (!this.sandbox) return this.send({ type: 'bank', decisionId, operation, amount });
  }
  leaveBank(decisionId: string) { if (!this.sandbox) return this.send({ type: 'leaveBank', decisionId }); }
  settleDebt(decisionId: string) { if (!this.sandbox) return this.send({ type: 'settleDebt', decisionId }, this.view.debtDecision?.payerId); }
  trade(stockId: string, side: 'buy' | 'sell', quantity: number) { if (!this.sandbox) return this.send({ type: 'stockTrade', stockId, side, quantity }); }
  research(propertyId: string, itemId: string) { if (!this.sandbox) return this.send({ type: 'research', propertyId, itemId }); }
  collectFortuneCard(decisionId:string,itemId:string|null) { if(!this.sandbox)return this.send({type:'collectFortuneCard',decisionId,itemId}); }
  minigame(decisionId:string,input:MiniInput){return this.send({type:'minigame',decisionId,input});}
  magicBuild(decisionId:string,buildingType:number){return this.send({type:'magicBuild',decisionId,buildingType},this.view.magicDecision?.responderId);}
  magic(decisionId:string,effect?:number){return this.send({type:'magic',decisionId,...(effect===undefined?{}:{effect})});}
  spinInsurance(decisionId:string){return this.send({type:'spinInsurance',decisionId});}
  constructCompany(decisionId:string,propertyId:string|null,buildingType?:number){if(!this.sandbox)return this.send({type:'constructCompany',decisionId,propertyId,...(buildingType===undefined?{}:{buildingType})});}
  subscribeCompany(decisionId:string,quantity:number|null){if(!this.sandbox)return this.send({type:'subscribeCompany',decisionId,quantity});}
  ackCompany(decisionId:string){if(!this.sandbox)return this.send({type:'ackCompany',decisionId});}
  buyLottery(decisionId:string,number:number){if(!this.sandbox)return this.send({type:'buyLottery',decisionId,number});}
  leaveLottery(decisionId:string){if(!this.sandbox)return this.send({type:'leaveLottery',decisionId});}
  acknowledgeFortune(decisionId:string) { if (!this.sandbox) return this.send({type:'ackFortune',decisionId}); }
  acknowledgeNews(decisionId:string) { if (!this.sandbox) return this.send({type:'ackNews',decisionId}); }
  useItem(action: EffectAction, value?: number, stolenItemId?: string) { if (!this.sandbox) return this.send({ type: 'item', action, value, ...(stolenItemId ? { stolenItemId } : {}) }); }
  facility(decisionId:string,targetId:string|null){return this.send({type:'facility',decisionId,targetId});}
  sellItem(decisionId:string,itemId:string){return this.send({type:'sellItem',decisionId,itemId});}
  buyItem(decisionId: string, itemId: string = REMOTE_DICE) { if (!this.sandbox) return this.send({ type: 'buyItem', decisionId, itemId }); }
  leaveShop(decisionId: string) { if (!this.sandbox) return this.send({ type: 'leaveShop', decisionId }); }
  traffic(diceCount: number, dismount = false) { if (!this.sandbox) return this.send({ type: 'traffic', diceCount, dismount }); }
  endTurn() { if (!this.sandbox) this.send({ type: 'endTurn' }); }
  select(index: number) { this.sandbox?.select(index); }
  visitJunction() { this.sandbox?.visitJunction(); }
  reset() { this.start(this.options); }
}
