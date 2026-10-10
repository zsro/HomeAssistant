import {SURRENDER_RULES,SURRENDER_FINGERPRINT,canSurrender,resumeSurrender,chooseDeath,type SurrenderDecision,type SurrenderEvent} from './surrender';
import {SPECIAL_OBJECT_RULES,SPECIAL_OBJECT_FINGERPRINT} from './special-objects-rules';
import {encounterSpecialObject,refreshSpecialObjects,type SpecialObjectEvent} from './special-objects';
import {GOD_PAIRS_RULES,GOD_PAIRS_FINGERPRINT} from './god-pairs-rules';
import {removePlayerGod} from './god-pairs';
import {STOCK_CIRCUIT_RULES,STOCK_CIRCUIT_FINGERPRINT} from './stock-circuit-rules';
import {STOCK_LEDGER_RULES,STOCK_LEDGER_FINGERPRINT} from './stock-ledger-rules';
import {STOCK_MARKET_RULES,STOCK_MARKET_FINGERPRINT} from './stock-market-rules';
import type {StockMarketEvent} from './stock-market';
import {MINIGAME_RULES,MINIGAME_FINGERPRINT,offerMinigame,actMinigame} from './minigames';
import type {MiniDecision,MiniInput,MiniEvent} from './minigames';
import {SHOP_ACQUISITION_RULES,SHOP_ACQUISITION_FINGERPRINT,prepareShop,buyFromShelf} from './shop-acquisition';
import type {ShopAcquisitionEvent} from './shop-acquisition';
import {SITE_SERVICES_RULES,SITE_SERVICES_FINGERPRINT,offerFacility,actFacility,sellItem,noteShopPurchase,closeShopLedger} from './site-services';
import type {FacilityDecision,SiteServicesState,SiteServiceEvent} from './site-services';
import {MAGIC_NESTED_RULES,MAGIC_NESTED_FINGERPRINT,operateMagicNested,advanceMagicNested,ackNestedFortune,captureMagicNested} from './magic-nested';
import {MAGIC_ACTIONS_RULES,MAGIC_ACTIONS_FINGERPRINT,reactMagic,buildMagic} from './magic-actions';
import {MAGIC_RULES,MAGIC_FINGERPRINT,offerMagic} from './magic-house';
import type {MagicDecision,MagicState,MagicEvent} from './magic-house';
import {BATCH_RULES,BATCH_FINGERPRINT,beginDividendBatch,advanceBatch} from './payment-batches';
import type {BatchEvent} from './payment-batches';
import type {PaymentEvent} from './payments';
import {PAYMENT_RULES,PAYMENT_FINGERPRINT,startQueuedPayment,resumePayment} from './payments';
import {DISPOSAL_RULES,DISPOSAL_FINGERPRINT,beginRentDisposal,continueDisposal} from './disposal';
import type {DisposalEvent} from './disposal';
import {ESTATE_RULES,ESTATE_FINGERPRINT,initializeSales,pruneSales,ageSales,operateSales} from './estate-sales';
import type {SaleAction,SaleEvent} from './estate-sales';
import {INDEXED_RULES,INDEXED_FINGERPRINT} from './indexed-economy';
import {consumerIndex} from './price-index';
import {DATE_BUSINESS_RULES,DATE_BUSINESS_FINGERPRINT,initializeDateBusiness,updatePriceIndex,settleFestival} from './date-business';
import type {DateBusinessEvent} from './date-business';
import {priceIndex} from './price-index';
import {INSURANCE_RULES,INSURANCE_FINGERPRINT,offerInsurance,spinInsurance} from './insurance';
import {claimInsurance,tickInsurance} from './insurance-state';
import type {InsuranceDecision,InsuranceEvent} from './insurance-state';
import {COMMERCE_FINGERPRINT,offerCommerce,offerSubscription,constructCompany,subscribeCompany} from './commerce';
import type {CommerceDecision,CommerceEvent} from './commerce';
import {COMMERCE_RULES} from './commerce-rules';
import {COMPANY_RULES,COMPANY_FINGERPRINT,offerCompany,reactCompany} from './company-services';
import type {CompanyDecision,CompanyEvent} from './company-services';
import {DIVIDEND_RULES,DIVIDEND_FINGERPRINT,settleDividends} from './dividends';
import type {DividendEvent} from './dividends';
import {LOTTERY_RULES,LOTTERY_FINGERPRINT,initializeLottery,offerLottery,buyLottery,drawLottery,releaseLottery} from './lottery';
import type {LotteryState,LotteryDecision,LotteryEvent} from './lottery';
import {CALENDAR_RULES,CALENDAR_FINGERPRINT,initializeCalendar,advanceCalendar,settleMonthly,checkLoanMaturity,syncLoanDates} from './calendar';
import type {CalendarState,CalendarEvent} from './calendar';
import {FINAL_FORTUNE_RULES,FINAL_FORTUNE_FINGERPRINT,reactFinalFortune} from './final-fortune';
import {TRAFFIC_FORTUNE_RULES,TRAFFIC_FORTUNE_FINGERPRINT,reactTrafficFortune} from './traffic-fortune';
import {ASSET_FORTUNE_RULES, ASSET_FORTUNE_FINGERPRINT, collectFortuneCard} from './asset-fortune';
import { FORTUNE_RULES, FORTUNE_FINGERPRINT, initializeFortune, offerFortune } from './fortune';
import type { FortuneState, FortuneDecision, FortuneEvent } from './fortune';
import { COMPLETE_NEWS_RULES, COMPLETE_NEWS_FINGERPRINT } from './news';
import type { CompleteNewsChanges } from './complete-news';
import { reactProsecution } from './complete-news';
import { bankLoan, cleanCompanies, tickBusinessRound, tickLoans } from './news-business';
import type { StatusNewsChanges } from './status-news';
import type { OperatingNewsChanges } from './operating-news';
import { propertyBase } from './economy';
import type { PropertyNewsChanges } from './property-news';
import { STATUS_NEWS_RULES, STATUS_NEWS_FINGERPRINT, OPERATING_NEWS_RULES, OPERATING_NEWS_FINGERPRINT, PROPERTY_NEWS_RULES, PROPERTY_NEWS_FINGERPRINT, NEWS_RULES, NEWS_FINGERPRINT, initializeNews, offerNews } from './news';
import type { NewsState, NewsDecision } from './news';
import { MAP_EVENT_RULES, MAP_EVENT_FINGERPRINT, settleMapCard } from './map-events';
import { G7_RULES, G7_EFFECTS, G7_FINGERPRINT, saveCheckpoint, g7Options, applyG7 } from './g7';
import type { G7State } from './g7';
import { G7_GOODS } from './g7-catalog';
import { G6_RULES, G6_EFFECTS, G6_FINGERPRINT, initializeG6, g6Options, applyG6, encounterGod, tickGods, replenishGods, attachedGod, godRent, godOwnsLanding, finishGodLanding } from './g6';
import type { G6State } from './g6';
import { G6_GOODS } from './g6-catalog';
import { tradeStock, marketTick, refreshQuota } from './g6-market';
import { G5_RULES, G5_EFFECTS, G5_FINGERPRINT, g5Options, applyG5, g5Entered, g5Landed, clearHazards, researchOptions, reconcileResearch, tickG5, tickEngineer, removeHazard, finishEngineerLanding, reconcileEngineers } from './g5';
import type { G5State, Hazard } from './g5';
import { G5_GOODS } from './g5-catalog';
import { G4_RULES, G4_GOODS, G4_EFFECTS, G4_FINGERPRINT, g4Options, applyG4, bidG4, startPublicAuction, reactTax, tickProperties, maximumLevel, g4RentLines } from './g4';
import type { G4State, AuctionDecision } from './g4';
import { G3_RULES, G3_GOODS, G3_EFFECTS, G3_FINGERPRINT, g3Options, applyG3, syncCardSlots, startAttack, reactG3, offerRent, breakAlliance, hostility, tickAlliance } from './g3';
import type { G3State, ReactionDecision } from './g3';
import { G2_RULES, G2_GOODS, G2_EFFECTS, G2_FINGERPRINT, emptyMobility, g2Options, g2PurchaseReason, applyG2, tickMobility, actionLocked, cannotCollectRent, detained, maxDice } from './g2';
import type { G2State, G2Option, Mobility } from './g2';
import { G1_RULES, G1_GOODS, G1_EFFECTS, G1_FINGERPRINT, g1Options, g1PurchaseReason, g1Adjacent, g1Draw } from './g1';
import type { G1State, G1Option } from './g1';
import { WEALTH_RULES, WEALTH_EFFECTS, WEALTH_FINGERPRINT, WEALTH_CARD, WEALTH_EFFECT, wealthPurchaseReason, wealthParticipants, wealthPreview } from './wealth';
import { CARD_RULES, CARD_EFFECTS, CARD_FINGERPRINT, EQUAL_CASH, EQUAL_CASH_EFFECT, cardPurchaseReason, equalCashPreview, equalCashTargets } from './cards';
import type { CardsState } from './cards';
import { ROAD_RULES, ROAD_EFFECTS, ROAD_FINGERPRINT, ROAD_GOODS, ROBOT, ROADBLOCK, ROBOT_EFFECT, ROADBLOCK_EFFECT, roadblockTargets, robotPath } from './road-tools';
import type { RoadToolsState } from './road-tools';
import { NEARBY_RULES, NEARBY_EFFECTS, NEARBY_FINGERPRINT, NEARBY_WORKER_EFFECT, nearbyWorkerTargets } from './nearby-construction';
import { CONSTRUCTION_RULES, CONSTRUCTION_EFFECTS, CONSTRUCTION_FINGERPRINT, WORKER, WORKER_EFFECT, workerTarget } from './construction';
import { advanceEffects, createEffectState, reduceEffect } from './effects';
import type { EffectAction, EffectContext, EffectEvent, EffectState } from './effects';
import { ITEM_RULES, ITEM_EFFECTS, ITEM_FINGERPRINT, REMOTE_DICE, REMOTE_EFFECT, itemSite } from './items';
import type { ItemsState, ShopDecision } from './items';
import type { MapNode } from '../types';
import { bankTransfer, FINANCE_RULES, isBankNode, nextSolventIndex } from './finance';
import type { BankDecision, DebtDecision, FinanceState } from './finance';
import { drawDice, hashSeed } from './random';
import { ECONOMY_RULES, INITIAL_FUNDS, PROPERTY_CATALOG, paymentSplit, rentLines, validateProperties } from './economy';
import type { Balance, PropertyDecision, PropertyDefinition, PropertyState } from './economy';

export const TURN_RULES = Object.freeze({
  id: 'japan-turns-prototype-v1', version: 1, random: 'mulberry32-rejection-v1',
  evidence: { movement: 'R03-prototype', turnOrder: 'R06-prototype' },
  capabilities: { economy: false, calendar: false, ai: false, persistence: false },
  initialFunds: null, interestRate: null, victory: null,
});

export type GameConfig = { humanIds?:string[]; gameId: string; seed: string; characterIds: string[]; rulesId?: string; initialFunds?: number; startDate?: string };
export type Player = { id: string; characterId: string; node: number; previous: number | null };
export type Pending =
  | { kind: 'roll'; id: string }
  | { kind: 'branch'; id: string; choices: number[] }
  | { kind: 'segment'; id: string; from: number; to: number }
  | SurrenderDecision | MiniDecision | FacilityDecision | MagicDecision | InsuranceDecision | CommerceDecision | CompanyDecision | LotteryDecision | FortuneDecision | NewsDecision | AuctionDecision | ReactionDecision | PropertyDecision | BankDecision | DebtDecision | ShopDecision | { kind: 'effect'; id: string };
export type GamePhase = 'surrender' | 'minigame' | 'facility' | 'magic' | 'idle' | 'rolling' | 'choosing' | 'moving' | 'property' | 'bank' | 'debt' | 'finished' | 'turnEnd' | 'shop' | 'effect' | 'reaction' | 'auction' | 'news' | 'fortune' | 'lottery' | 'company' | 'commerce';
export type GameState = {
  schemaVersion: 1; rulesId: string; mapFingerprint: string; gameId: string; seed: string;
  revision: number; randomState: number; turn: number; active: number; players: Player[];
  phase: GamePhase; paused: boolean; dice: number; remaining: number; completed: number;
  pending: Pending | null; serial: number;
  siteServices?:SiteServicesState; magic?:MagicState; lottery?: LotteryState; calendar?: CalendarState; finance?: FinanceState;
  fortune?: FortuneState; news?: NewsState; g7?: G7State; g6?: G6State; g5?: G5State; g4?: G4State; g3?: G3State; g2?: G2State; g1?: G1State; wealth?: { supply: number }; cards?: CardsState; roadTools?: RoadToolsState; items?: ItemsState; effects?: EffectState;
  economy?: { catalogFingerprint: string; balances: Record<string, Balance>; properties: PropertyState[] };
};
export type Action = {type:'surrender'} | {type:'chooseDeath';decisionId:string;targetId:string|null} | {type:'minigame';decisionId:string;input:MiniInput} | SaleAction
  | {type:'magicBuild';decisionId:string;buildingType:number}
  | {type:'magic';decisionId:string;effect?:number}
  | {type:'spinInsurance';decisionId:string}
  | {type:'constructCompany';decisionId:string;propertyId:string|null;buildingType?:number}
  | {type:'subscribeCompany';decisionId:string;quantity:number|null}
  | {type:'ackCompany';decisionId:string}
  | {type:'buyLottery';decisionId:string;number:number}
  | {type:'leaveLottery';decisionId:string}
  | { type: 'loan'; decisionId:string; operation:'borrow'|'repay'; amount:number }
  | { type: 'stockTrade'; stockId: string; side: 'buy' | 'sell'; quantity: number }
  | { type: 'research'; propertyId: string; itemId: string }
  | { type: 'item'; action: EffectAction; value?: number; stolenItemId?: string }
  | { type: 'auction'; decisionId: string; increment: number | null }
  | { type: 'reaction'; decisionId: string; choice: 'use' | 'decline'; targetId?: string }
  | { type:'facility'; decisionId:string; targetId:string|null }
  | { type:'sellItem'; decisionId:string; itemId:string }
  | { type: 'buyItem'; decisionId: string; itemId: string }
  | { type: 'leaveShop'; decisionId: string }
  | { type: 'traffic'; diceCount: number; dismount?: boolean }
  | { type: 'roll' }
  | { type: 'animationDone'; token: string }
  | { type: 'choose'; decisionId: string; node: number }
  | { type: 'property'; decisionId: string; accept: boolean; buildingType?: number }
  | { type: 'bank'; decisionId: string; operation: 'deposit' | 'withdraw'; amount: number }
  | { type: 'leaveBank'; decisionId: string }
  | { type: 'settleDebt'; decisionId: string }
  | { type:'collectFortuneCard'; decisionId:string; itemId:string|null }
  | { type: 'ackFortune'; decisionId: string }
  | { type: 'ackNews'; decisionId: string }
  | { type: 'endTurn' }
  | { type: 'pause'; value: boolean };
export type Command = {
  id: string; gameId: string; expectedRevision: number; playerId: string; action: Action;
};
export type EventPayload = SurrenderEvent | SpecialObjectEvent | StockMarketEvent | MiniEvent | ShopAcquisitionEvent | SiteServiceEvent | MagicEvent | BatchEvent | PaymentEvent | DisposalEvent | SaleEvent | DateBusinessEvent | InsuranceEvent | CommerceEvent | CompanyEvent | DividendEvent | LotteryEvent | CalendarEvent | EffectEvent | FortuneEvent
  | {type:'loanChanged';targetId:string;operation:'borrow'|'repay'|'writeoff';amount:number;debt:number;balance:Balance}
  | { type: 'newsSkipped'; skipped: number[] }
  | { type: 'newsResolved'; newsId: number; title: string; node: number; skipped: number[]; money: {playerId:string;cashBefore:number;cashAfter:number;bankBefore:number;bankAfter:number}[]; stocks: {id:string;before:number;after:number}[]; publicFund:number; cursor:number; propertyChanges?:PropertyNewsChanges;operatingChanges?:OperatingNewsChanges;statusChanges?:StatusNewsChanges;completeChanges?:CompleteNewsChanges }
  | { type: 'newsAuctionPrepared'; decision:NewsDecision; skipped:number[] }
  | { type: 'mapCardReceived'; node: number; itemId: string | null; discarded: string | null }
  | { type: 'g7Notice'; message: string }
  | { type: 'g6Notice'; message: string }
  | { type: 'stockTraded'; stockId: string; traderId: string; side: 'buy' | 'sell'; quantity: number; price: number; amount: number; forced: boolean }
  | { type: 'g5Notice'; message: string }
  | { type: 'hazardChanged'; hazard: Hazard; removed: boolean; reason: string }
  | { type: 'g4PropertyChanged'; property: PropertyState; reason: string }
  | { type: 'auctionOffered'; decision: AuctionDecision }
  | { type: 'auctionBid'; playerId: string; amount: number | null }
  | { type: 'auctionSettled'; propertyId: string; winnerId: string | null; sourceId: string; amount: number }
  | { type: 'taxSettled'; sourceId: string; payerId: string; amount: number; waived: boolean }
  | { type: 'facilityDrawn'; propertyId: string; count: number; buildingType: number }
  | { type: 'hotelChanged'; playerId: string; remaining: number }
  | { type: 'g3Resolved'; itemId: string; sourceId: string; targetId: string }
  | { type: 'attackResolved'; itemId: string; sourceId: string; originalId: string; targetId: string | null }
  | { type: 'reactionOffered'; decision: ReactionDecision }
  | { type: 'reactionAnswered'; responderId: string; stage: 'free' | 'redirect'; choice: 'use' | 'decline'; targetId?: string }
  | { type: 'allianceChanged'; players: string[]; remaining: number; reason: string }
  | { type: 'allianceTicked'; playerId: string; remaining: number }
  | { type: 'inventoryTransferred'; sourceId: string; targetId: string; itemId: string; discarded: string | null; received: boolean }

  | { type: 'g2Resolved'; itemId: string; option: G2Option }
  | { type: 'mobilityChanged'; targetId: string; mobility: Mobility; reason: string }
  | { type: 'turnSkipped'; reason: 'stop' | 'winter' | 'prison' | 'hospital' | 'hotel' | 'travel' }
  | { type: 'diceRolled'; values: number[]; total: number }
  | { type: 'rentWaived'; propertyId: string; ownerId: string; reason?: string }
  | { type: 'g2SupplyChanged'; itemId: string; amount: number; supply: number }
  | { type: 'g1SupplyChanged'; itemId: string; amount: number; supply: number }
  | { type: 'g1Resolved'; itemId: string; option: G1Option; previous?: number | null }
  | { type: 'wealthSupplyChanged'; amount: number; supply: number }
  | { type: 'wealthEqualized'; participants: { playerId: string; cash: number }[]; average: number; discarded: number }
  | { type: 'cardSupplyChanged'; amount: number; supply: number }
  | { type: 'cashEqualized'; targetId: string; sourceCash: number; targetCash: number; average: number; discarded: number }
  | { type: 'roadblockPlaced'; node: number }
  | { type: 'roadblockRemoved'; node: number; reason: 'stop' | 'robot' | 'missile'; supply: number }
  | { type: 'roadblockStopped'; node: number; discarded: number }
  | { type: 'robotCleared'; path: number[]; cleared: number[] }
  | { type: 'roadSupplyChanged'; itemId: string; amount: number; supply: number }
  | { type: 'propertyBuilt'; propertyId: string; fromLevel: number; level: number; ownerId: string | null }
  | { type: 'pointsAwarded'; node: number; amount: number; balance: number }
  | { type: 'shopOffered'; decision: ShopDecision }
  | { type: 'shopClosed'; node: number }
  | { type: 'itemBought'; itemId: string; cost: number; points: number; supply: number }
  | { type: 'itemSupplyChanged'; amount: number; supply: number }
  | { type: 'pointsCleared'; amount: number }
  | { type: 'rolled'; value: number }
  | { type: 'branchOffered'; decisionId: string; choices: number[] }
  | { type: 'branchChosen'; node: number }
  | { type: 'segmentStarted'; token: string; from: number; to: number }
  | { type: 'nodeEntered' | 'landed'; node: number }
  | { type: 'turnStarted'; nextPlayerId: string }
  | { type: 'paused'; value: boolean }
  | { type: 'propertyOffered'; decision: PropertyDecision }
  | { type: 'bankOffered'; decision: BankDecision }
  | { type: 'bankTransferred'; operation: 'deposit' | 'withdraw'; amount: number; balance: Balance }
  | { type: 'bankClosed'; node: number }
  | { type: 'debtOffered'; decision: DebtDecision }
  | { type: 'debtSettled'; payerId?: string; propertyId: string; recipientId: string; due: number; amount: number; unpaid: number; paid: Balance }
  | { type: 'bankrupt'; payerId?: string; released: string[] }
  | { type: 'gameEnded'; winnerId: string }
  | { type: 'propertySkipped'; propertyId: string }
  | { type: 'propertySettled'; payerId?: string; propertyId: string; operation: PropertyDecision['operation']; amount: number; level: number; recipientId: string | null; paid: Balance };
export type GameEvent = EventPayload & { sequence: number; commandId: string; playerId: string; turn: number };
export type Rejection = 'wrong-game' | 'duplicate' | 'stale' | 'wrong-player' | 'paused' | 'illegal-action' | 'insufficient-funds';
export type Result = { ok: true; events: GameEvent[] } | { ok: false; reason: Rejection };
export type Replay = {
  version: 1; rulesId: string; mapFingerprint: string; config: GameConfig; commands: Command[]; catalogFingerprint?: string; itemFingerprint?: string;
};

/** The only authority for turn positions and decisions. No timers, rendering or browser APIs. */
export class GameEngine {
  private current: GameState;
  private readonly nodes: Map<number, MapNode>;
  private readonly initialConfig: GameConfig;
  private readonly definitions: PropertyDefinition[];
  private readonly accepted = new Set<string>();
  private readonly commands: Command[] = [];
  private readonly log: GameEvent[] = [];
  private readonly effectRegistry;

  constructor(nodes: readonly MapNode[], config: GameConfig, definitions: readonly PropertyDefinition[] = PROPERTY_CATALOG.properties) {
    const cardsProfile = config.rulesId === CARD_RULES.id || config.rulesId === WEALTH_RULES.id || (config.rulesId === G1_RULES.id || (config.rulesId === G2_RULES.id || (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))));
    this.definitions = structuredClone([...definitions]);
    this.effectRegistry = (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))) ? G7_EFFECTS : (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))) ? G6_EFFECTS : (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))) ? G5_EFFECTS : (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))) ? G4_EFFECTS : (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))))) ? G3_EFFECTS : (config.rulesId === G2_RULES.id || (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))) ? G2_EFFECTS : config.rulesId === G1_RULES.id ? G1_EFFECTS : config.rulesId === WEALTH_RULES.id ? WEALTH_EFFECTS : config.rulesId === CARD_RULES.id ? CARD_EFFECTS : config.rulesId === ROAD_RULES.id ? ROAD_EFFECTS : config.rulesId === NEARBY_RULES.id ? NEARBY_EFFECTS : config.rulesId === CONSTRUCTION_RULES.id ? CONSTRUCTION_EFFECTS : ITEM_EFFECTS;
    this.nodes = new Map(nodes.map((node) => [node.id, structuredClone(node)]));
    if (!nodes.length || this.nodes.size !== nodes.length || nodes.some((n) =>
      !Number.isInteger(n.id) || !Number.isFinite(n.x) || !Number.isFinite(n.y) ||
      !n.adjacent.length || n.adjacent.some((id) => !this.nodes.has(id)))) throw new Error('地图道路连接无效');
    if (!config.gameId || !config.seed.trim() || config.seed.length > 64 ||
      config.characterIds.length < 2 || config.characterIds.length > 4 ||
      new Set(config.characterIds).size !== config.characterIds.length ||
      config.characterIds.some((id) => !id) || nodes.length < config.characterIds.length) throw new Error('开局配置无效');
    if(config.startDate!==undefined&&config.rulesId !== CALENDAR_RULES.id && config.rulesId !== LOTTERY_RULES.id && config.rulesId !== DIVIDEND_RULES.id && (config.rulesId !== COMPANY_RULES.id && (config.rulesId !== COMMERCE_RULES.id && (config.rulesId !== 'japan-events-candidate-v29' && (config.rulesId !== 'japan-events-candidate-v30' && (config.rulesId !== 'japan-events-candidate-v31' && (config.rulesId !== 'japan-events-candidate-v32' && (config.rulesId !== 'japan-events-candidate-v33' && (config.rulesId !== 'japan-events-candidate-v34' && (config.rulesId !== 'japan-events-candidate-v35' && (config.rulesId !== 'japan-events-candidate-v36' && (config.rulesId !== 'japan-events-candidate-v37' && (config.rulesId !== 'japan-events-candidate-v38' && (config.rulesId !== 'japan-events-candidate-v39' && (config.rulesId !== 'japan-events-candidate-v40' && (config.rulesId !== 'japan-events-candidate-v41' && (config.rulesId !== 'japan-events-candidate-v42' && (config.rulesId!=='japan-events-candidate-v43' && (config.rulesId !== 'japan-events-candidate-v44' && (config.rulesId !== 'japan-events-candidate-v45' && (config.rulesId !== 'japan-events-candidate-v46' && config.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))))throw Error('旧规则不支持开局日期');
    this.initialConfig = structuredClone({ ...config, seed: config.seed.trim() });
    const finance = (config.rulesId === ROAD_RULES.id || cardsProfile) || config.rulesId === FINANCE_RULES.id || config.rulesId === ITEM_RULES.id || (config.rulesId === CONSTRUCTION_RULES.id || config.rulesId === NEARBY_RULES.id);
    const economic = config.rulesId === ECONOMY_RULES.id || finance;
    if (config.rulesId && config.rulesId !== TURN_RULES.id && !economic) throw new Error('不支持的规则版本');
    if (economic) {
      validateProperties(nodes, this.definitions);
      if (!INITIAL_FUNDS.includes(config.initialFunds ?? ECONOMY_RULES.initialFunds)) throw new Error('初始资金配置无效');
    } else if (config.initialFunds !== undefined) throw new Error('移动模式不支持资金配置');
    this.current = {
      schemaVersion: 1, rulesId: economic ? config.rulesId! : TURN_RULES.id,
      mapFingerprint: hashSeed(JSON.stringify(nodes)).toString(16), gameId: config.gameId,
      seed: this.initialConfig.seed, randomState: hashSeed(this.initialConfig.seed),
      revision: 0, turn: 1, active: 0, phase: 'idle', paused: false, dice: 0, remaining: 0,
      completed: 0, pending: null, serial: 0,
      players: config.characterIds.map((characterId, index) => ({
        id: `player-${index + 1}`, characterId, node: nodes[index].id, previous: null,
      })),
    };
    if ((config.rulesId === ROAD_RULES.id || cardsProfile) || config.rulesId === ITEM_RULES.id || config.rulesId === CONSTRUCTION_RULES.id || config.rulesId === NEARBY_RULES.id) {
      const ids = this.current.players.map(p => p.id);
      this.current.effects = createEffectState(config.gameId, ids, this.effectRegistry);
      for (const id of ids) this.current.effects.inventory[id][REMOTE_DICE] = ITEM_RULES.initialPerPlayer;
      if ((config.rulesId === ROAD_RULES.id || cardsProfile) || config.rulesId === CONSTRUCTION_RULES.id || config.rulesId === NEARBY_RULES.id) for (const id of ids) this.current.effects.inventory[id][WORKER] = CONSTRUCTION_RULES.worker.initialPerPlayer;
      this.current.items = { fingerprint: config.rulesId===SURRENDER_RULES.id?SURRENDER_FINGERPRINT:config.rulesId===SPECIAL_OBJECT_RULES.id?SPECIAL_OBJECT_FINGERPRINT:config.rulesId===GOD_PAIRS_RULES.id?GOD_PAIRS_FINGERPRINT:config.rulesId===STOCK_CIRCUIT_RULES.id?STOCK_CIRCUIT_FINGERPRINT:config.rulesId===STOCK_LEDGER_RULES.id?STOCK_LEDGER_FINGERPRINT:config.rulesId===STOCK_MARKET_RULES.id?STOCK_MARKET_FINGERPRINT:config.rulesId===MINIGAME_RULES.id?MINIGAME_FINGERPRINT:(config.rulesId===SHOP_ACQUISITION_RULES.id || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))?SHOP_ACQUISITION_FINGERPRINT:(config.rulesId===SITE_SERVICES_RULES.id || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))?SITE_SERVICES_FINGERPRINT:config.rulesId===MAGIC_NESTED_RULES.id?MAGIC_NESTED_FINGERPRINT:config.rulesId===MAGIC_ACTIONS_RULES.id?MAGIC_ACTIONS_FINGERPRINT:config.rulesId===MAGIC_RULES.id?MAGIC_FINGERPRINT:config.rulesId===BATCH_RULES.id ? BATCH_FINGERPRINT : config.rulesId === PAYMENT_RULES.id ? PAYMENT_FINGERPRINT : config.rulesId === DISPOSAL_RULES.id ? DISPOSAL_FINGERPRINT : config.rulesId === ESTATE_RULES.id ? ESTATE_FINGERPRINT : (config.rulesId === INDEXED_RULES.id || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))) ? INDEXED_FINGERPRINT : (config.rulesId === DATE_BUSINESS_RULES.id || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))) ? DATE_BUSINESS_FINGERPRINT : config.rulesId === INSURANCE_RULES.id ? INSURANCE_FINGERPRINT : config.rulesId === COMMERCE_RULES.id ? COMMERCE_FINGERPRINT : config.rulesId === COMPANY_RULES.id ? COMPANY_FINGERPRINT : config.rulesId === DIVIDEND_RULES.id ? DIVIDEND_FINGERPRINT : config.rulesId === LOTTERY_RULES.id ? LOTTERY_FINGERPRINT : config.rulesId === CALENDAR_RULES.id ? CALENDAR_FINGERPRINT : config.rulesId === FINAL_FORTUNE_RULES.id ? FINAL_FORTUNE_FINGERPRINT : config.rulesId === TRAFFIC_FORTUNE_RULES.id ? TRAFFIC_FORTUNE_FINGERPRINT : config.rulesId === ASSET_FORTUNE_RULES.id ? ASSET_FORTUNE_FINGERPRINT : config.rulesId === FORTUNE_RULES.id ? FORTUNE_FINGERPRINT : config.rulesId === COMPLETE_NEWS_RULES.id ? COMPLETE_NEWS_FINGERPRINT : config.rulesId === STATUS_NEWS_RULES.id ? STATUS_NEWS_FINGERPRINT : config.rulesId === OPERATING_NEWS_RULES.id ? OPERATING_NEWS_FINGERPRINT : config.rulesId === PROPERTY_NEWS_RULES.id ? PROPERTY_NEWS_FINGERPRINT : config.rulesId === NEWS_RULES.id ? NEWS_FINGERPRINT : (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))) ? MAP_EVENT_FINGERPRINT : (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))) ? G7_FINGERPRINT : (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))) ? G6_FINGERPRINT : (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))) ? G5_FINGERPRINT : (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))) ? G4_FINGERPRINT : (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))))) ? G3_FINGERPRINT : (config.rulesId === G2_RULES.id || (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))) ? G2_FINGERPRINT : config.rulesId === G1_RULES.id ? G1_FINGERPRINT : config.rulesId === WEALTH_RULES.id ? WEALTH_FINGERPRINT : config.rulesId === CARD_RULES.id ? CARD_FINGERPRINT : config.rulesId === ROAD_RULES.id ? ROAD_FINGERPRINT : config.rulesId === NEARBY_RULES.id ? NEARBY_FINGERPRINT : config.rulesId === CONSTRUCTION_RULES.id ? CONSTRUCTION_FINGERPRINT : ITEM_FINGERPRINT, points: Object.fromEntries(ids.map(id => [id, ITEM_RULES.initialPoints])), supply: ITEM_RULES.supply - ids.length };
    }
    if ((config.rulesId === ROAD_RULES.id || cardsProfile)) {
      this.current.roadTools = { supply: { [ROBOT]: 10 - this.current.players.length, [ROADBLOCK]: 10 - this.current.players.length }, blocks: [], lastRobotPath: [] };
      for (const player of this.current.players) for (const item of ROAD_GOODS) this.current.effects!.inventory[player.id][item.id] = 1;
    }
    if (cardsProfile) {
      this.current.cards = { supply: CARD_RULES.supply };
      for (const player of this.current.players) this.current.effects!.inventory[player.id][EQUAL_CASH] = CARD_RULES.initialPerPlayer;
    }
    if (config.rulesId === WEALTH_RULES.id || (config.rulesId === G1_RULES.id || (config.rulesId === G2_RULES.id || (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))))) {
      this.current.wealth = { supply: WEALTH_RULES.supply };
      for (const player of this.current.players) this.current.effects!.inventory[player.id][WEALTH_CARD] = 0;
    }
    if ((config.rulesId === G1_RULES.id || (config.rulesId === G2_RULES.id || (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))))) {
      this.current.g1 = { supply: Object.fromEntries(G1_GOODS.map(g => [g.id, g.supply])), facing: {} };
      for (const player of this.current.players) for (const good of G1_GOODS) this.current.effects!.inventory[player.id][good.id] = 0;
    }
    if ((config.rulesId === G2_RULES.id || (config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))))))) {
      this.current.g2 = { supply: Object.fromEntries(G2_GOODS.map(g => [g.id, g.supply])), players: Object.fromEntries(this.current.players.map(p => [p.id, {...emptyMobility(),...((config.rulesId===FINAL_FORTUNE_RULES.id||(config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))?{travel:0}:{})}])), lastDice: [] };
      for (const player of this.current.players) for (const good of G2_GOODS) this.current.effects!.inventory[player.id][good.id] = 0;
    }
    if ((config.rulesId === G3_RULES.id || (config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))) {
      this.current.g3 = { supply: Object.fromEntries(G3_GOODS.map(g => [g.id, g.supply])), slots: {}, allies: {} };
      for (const p of this.current.players) {
        this.current.g3.slots[p.id] = []; this.current.g3.allies[p.id] = null;
        for (const g of G3_GOODS) this.current.effects!.inventory[p.id][g.id] = 0;
      }
    }
    if ((config.rulesId === G4_RULES.id || (config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))))) {
      this.current.g4 = { supply: Object.fromEntries(G4_GOODS.map(g => [g.id, g.supply])), hotel: Object.fromEntries(this.current.players.map(p => [p.id, 0])) };
      for (const p of this.current.players) for (const g of G4_GOODS) this.current.effects!.inventory[p.id][g.id] = 0;
    }
    if ((config.rulesId === G5_RULES.id || (config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))) {
      this.current.g5 = { supply: Object.fromEntries(G5_GOODS.filter(g => g.shop).map(g => [g.id, g.supply])), hazards: [], serial: 0, landedTurn: 0, engineers: Object.fromEntries(this.current.players.map(p => [p.id, null])) };
      for (const p of this.current.players) for (const g of G5_GOODS) this.current.effects!.inventory[p.id][g.id] = 0;
    }
    if (finance) this.current.finance = { eliminated: [], winnerId: null, round: 1 };
    if (economic) {
      const half = (config.initialFunds ?? ECONOMY_RULES.initialFunds) / 2;
      this.current.economy = {
        catalogFingerprint: hashSeed(JSON.stringify(this.definitions)).toString(16),
        balances: Object.fromEntries(this.current.players.map((p) => [p.id, { cash: half, bank: half }])),
        properties: this.definitions.map((p) => ({ id: p.id, ownerId: null, level: 0, ...((config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))) ? {basePrice:p.basePrice} : {}), ...(this.current.g4 ? { buildingType: 0, priceStatus: 0, research: null } : {}) })),
      };
    }
    if ((config.rulesId === G6_RULES.id || (config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))) initializeG6(this.current, nodes);
    if ((config.rulesId === G7_RULES.id || (config.rulesId === MAP_EVENT_RULES.id || (config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))) {
      this.current.g7 = { checkpoints: Object.fromEntries(this.current.players.map(p => [p.id, null])) };
      for (const p of this.current.players) for (const g of G7_GOODS) this.current.effects!.inventory[p.id][g.id] = 0;
    }
    if ((config.rulesId === NEWS_RULES.id || (config.rulesId === PROPERTY_NEWS_RULES.id || (config.rulesId === OPERATING_NEWS_RULES.id || (config.rulesId === STATUS_NEWS_RULES.id || (config.rulesId === COMPLETE_NEWS_RULES.id || (config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))) initializeNews(this.current);
    if((config.rulesId === FORTUNE_RULES.id || (config.rulesId === ASSET_FORTUNE_RULES.id || (config.rulesId === TRAFFIC_FORTUNE_RULES.id || (config.rulesId === FINAL_FORTUNE_RULES.id || (config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))) initializeFortune(this.current);
    if((config.rulesId === CALENDAR_RULES.id || (config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))initializeCalendar(this.current,config.startDate);
    initializeDateBusiness(this.current,config.initialFunds??ECONOMY_RULES.initialFunds);
    initializeSales(this.current);
    if((config.rulesId===SITE_SERVICES_RULES.id || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))this.current.siteServices={facility:null,shop:null};
    if(config.rulesId===MAGIC_RULES.id||config.rulesId===MAGIC_ACTIONS_RULES.id||config.rulesId===MAGIC_NESTED_RULES.id||(config.rulesId===SITE_SERVICES_RULES.id || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))this.current.magic={last:null,...(config.rulesId!==MAGIC_RULES.id?{current:null}:{}),...((config.rulesId===MAGIC_NESTED_RULES.id||(config.rulesId===SITE_SERVICES_RULES.id || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))?{nested:null}:{})};
    if(config.rulesId===DISPOSAL_RULES.id||config.rulesId===PAYMENT_RULES.id||(config.rulesId === BATCH_RULES.id || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))this.current.finance!.disposal={serial:0,current:null,last:null};
    if((config.rulesId === BATCH_RULES.id || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))this.current.finance!.batches={serial:0,current:null,last:null,day:null};
    if(config.rulesId===PAYMENT_RULES.id||(config.rulesId === BATCH_RULES.id || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))this.current.finance!.payments={current:null,last:null};
    if((config.rulesId === LOTTERY_RULES.id || (config.rulesId === DIVIDEND_RULES.id || (config.rulesId === COMPANY_RULES.id || (config.rulesId === COMMERCE_RULES.id || (config.rulesId === 'japan-events-candidate-v29' || (config.rulesId === 'japan-events-candidate-v30' || (config.rulesId === 'japan-events-candidate-v31' || (config.rulesId === 'japan-events-candidate-v32' || (config.rulesId === 'japan-events-candidate-v33' || (config.rulesId === 'japan-events-candidate-v34' || (config.rulesId === 'japan-events-candidate-v35' || (config.rulesId === 'japan-events-candidate-v36' || (config.rulesId === 'japan-events-candidate-v37' || (config.rulesId === 'japan-events-candidate-v38' || (config.rulesId === 'japan-events-candidate-v39' || (config.rulesId === 'japan-events-candidate-v40' || (config.rulesId === 'japan-events-candidate-v41' || (config.rulesId === 'japan-events-candidate-v42' || (config.rulesId==='japan-events-candidate-v43' || (config.rulesId === 'japan-events-candidate-v44' || (config.rulesId === 'japan-events-candidate-v45' || (config.rulesId === 'japan-events-candidate-v46' || config.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))initializeLottery(this.current);
    if(config.rulesId===SURRENDER_RULES.id){const ids=config.humanIds??this.current.players.map(p=>p.id);if(new Set(ids).size!==ids.length||ids.some(id=>!this.current.players.some(p=>p.id===id)))throw Error('无效人类座位');this.current.g6!.surrender={humanIds:[...ids],sourceId:null};}
    else if(config.humanIds!==undefined)throw Error('旧规则不支持认输座位配置');
  }

  get state(): GameState { return structuredClone(this.current); }
  get events(): GameEvent[] { return structuredClone(this.log); }
  exportReplay(): Replay {
    return structuredClone({ version: 1, rulesId: this.current.rulesId, mapFingerprint: this.current.mapFingerprint,
      ...(this.current.economy ? { catalogFingerprint: this.current.economy.catalogFingerprint } : {}),
      ...(this.current.items ? { itemFingerprint: this.current.items.fingerprint } : {}),
      config: this.initialConfig, commands: this.commands });
  }

  dispatch(command: Command): Result {
    const before = this.current;
    if (command.gameId !== before.gameId) return { ok: false, reason: 'wrong-game' };
    if (this.accepted.has(command.id)) return { ok: false, reason: 'duplicate' };
    if (command.expectedRevision !== before.revision) return { ok: false, reason: 'stale' };
    const responding = command.action.type==='chooseDeath' && before.pending?.kind==='surrender'?before.pending.sourceId : command.action.type === 'auction' && before.pending?.kind === 'auction' ? before.pending.responderId
      : command.action.type === 'reaction' && before.pending?.kind === 'reaction' ? before.pending.responderId
      : command.action.type === 'magicBuild' && before.pending?.kind === 'magic' ? before.pending.responderId
      : (command.action.type === 'property' || command.action.type === 'settleDebt') && (before.pending?.kind === 'property' || before.pending?.kind === 'debt') ? before.pending.payerId : undefined;
    if (command.playerId !== (responding ?? before.players[before.active].id)) return { ok: false, reason: 'wrong-player' };
    if (before.paused && command.action.type !== 'pause') return { ok: false, reason: 'paused' };
    if (before.phase === 'finished') return { ok: false, reason: 'illegal-action' };
    if (!command.id) return { ok: false, reason: 'illegal-action' };
    const state = structuredClone(before);
    const emitted: GameEvent[] = [];
    const emit = (payload: EventPayload) => {noteShopPurchase(state,payload);captureMagicNested(state,payload);emitted.push({ ...payload, sequence: this.log.length + emitted.length + 1,
      commandId: command.id, playerId: 'playerId' in payload ? payload.playerId : state.players[state.active].id, turn: state.turn });};
    const token = () => `${state.gameId}:${++state.serial}`;
    const startSegment = (to: number) => {
      const from = state.players[state.active].node;
      state.pending = { kind: 'segment', id: token(), from, to };
      state.phase = 'moving';
      emit({ type: 'segmentStarted', token: state.pending.id, from, to });
    };
    const eliminatePlayer = (playerId: string, explicitPayer = true) => {
      const economy = state.economy!, finance = state.finance!;
        const released = economy.properties.filter((p) => p.ownerId === playerId);
        for (const property of released) property.ownerId = null;
        finance.eliminated.push(playerId);
        releaseLottery(state,playerId,emit);
        if(state.news?.business){const b=state.news.business;if(b.insurance)b.insurance.terms[playerId]=0;const amount=b.loans[playerId];b.loans[playerId]=0;b.noLoans[playerId]=0;if(amount)emit({type:'loanChanged',targetId:playerId,operation:'writeoff',amount,debt:0,balance:{...economy.balances[playerId]}});}
        emit({ type: 'bankrupt', ...(explicitPayer ? { payerId: playerId } : {}), released: released.map((p) => p.id) });
        if (state.items && state.effects) {
          const quantity = state.effects.inventory[playerId][REMOTE_DICE] ?? 0;
          state.items.supply += quantity;
          emit({ type: 'itemSupplyChanged', amount: quantity, supply: state.items.supply });
          emit({ type: 'pointsCleared', amount: state.items.points[playerId] }); state.items.points[playerId] = 0;
          if (state.roadTools) for (const item of ROAD_GOODS) {
            const amount = state.effects.inventory[playerId][item.id] ?? 0;
            state.roadTools.supply[item.id] += amount;
            emit({ type: 'roadSupplyChanged', itemId: item.id, amount, supply: state.roadTools.supply[item.id] });
          }
          if (state.cards) {
            const amount = state.effects.inventory[playerId][EQUAL_CASH] ?? 0;
            state.cards.supply += amount;
            emit({ type: 'cardSupplyChanged', amount, supply: state.cards.supply });
          }
          if (state.g2) {
            const m = state.g2.players[playerId];
            if (m.vehicle !== 'foot') state.effects.inventory[playerId][m.vehicle]++;
            for (const good of G2_GOODS) {
              const amount = state.effects.inventory[playerId][good.id] ?? 0;
              state.g2.supply[good.id] += amount;
              emit({ type: 'g2SupplyChanged', itemId: good.id, amount, supply: state.g2.supply[good.id] });
            }
            state.g2.players[playerId] = emptyMobility();
            if(state.news?.detention)for(const key of ['prison','hospital'] as const)state.news.detention[key]=state.news.detention[key].filter(id=>id!==playerId);
          }
          if (state.g1) {
            delete state.g1.facing[playerId];
            for (const good of G1_GOODS) {
              const amount = state.effects.inventory[playerId][good.id] ?? 0;
              state.g1.supply[good.id] += amount;
              emit({ type: 'g1SupplyChanged', itemId: good.id, amount, supply: state.g1.supply[good.id] });
            }
          }
          if (state.wealth) {
            const amount = state.effects.inventory[playerId][WEALTH_CARD] ?? 0;
            state.wealth.supply += amount;
            emit({ type: 'wealthSupplyChanged', amount, supply: state.wealth.supply });
          }
          if (state.g6) {
            for (const good of G6_GOODS) state.g6.supply[good.id] += state.effects.inventory[playerId][good.id] ?? 0;
            removePlayerGod(state,playerId,emit);
          }
          if (state.g5) {
            for (const good of G5_GOODS.filter(g => g.shop)) state.g5.supply[good.id] += state.effects.inventory[playerId][good.id] ?? 0;
            state.g5.engineers[playerId] = null;
            for (const h of [...state.g5.hazards]) if (h.carrier === playerId) removeHazard(state, h.id, emit, '携带者破产');
          }
          if (state.g4) {
            state.g4.hotel[playerId] = 0;
            for (const good of G4_GOODS) state.g4.supply[good.id] += state.effects.inventory[playerId][good.id] ?? 0;
          }
          if (state.g3) {
            breakAlliance(state, playerId, '破产解除同盟', emit);
            for (const good of G3_GOODS) state.g3.supply[good.id] += state.effects.inventory[playerId][good.id] ?? 0;
          }
          const cleanup = advanceEffects(state.effects, effectContext(), { sequence: this.log.length + emitted.length + 1, kind: 'playerEliminated', playerId }, this.effectRegistry);
          if (!cleanup.ok) throw new Error('Elimination cleanup failed');
          state.effects = cleanup.state; cleanup.events.forEach(emit);
        }
    };
    const next = () => {
      const player = state.players[state.active];
      if (state.remaining === 0) {
        if (g5Landed(state, [...this.nodes.values()], emit)) { state.completed++; return; }
        if(encounterSpecialObject(state,[...this.nodes.values()],emit)){state.completed++;return;}
        encounterGod(state, emit);
        state.phase = 'turnEnd'; state.pending = null; state.completed++;
        if (state.g5) state.g5.landedTurn = state.turn;
        emit({ type: 'landed', node: player.node });
        settleMapCard(state, emit);
        if(offerMinigame(state,token,emit))return;
        if(offerFacility(state,[...this.nodes.values()],token,emit))return;
        if(offerMagic(state,token,emit))return;
        if(offerInsurance(state,token))return;
        if(offerCommerce(state,this.definitions,token))return;
        if(offerCompany(state,token,emit,id=>eliminatePlayer(id,true)))return;
        if(offerLottery(state,[...this.nodes.values()],token,emit))return;
        if (offerNews(state, token, emit, this.definitions, eliminatePlayer, [...this.nodes.values()])) return;
        if (offerFortune(state, token, emit, eliminatePlayer, this.definitions, [...this.nodes.values()])) return;
        const dreaming = !!state.g2?.players[player.id].dream;
        if (state.items && !dreaming) {
          const site = itemSite(this.nodes.get(player.node)!);
          if (site?.points) {
            state.items.points[player.id] += site.points;
            emit({ type: 'pointsAwarded', node: player.node, amount: site.points, balance: state.items.points[player.id] });
          }
          if (site?.shop) {
            state.phase = 'shop'; state.pending = { kind: 'shop', id: token(), node: player.node, companyId: 'japan:company:1',...((state.rulesId===SITE_SERVICES_RULES.id || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47'))))))))?{turnover:0,sales:[]}: {}) };
            prepareShop(state,state.pending,emit);
            emit({ type: 'shopOffered', decision: structuredClone(state.pending) }); return;
          }
        }
        if (godOwnsLanding(state, this.definitions, emit)) return;
        if (state.economy) {
          const definition = this.definitions.find((p) => p.nodeIds.includes(player.node));
          if (definition && (definition.kind === 'land' || state.g4)) {
            const property = state.economy.properties.find((p) => p.id === definition.id)!;
            const operation = !property.ownerId ? 'buy' : property.ownerId === player.id ? 'upgrade' : 'rent';
            if (operation === 'rent' && state.g4 && ((property.priceStatus! & 15) || state.g4.hotel[property.ownerId!])) { emit({ type: 'rentWaived', propertyId: property.id, ownerId: property.ownerId!, reason: property.priceStatus! & 15 ? '建筑查封中' : '业主住宿中' }); return; }
            if (operation === 'rent' && attachedGod(state, property.ownerId!)?.type === 15) { emit({ type: 'rentWaived', propertyId: property.id, ownerId: property.ownerId!, reason: '业主衰神附身' }); return; }
            if (operation === 'rent' && cannotCollectRent(state.g2?.players[property.ownerId!])) {
              emit({ type: 'rentWaived', propertyId: property.id, ownerId: property.ownerId! }); return;
            }
            if (operation === 'rent' && state.g3?.allies[player.id]?.partner === property.ownerId) {
              emit({ type: 'rentWaived', propertyId: property.id, ownerId: property.ownerId!, reason: '同盟免租' }); return;
            }
            if (dreaming && operation !== 'rent') return;
            if (operation !== 'upgrade' || property.level < (state.g4 ? maximumLevel(property, definition) : ECONOMY_RULES.maximumLevel)) {
              let hotelTurns: number | undefined;
              let lines = operation === 'rent' ? (state.g4 ? g4RentLines(state, definition, this.definitions) : rentLines(definition, state.economy.properties, this.definitions)) : [];
              if (state.g4 && definition.kind === 'facility' && operation === 'rent') {
                const type = property.buildingType ?? 0;
                if (!property.level || type === 0 || type === 4) return;
                let count = 0, fee = 0;
                if (type === 1 || type === 2) {
                  // Seeded Web counterpart of the original stop-wheel, not a wall-clock RNG.
                  if (type === 1) { const draw = g1Draw(state.randomState, 4); state.randomState = draw.state; count = draw.index + 1; hotelTurns = count; }
                  else { const draw = drawDice(state.randomState); state.randomState = draw.state; count = draw.value; }
                  fee = definition.rents[property.level - 1] * count * (property.priceStatus ? 2 : 1);
                  emit({ type: 'facilityDrawn', propertyId: property.id, count, buildingType: type });
                } else {
                  const vehicle = state.g2!.players[player.id].vehicle;
                  fee = state.g5?.engineers[player.id] ? 2000 * state.dice : vehicle === 'foot' ? 0 : (vehicle === 'tool:05' ? 500 : 1000) * state.dice;
                }
                if (!fee) return;
                lines = [{ propertyId: property.id, level: property.level, amount: fee }];
              }
              lines = lines.map(line => ({...line, amount: line.amount * consumerIndex(state)}));
              if (state.g6 && operation === 'rent' && (definition.kind === 'land' || (state.rulesId === INDEXED_RULES.id || (state.rulesId === 'japan-events-candidate-v32' || (state.rulesId === 'japan-events-candidate-v33' || (state.rulesId === 'japan-events-candidate-v34' || (state.rulesId === 'japan-events-candidate-v35' || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47')))))))))))))))))) {
                const original = lines.reduce((sum, line) => sum + line.amount, 0);
                const changed = godRent(state, player.id, original);
                if (changed !== original) lines = [{ propertyId: property.id, level: property.level, amount: changed }];
              }
              const amount = operation === 'buy' ? (propertyBase(property, definition) + ((state.rulesId === INDEXED_RULES.id || (state.rulesId === 'japan-events-candidate-v32' || (state.rulesId === 'japan-events-candidate-v33' || (state.rulesId === 'japan-events-candidate-v34' || (state.rulesId === 'japan-events-candidate-v35' || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47')))))))))))))))) && definition.kind === 'facility' ? 0 : property.level * definition.upgradeCost)) * consumerIndex(state)
                : operation === 'upgrade' ? (state.g4 && definition.kind === 'facility' && property.level === 0 ? propertyBase(property, definition) : definition.upgradeCost) * consumerIndex(state) : lines.reduce((sum, line) => sum + line.amount, 0);
              if (state.g6 && operation === 'rent' && !amount) { emit({ type: 'rentWaived', propertyId: property.id, ownerId: property.ownerId!, reason: '神仙免租' }); return; }
              state.phase = 'property';
              state.pending = { kind: 'property', id: token(), propertyId: property.id, operation, amount,
                recipientId: operation === 'rent' ? property.ownerId : null, lines, ...(hotelTurns ? { hotelTurns } : {}), ...(state.g4 && definition.kind === 'facility' && operation === 'upgrade' && property.level === 0 ? { buildingChoices: [1, 2, 3, 4] } : {}) };
              if (state.g3 && operation === 'rent') {
                offerRent(state, { kind: 'rent', sourceId: player.id, decision: state.pending }, player.id, token, emit); return;
              }
              if (state.finance && operation === 'rent') {
                const balance = state.economy.balances[player.id];
                const available = balance.cash + balance.bank;
                if (available < amount) {
                  state.phase = 'debt';
                  state.pending = { kind: 'debt', id: state.pending.id, propertyId: property.id,
                    recipientId: property.ownerId!, amount, available, shortfall: amount - available, lines };
                  emit({ type: 'debtOffered', decision: structuredClone(state.pending) });
                  return;
                }
              }
              emit({ type: 'propertyOffered', decision: structuredClone(state.pending) });
            }
          }
        }
        return;
      }
      const adjacent = state.g1 ? g1Adjacent(this.nodes.get(player.node)!) : [...new Set(this.nodes.get(player.node)!.adjacent)];
      const onward = adjacent.filter((id) => id !== player.previous);
      const choices = onward.length ? onward : adjacent;
      if (choices.length > 1 && state.g2?.players[player.id].dream) {
        const draw = g1Draw(state.randomState, choices.length); state.randomState = draw.state;
        emit({ type: 'branchChosen', node: choices[draw.index] }); startSegment(choices[draw.index]);
      } else if (choices.length === 1) startSegment(choices[0]);
      else {
        state.phase = 'choosing';
        state.pending = { kind: 'branch', id: token(), choices };
        emit({ type: 'branchOffered', decisionId: state.pending.id, choices });
      }
    };
    const effectContext = (): EffectContext => ({ gameId: state.gameId, playerId: state.players[state.active].id,
      timing: 'beforeRoll', paused: state.paused, finished: state.phase === 'finished',
      players: state.players.map(p => ({ id: p.id, alive: !state.finance?.eliminated.includes(p.id) && !detained(state.g2?.players[p.id]) && !state.g4?.hotel[p.id] })),
      nodeIds: state.roadTools ? roadblockTargets(this.nodes.get(state.players[state.active].node)!, [...this.nodes.values()], state.roadTools.blocks.concat(state.g5?.hazards.filter(h => !h.carrier).map(h => h.node) ?? [])).map(String) : [], propertyIds: (state.rulesId === NEARBY_RULES.id || (state.rulesId === ROAD_RULES.id || (state.rulesId === CARD_RULES.id || (state.rulesId === WEALTH_RULES.id || (state.rulesId === G1_RULES.id || (state.rulesId === G2_RULES.id || (state.rulesId === G3_RULES.id || (state.rulesId === G4_RULES.id || (state.rulesId === G5_RULES.id || (state.rulesId === G6_RULES.id || (state.rulesId === G7_RULES.id || (state.rulesId === MAP_EVENT_RULES.id || (state.rulesId === NEWS_RULES.id || (state.rulesId === PROPERTY_NEWS_RULES.id || (state.rulesId === OPERATING_NEWS_RULES.id || (state.rulesId === STATUS_NEWS_RULES.id || (state.rulesId === COMPLETE_NEWS_RULES.id || (state.rulesId === FORTUNE_RULES.id || (state.rulesId === ASSET_FORTUNE_RULES.id || (state.rulesId === TRAFFIC_FORTUNE_RULES.id || (state.rulesId === FINAL_FORTUNE_RULES.id || (state.rulesId === CALENDAR_RULES.id || (state.rulesId === LOTTERY_RULES.id || (state.rulesId === DIVIDEND_RULES.id || (state.rulesId === COMPANY_RULES.id || (state.rulesId === COMMERCE_RULES.id || (state.rulesId === 'japan-events-candidate-v29' || (state.rulesId === 'japan-events-candidate-v30' || (state.rulesId === 'japan-events-candidate-v31' || (state.rulesId === 'japan-events-candidate-v32' || (state.rulesId === 'japan-events-candidate-v33' || (state.rulesId === 'japan-events-candidate-v34' || (state.rulesId === 'japan-events-candidate-v35' || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))))))))))))))))))))))))) && state.economy
        ? nearbyWorkerTargets(this.nodes.get(state.players[state.active].node)!, this.definitions, state.economy.properties)
        : state.rulesId === CONSTRUCTION_RULES.id && state.economy
        ? [workerTarget(state.players[state.active].node, this.definitions, state.economy.properties)].filter((id): id is string => id !== null) : [] });
    const startRoll = (value: number) => {
      saveCheckpoint(state);
      state.dice = value; state.remaining = value; state.phase = 'rolling'; state.pending = { kind: 'roll', id: token() };
      emit({ type: 'rolled', value });
    };
    const action = command.action;
    const startIncomingTurn=()=>{
        state.turn++; state.phase = 'idle'; state.dice = 0;
        emit({ type: 'turnStarted', nextPlayerId: state.players[state.active].id });
        checkLoanMaturity(state,emit,id=>eliminatePlayer(id,true));
        if(state.finance?.payments?.current)return;
        if(state.calendar&&(state.finance?.winnerId||state.finance?.eliminated.includes(state.players[state.active].id)))return;
        if (state.g4) {
          const id = state.players[state.active].id;
          if (state.g4.hotel[id] > 0) {
            const value = state.g4.hotel[id];
            state.g4.hotel[id] = value === 128 ? 0 : value === 1 ? 128 : value - 1;
            emit({ type: 'hotelChanged', playerId: id, remaining: state.g4.hotel[id] });
            if (state.g4.hotel[id]) { state.phase = 'turnEnd'; emit({ type: 'turnSkipped', reason: 'hotel' }); }
          }
        }
        tickLoans(state, state.players[state.active].id);
        tickInsurance(state,state.players[state.active].id,emit);
        if (state.g6) { tickGods(state, emit); refreshQuota(state); }
        if (state.g5) tickG5(state, emit);
        if (state.g3) tickAlliance(state, state.players[state.active].id, emit);
        if (state.g2 && state.effects) {
          state.g2.lastDice = [];
          const id = state.players[state.active].id, m = state.g2.players[id];
          const was = JSON.stringify(m);
          const released = state.g4?.hotel[id] ? null : tickMobility(m, state.effects.inventory[id]);
          if(released && released !== 'travel' && state.news?.detention)state.news.detention[released]=state.news.detention[released].filter(p=>p!==id);
          if (JSON.stringify(m) !== was) emit({ type: 'mobilityChanged', targetId: id, mobility: structuredClone(m), reason: released ? '离开设施' : '行动计时' });
          if (detained(m) || m.winter) {
            state.phase = 'turnEnd'; state.pending = null; state.remaining = 0;
            emit({ type: 'turnSkipped', reason: m.travel ? 'travel' : m.prison ? 'prison' : m.hospital ? 'hospital' : 'winter' });
          }
        }
    };
    const resumeDay=()=>{
      const f=state.finance?.batches,day=f?.day;if(!f||!day||f.current||state.finance!.payments!.current||state.finance!.disposal!.current)return;
      f.day=null;
      if(state.phase==='finished')return;
      drawLottery(state,emit);if(day.monthChanged){settleMonthly(state,emit);refreshSpecialObjects(state,emit);}
      if(state.finance!.round%5===0)replenishGods(state,[...this.nodes.values()]);
      state.active=nextSolventIndex(state.players.map(p=>p.id),state.finance!.eliminated,state.active);
      startIncomingTurn();
    };
    switch (action.type) {
      case 'listProperty':
      case 'cancelListing':
      case 'buyListing':
        if(!operateSales(state,this.definitions,action,emit))return {ok:false,reason:'illegal-action'};
        break;
      case 'stockTrade':
        if (!tradeStock(state, action.stockId, action.side, action.quantity, emit)) return { ok: false, reason: 'illegal-action' };
        break;
      case 'research': {
        const option = researchOptions(state, this.definitions).find(o => o.propertyId === action.propertyId && o.itemId === action.itemId);
        if (!option) return { ok: false, reason: 'illegal-action' };
        state.economy!.properties.find(p => p.id === option.propertyId)!.research = { itemId: option.itemId, remaining: 5, ownerId: command.playerId };
        emit({ type: 'g5Notice', message: '研究已开始，5次自身行动后自动领取；无现金或点数消耗。' }); break;
      }
      case 'auction': {
        if (!state.g4 || state.phase !== 'auction' || state.pending?.kind !== 'auction' || state.pending.id !== action.decisionId || !bidG4(state, action.increment, token, emit)) return { ok: false, reason: 'illegal-action' };
        break;
      }
      case 'reaction': {
        if (!state.g3 || state.phase !== 'reaction' || state.pending?.kind !== 'reaction' || state.pending.id !== action.decisionId ||
          !(state.pending.continuation.kind === 'magicDetention' ? reactMagic(state,[...this.nodes.values()],this.definitions,action.choice,action.targetId,token,emit) : state.pending.continuation.kind === 'companyFee' ? reactCompany(state,action.choice,action.targetId,token,emit,id=>eliminatePlayer(id,true)) : state.pending.continuation.kind === 'fortuneTravel' ? reactFinalFortune(state, action.choice, action.targetId, token, emit) : state.pending.continuation.kind === 'trafficDetention' ? reactTrafficFortune(state, [...this.nodes.values()], action.choice, action.targetId, token, emit) : state.pending.continuation.kind === 'newsProsecution' ? reactProsecution(state, [...this.nodes.values()], action.choice, action.targetId, token, emit) : state.pending.continuation.kind === 'tax' ? state.g4 && reactTax(state, action.choice, action.targetId, token, emit) : reactG3(state, [...this.nodes.values()], action.choice, action.targetId, token, emit))) return { ok: false, reason: 'illegal-action' };
        break;
      }
      case 'item': {
        if (!state.items || !state.effects || !action.action || (action.action.type === 'begin' ? state.phase !== 'idle' : state.phase !== 'effect')) return { ok: false, reason: 'illegal-action' };
        const definitionId = action.action.type === 'begin' ? action.action.definitionId : state.effects.pending?.definitionId;
        const mobility = state.g2?.players[command.playerId];
        if (actionLocked(mobility) || state.g4?.hotel[command.playerId]) return { ok: false, reason: 'illegal-action' };
        if (definitionId === REMOTE_EFFECT && mobility && (mobility.stop || mobility.turtle)) return { ok: false, reason: 'illegal-action' };
        const g7Good = G7_GOODS.find(g => g.effect === definitionId);
        if (g7Good) {
          if (!state.g7 || action.stolenItemId !== undefined || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const options = g7Options(state, [...this.nodes.values()], this.definitions, g7Good.id);
          if (action.action.type === 'confirm') {
            const pending = state.effects.pending, target = action.action.target;
            const option = options.find(o => o.target.kind === target?.kind && o.target.id === target.id);
            if (!pending || pending.id !== action.action.decisionId || pending.playerId !== command.playerId || !option || !applyG7(state, [...this.nodes.values()], this.definitions, g7Good.id, option, action.action.destination, emit)) return { ok: false, reason: 'illegal-action' };
            if (g7Good.id === 'tool:11' && target.kind === 'player' && target.id === command.playerId) {
              state.remaining = 0; state.dice = 0;
              const n = this.nodes.get(state.players[state.active].node)!;
              if (isBankNode(n) && !state.g2!.players[command.playerId].dream && !g5Landed(state, [...this.nodes.values()], emit)) {
                state.phase = 'bank'; state.pending = { kind: 'bank', id: token(), node: n.id, arrival: 'landing' }; emit({ type: 'bankOffered', decision: structuredClone(state.pending) });
              } else if (state.phase !== 'turnEnd') next();
            }
          } else {
            if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
            const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
            if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
            state.effects = proposal.state; proposal.events.forEach(emit);
            state.phase = action.action.type === 'begin' ? 'effect' : 'idle';
            state.pending = action.action.type === 'begin' ? { kind: 'effect', id: state.effects.pending!.id } : null;
          }
          break;
        }
        if (action.action.type === 'confirm' && action.action.destination !== undefined) return { ok: false, reason: 'illegal-action' };
        const g6Good = G6_GOODS.find(g => g.effect === definitionId);
        if (g6Good) {
          if (!state.g6 || action.stolenItemId !== undefined || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const options = g6Options(state, [...this.nodes.values()], g6Good.id);
          if (action.action.type === 'confirm') {
            const pending = state.effects.pending, target = action.action.target;
            const option = options.find(o => o.target.kind === target?.kind && o.target.id === target.id);
            if (!pending || pending.id !== action.action.decisionId || pending.playerId !== command.playerId || !option || !applyG6(state, g6Good.id, option, emit)) return { ok: false, reason: 'illegal-action' };
          } else {
            if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
            const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
            if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
            state.effects = proposal.state; proposal.events.forEach(emit);
            state.phase = action.action.type === 'begin' ? 'effect' : 'idle';
            state.pending = action.action.type === 'begin' ? { kind: 'effect', id: state.effects.pending!.id } : null;
          }
          break;
        }
        const g5Good = G5_GOODS.find(g => g.effect === definitionId);
        if (g5Good) {
          if (!state.g5 || action.stolenItemId !== undefined || (action.action.type !== 'confirm' && action.value !== undefined)) return { ok: false, reason: 'illegal-action' };
          const options = g5Options(state, [...this.nodes.values()], this.definitions, g5Good.id);
          if (action.action.type === 'confirm') {
            const pending = state.effects.pending, target = action.action.target;
            const option = options.find(o => o.target.kind === target?.kind && o.target.id === target.id);
            if (!pending || pending.id !== action.action.decisionId || pending.playerId !== command.playerId || !option || !applyG5(state, [...this.nodes.values()], this.definitions, g5Good.id, option, action.value, emit)) return { ok: false, reason: 'illegal-action' };
          } else {
            if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
            const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
            if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
            state.effects = proposal.state; proposal.events.forEach(emit);
            state.phase = action.action.type === 'begin' ? 'effect' : 'idle';
            state.pending = action.action.type === 'begin' ? { kind: 'effect', id: state.effects.pending!.id } : null;
          }
          break;
        }
        const g4Good = G4_GOODS.find(g => g.effect === definitionId);
        if (g4Good) {
          if (!state.g4 || action.stolenItemId !== undefined || (action.action.type !== 'confirm' && action.value !== undefined)) return { ok: false, reason: 'illegal-action' };
          const options = g4Options(state, [...this.nodes.values()], this.definitions, g4Good.id);
          if (action.action.type === 'confirm') {
            const pending = state.effects.pending, target = action.action.target;
            const option = options.find(o => o.target.kind === target?.kind && o.target.id === target.id);
            if (!pending || pending.id !== action.action.decisionId || pending.playerId !== command.playerId || !option || !applyG4(state, this.definitions, g4Good.id, option, action.value, token, emit)) return { ok: false, reason: 'illegal-action' };
          } else {
            if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
            const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
            if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
            state.effects = proposal.state; proposal.events.forEach(emit);
            state.phase = action.action.type === 'begin' ? 'effect' : 'idle';
            state.pending = action.action.type === 'begin' ? { kind: 'effect', id: state.effects.pending!.id } : null;
          }
          break;
        }
        const g3Good = G3_GOODS.find(g => g.effect === definitionId);
        if (action.stolenItemId !== undefined && (g3Good?.id !== 'card:13' || action.action.type !== 'confirm')) return { ok: false, reason: 'illegal-action' };
        if (g3Good) {
          if (!state.g3 || g3Good.passive || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const options = g3Options(state, [...this.nodes.values()], g3Good.id);
          if (action.action.type === 'confirm') {
            const pending = state.effects.pending, target = action.action.target;
            const option = options.find(o => target?.kind === 'player' && target.id === o.id);
            if (!pending || pending.id !== action.action.decisionId || pending.playerId !== command.playerId || !option || !(state.effects.inventory[command.playerId][g3Good.id] > 0) ||
              (g3Good.id === 'card:13' && !option.items.includes(action.stolenItemId!))) return { ok: false, reason: 'illegal-action' };
            applyG3(state, g3Good.id, option.id, action.stolenItemId, emit);
          } else {
            if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
            const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
            if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
            state.effects = proposal.state; proposal.events.forEach(emit);
            state.phase = action.action.type === 'begin' ? 'effect' : 'idle';
            state.pending = action.action.type === 'begin' ? { kind: 'effect', id: state.effects.pending!.id } : null;
          }
          break;
        }
        const g2Good = G2_GOODS.find(g => g.effect === definitionId);
        if (g2Good) {
          if (!state.g2 || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const options = g2Options(state, [...this.nodes.values()], g2Good.id);
          if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
          const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
          if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
          if (action.action.type === 'confirm') {
            const target = action.action.target;
            const option = options.find(o => o.target.kind === target?.kind && o.target.id === target?.id);
            if (!option) return { ok: false, reason: 'illegal-action' };
            state.effects = proposal.state;
            if (state.g3 && (g2Good.id === 'card:16' || g2Good.id === 'card:17')) {
              state.g2.supply[g2Good.id]++;
              proposal.events.forEach(emit); syncCardSlots(state);
              startAttack(state, [...this.nodes.values()], { kind: 'attack', itemId: g2Good.id, sourceId: command.playerId, originalId: option.playerIds[0] }, token, emit);
              break;
            }
            applyG2(state, [...this.nodes.values()], g2Good.id, option,emit);
            if (state.g3 && g2Good.id === 'card:15') for (const id of option.playerIds) hostility(state, id, command.playerId, emit);
            proposal.events.forEach(emit);
            emit({ type: 'g2Resolved', itemId: g2Good.id, option });
            for (const id of option.playerIds) emit({ type: 'mobilityChanged', targetId: id, mobility: structuredClone(state.g2.players[id]), reason: g2Good.name });
            if (g2Good.id.startsWith('card:')) emit({ type: 'g2SupplyChanged', itemId: g2Good.id, amount: 1, supply: state.g2.supply[g2Good.id] });
          } else { state.effects = proposal.state; proposal.events.forEach(emit); }
          if (action.action.type === 'begin') { state.phase = 'effect'; state.pending = { kind: 'effect', id: state.effects.pending!.id }; }
          else { state.phase = 'idle'; state.pending = null; }
          break;
        }
        const g1Good = G1_GOODS.find(g => g.effect === definitionId);
        if (g1Good) {
          if (!state.g1 || !state.economy || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const options = g1Options(state, [...this.nodes.values()], this.definitions, g1Good.id);
          if (action.action.type === 'begin' && !options.length) return { ok: false, reason: 'illegal-action' };
          const ctx = effectContext();
          ctx.propertyIds = options.filter(o => o.target.kind === 'property').map(o => o.target.id);
          const proposal = reduceEffect(state.effects, ctx, action.action, this.effectRegistry);
          if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
          if (action.action.type === 'confirm') {
            const target = action.action.target;
            const option = options.find(o => o.target.kind === target?.kind && o.target.id === target?.id);
            if (!option) return { ok: false, reason: 'illegal-action' };
            if (state.g3 && (g1Good.id === 'card:03' || g1Good.id === 'card:12')) for (const change of option.changes) hostility(state, change.before.ownerId, command.playerId, emit);
            for (const change of option.changes) Object.assign(state.economy.properties.find(p => p.id === change.before.id)!, change.after);
            if (option.transfer) {
              const { from, to, amount } = option.transfer;
              state.economy.balances[from].cash -= amount;
              state.economy.balances[to].bank += amount;
            }
            let previous: number | null | undefined;
            if (option.turn) {
              const { playerId, candidates, direction } = option.turn;
              const targetPlayer = state.players.find(p => p.id === playerId)!;
              const draw = candidates.length ? g1Draw(state.randomState, candidates.length) : null;
              if (draw) state.randomState = draw.state;
              previous = draw ? candidates[draw.index] : null;
              targetPlayer.previous = previous; state.g1.facing[playerId] = direction;
            }
            state.g1.supply[g1Good.id]++;
            proposal.events.forEach(emit);
            emit({ type: 'g1SupplyChanged', itemId: g1Good.id, amount: 1, supply: state.g1.supply[g1Good.id] });
            emit({ type: 'g1Resolved', itemId: g1Good.id, option, ...(previous !== undefined ? { previous } : {}) });
          } else proposal.events.forEach(emit);
          state.effects = proposal.state;
          if (action.action.type === 'begin') { state.phase = 'effect'; state.pending = { kind: 'effect', id: state.effects.pending!.id }; }
          else { state.phase = 'idle'; state.pending = null; }
          break;
        }
        if (definitionId === WEALTH_EFFECT) {
          if (!state.wealth || !state.economy || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
          if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
          if (action.action.type === 'confirm') {
            const participants = wealthParticipants(state.players, state.finance?.eliminated ?? []).map(playerId => ({ playerId, cash: state.economy!.balances[playerId].cash }));
            const preview = wealthPreview(participants.map(p => p.cash));
            if (!preview) return { ok: false, reason: 'illegal-action' };
            for (const player of participants) {
              if (state.g3 && player.cash > preview.average && preview.average >= 100) hostility(state, player.playerId, command.playerId, emit);
              state.economy.balances[player.playerId].cash = preview.average;
            }
            state.wealth.supply++;
            proposal.events.forEach(emit);
            emit({ type: 'wealthSupplyChanged', amount: 1, supply: state.wealth.supply });
            emit({ type: 'wealthEqualized', participants, ...preview });
          } else proposal.events.forEach(emit);
          state.effects = proposal.state;
          if (action.action.type === 'begin') { state.phase = 'effect'; state.pending = { kind: 'effect', id: state.effects.pending!.id }; }
          else { state.phase = 'idle'; state.pending = null; }
          break;
        }
        if (definitionId === EQUAL_CASH_EFFECT) {
          if (!state.cards || !state.economy || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          const targets = equalCashTargets(state.players, state.active, [...(state.finance?.eliminated ?? []), ...state.players.filter(p => detained(state.g2?.players[p.id]) || !!state.g4?.hotel[p.id]).map(p => p.id)], [...this.nodes.values()]);
          if (action.action.type !== 'cancel' && (!targets.length || (action.action.type === 'confirm' && !targets.includes(action.action.target?.id ?? '')))) return { ok: false, reason: 'illegal-action' };
          const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
          if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
          if (action.action.type === 'confirm') {
            const source = state.economy.balances[command.playerId], target = state.economy.balances[action.action.target.id];
            const preview = equalCashPreview(source.cash, target.cash);
            if (!preview) return { ok: false, reason: 'illegal-action' };
            const sourceCash = source.cash, targetCash = target.cash;
            if (state.g3 && targetCash - preview.average >= 100) hostility(state, action.action.target.id, command.playerId, emit);
            source.cash = preview.average; target.cash = preview.average;
            state.cards.supply++;
            proposal.events.forEach(emit);
            emit({ type: 'cardSupplyChanged', amount: 1, supply: state.cards.supply });
            emit({ type: 'cashEqualized', targetId: action.action.target.id, sourceCash, targetCash, ...preview });
          } else proposal.events.forEach(emit);
          state.effects = proposal.state;
          if (action.action.type === 'begin') { state.phase = 'effect'; state.pending = { kind: 'effect', id: state.effects.pending!.id }; }
          else { state.phase = 'idle'; state.pending = null; }
          break;
        }
        if (definitionId === ROBOT_EFFECT || definitionId === ROADBLOCK_EFFECT) {
          const roads = state.roadTools;
          if (!roads || action.value !== undefined) return { ok: false, reason: 'illegal-action' };
          if (definitionId === ROADBLOCK_EFFECT && action.action.type !== 'cancel' && !effectContext().nodeIds.length) return { ok: false, reason: 'illegal-action' };
          const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
          if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
          state.effects = proposal.state; proposal.events.forEach(emit);
          if (action.action.type === 'begin') { state.phase = 'effect'; state.pending = { kind: 'effect', id: state.effects.pending!.id }; }
          else {
            state.phase = 'idle'; state.pending = null;
            if (action.action.type === 'confirm') {
              if (definitionId === ROADBLOCK_EFFECT) {
                const node = Number(action.action.target.id);
                roads.blocks.push(node); roads.blocks.sort((a, b) => a - b);
                emit({ type: 'roadblockPlaced', node });
              } else {
                roads.supply[ROBOT]++;
                emit({ type: 'roadSupplyChanged', itemId: ROBOT, amount: 1, supply: roads.supply[ROBOT] });
                const player = state.players[state.active];
                const path = robotPath([...this.nodes.values()], player.node, player.previous);
                const cleared = [...new Set(path)].filter(node => roads.blocks.includes(node));
                for (const node of cleared) {
                  roads.blocks = roads.blocks.filter(id => id !== node); roads.supply[ROADBLOCK]++;
                  emit({ type: 'roadblockRemoved', node, reason: 'robot', supply: roads.supply[ROADBLOCK] });
                }
                clearHazards(state, path, emit);
                roads.lastRobotPath = path;
                emit({ type: 'robotCleared', path, cleared });
              }
            }
          }
          break;
        }
        const nearbyWorker = definitionId === NEARBY_WORKER_EFFECT && (state.rulesId === NEARBY_RULES.id || (state.rulesId === ROAD_RULES.id || (state.rulesId === CARD_RULES.id || (state.rulesId === WEALTH_RULES.id || (state.rulesId === G1_RULES.id || (state.rulesId === G2_RULES.id || (state.rulesId === G3_RULES.id || (state.rulesId === G4_RULES.id || (state.rulesId === G5_RULES.id || (state.rulesId === G6_RULES.id || (state.rulesId === G7_RULES.id || (state.rulesId === MAP_EVENT_RULES.id || (state.rulesId === NEWS_RULES.id || (state.rulesId === PROPERTY_NEWS_RULES.id || (state.rulesId === OPERATING_NEWS_RULES.id || (state.rulesId === STATUS_NEWS_RULES.id || (state.rulesId === COMPLETE_NEWS_RULES.id || (state.rulesId === FORTUNE_RULES.id || (state.rulesId === ASSET_FORTUNE_RULES.id || (state.rulesId === TRAFFIC_FORTUNE_RULES.id || (state.rulesId === FINAL_FORTUNE_RULES.id || (state.rulesId === CALENDAR_RULES.id || (state.rulesId === LOTTERY_RULES.id || (state.rulesId === DIVIDEND_RULES.id || (state.rulesId === COMPANY_RULES.id || (state.rulesId === COMMERCE_RULES.id || (state.rulesId === 'japan-events-candidate-v29' || (state.rulesId === 'japan-events-candidate-v30' || (state.rulesId === 'japan-events-candidate-v31' || (state.rulesId === 'japan-events-candidate-v32' || (state.rulesId === 'japan-events-candidate-v33' || (state.rulesId === 'japan-events-candidate-v34' || (state.rulesId === 'japan-events-candidate-v35' || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))))))))))))))))))))));
        const worker = nearbyWorker || (definitionId === WORKER_EFFECT && state.rulesId === CONSTRUCTION_RULES.id);
        if (worker && action.action.type !== 'cancel' && !effectContext().propertyIds.length) return { ok: false, reason: 'illegal-action' };
        if (!worker && action.action.type === 'confirm' && (!Number.isInteger(action.value) || action.value! < 1 || action.value! > 6)) return { ok: false, reason: 'illegal-action' };
        if (worker && action.value !== undefined) return { ok: false, reason: 'illegal-action' };
        const proposal = reduceEffect(state.effects, effectContext(), action.action, this.effectRegistry);
        if (!proposal.ok) return { ok: false, reason: 'illegal-action' };
        if (proposal.intents.some(i => worker ? i.operation !== (nearbyWorker ? 'build-nearby-land' : 'build-current-land') || i.target.kind !== 'property' || !effectContext().propertyIds.includes(i.target.id) : i.operation !== 'controlled-roll' || i.sourceId !== i.target.id || i.target.kind !== 'player')) return { ok: false, reason: 'illegal-action' };
        state.effects = proposal.state;
        proposal.events.forEach(emit);
        if (action.action.type === 'begin') {
          state.phase = 'effect'; state.pending = { kind: 'effect', id: state.effects.pending!.id };
        } else if (action.action.type === 'cancel') { state.phase = 'idle'; state.pending = null; }
        else if (worker) {
          const property = state.economy!.properties.find(p => p.id === proposal.intents[0].target.id)!;
          const fromLevel = property.level;
          property.level++;
          emit({ type: 'propertyBuilt', propertyId: property.id, fromLevel, level: property.level, ownerId: property.ownerId });
          state.phase = 'idle'; state.pending = null;
        } else {
          state.items.supply++;
          emit({ type: 'itemSupplyChanged', amount: 1, supply: state.items.supply });
          if (state.g2) state.g2.lastDice = [action.value!];
          startRoll(action.value!);
        }
        break;
      }
      case 'facility':
        if(!actFacility(state,action.decisionId,action.targetId,token,emit))return {ok:false,reason:'illegal-action'};break;
      case 'sellItem':
        if(!sellItem(state,action.decisionId,action.itemId,token,emit))return {ok:false,reason:'illegal-action'};break;
      case 'minigame': {if(!actMinigame(state,action.decisionId,action.input,emit))return {ok:false,reason:'illegal-action'};break;}
      case 'buyItem': {
        const shop = state.pending;
        if (!state.items || !state.effects || state.phase !== 'shop' || shop?.kind !== 'shop' || shop.id !== action.decisionId ) return { ok: false, reason: 'illegal-action' };
        if((state.rulesId===SHOP_ACQUISITION_RULES.id || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47')))))))){if(!buyFromShelf(state,action.itemId,token,emit))return {ok:false,reason:'illegal-action'};break;}
        const g6Good = G6_GOODS.find(g => g.id === action.itemId);
        if (g6Good) {
          if (!state.g6 || actionLocked(state.g2?.players[command.playerId]) || state.g4!.hotel[command.playerId]) return { ok: false, reason: 'illegal-action' };
          const id = command.playerId, inventory = state.effects.inventory[id];
          if (g2PurchaseReason(inventory, state.items.points[id], state.g6.supply[g6Good.id], g6Good.id, g6Good.price)) return { ok: false, reason: 'insufficient-funds' };
          inventory[g6Good.id]++; state.items.points[id] -= g6Good.price; state.g6.supply[g6Good.id]--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: g6Good.id, cost: g6Good.price, points: state.items.points[id], supply: state.g6.supply[g6Good.id] }); break;
        }
        const g5Good = G5_GOODS.find(g => g.id === action.itemId);
        if (g5Good) {
          if (!state.g5 || !g5Good.shop || actionLocked(state.g2?.players[command.playerId]) || state.g4!.hotel[command.playerId]) return { ok: false, reason: 'illegal-action' };
          const id = command.playerId, inventory = state.effects.inventory[id];
          if (g2PurchaseReason(inventory, state.items.points[id], state.g5.supply[g5Good.id], g5Good.id, g5Good.price)) return { ok: false, reason: 'insufficient-funds' };
          inventory[g5Good.id]++; state.items.points[id] -= g5Good.price; state.g5.supply[g5Good.id]--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: g5Good.id, cost: g5Good.price, points: state.items.points[id], supply: state.g5.supply[g5Good.id] }); break;
        }
        const g4Good = G4_GOODS.find(g => g.id === action.itemId);
        if (g4Good) {
          if (!state.g4 || actionLocked(state.g2?.players[command.playerId]) || state.g4.hotel[command.playerId]) return { ok: false, reason: 'illegal-action' };
          const id = command.playerId, inventory = state.effects.inventory[id];
          if (g2PurchaseReason(inventory, state.items.points[id], state.g4.supply[g4Good.id], g4Good.id, g4Good.price)) return { ok: false, reason: 'insufficient-funds' };
          inventory[g4Good.id]++; state.items.points[id] -= g4Good.price; state.g4.supply[g4Good.id]--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: g4Good.id, cost: g4Good.price, points: state.items.points[id], supply: state.g4.supply[g4Good.id] }); break;
        }
        const g3Good = G3_GOODS.find(g => g.id === action.itemId);
        if (g3Good) {
          if (!state.g3 || actionLocked(state.g2?.players[command.playerId])) return { ok: false, reason: 'illegal-action' };
          const id = command.playerId, inventory = state.effects.inventory[id];
          if (g2PurchaseReason(inventory, state.items.points[id], state.g3.supply[g3Good.id], g3Good.id, g3Good.price)) return { ok: false, reason: 'insufficient-funds' };
          inventory[g3Good.id]++; state.items.points[id] -= g3Good.price; state.g3.supply[g3Good.id]--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: g3Good.id, cost: g3Good.price, points: state.items.points[id], supply: state.g3.supply[g3Good.id] }); break;
        }
        const g2Good = G2_GOODS.find(g => g.id === action.itemId);
        if (g2Good) {
          if (!state.g2 || actionLocked(state.g2.players[command.playerId])) return { ok: false, reason: 'illegal-action' };
          const id = command.playerId, inventory = state.effects.inventory[id];
          if (g2PurchaseReason(inventory, state.items.points[id], state.g2.supply[g2Good.id], g2Good.id, g2Good.price)) return { ok: false, reason: 'insufficient-funds' };
          inventory[g2Good.id] = (inventory[g2Good.id] ?? 0) + 1;
          state.items.points[id] -= g2Good.price; state.g2.supply[g2Good.id]--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: g2Good.id, cost: g2Good.price, points: state.items.points[id], supply: state.g2.supply[g2Good.id] });
          break;
        }
        const g1Good = G1_GOODS.find(g => g.id === action.itemId);
        if (g1Good) {
          if (!state.g1) return { ok: false, reason: 'illegal-action' };
          const playerId = state.players[state.active].id, inventory = state.effects.inventory[playerId];
          if (g1PurchaseReason(inventory, state.items.points[playerId], state.g1.supply[g1Good.id], g1Good.price)) return { ok: false, reason: 'insufficient-funds' };
          inventory[g1Good.id] = (inventory[g1Good.id] ?? 0) + 1;
          state.items.points[playerId] -= g1Good.price; state.g1.supply[g1Good.id]--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: g1Good.id, cost: g1Good.price, points: state.items.points[playerId], supply: state.g1.supply[g1Good.id] });
          break;
        }
        if (action.itemId === WEALTH_CARD) {
          if (!state.wealth) return { ok: false, reason: 'illegal-action' };
          const playerId = state.players[state.active].id, inventory = state.effects.inventory[playerId];
          if (wealthPurchaseReason(inventory, state.items.points[playerId], state.wealth.supply)) return { ok: false, reason: 'insufficient-funds' };
          inventory[WEALTH_CARD] = (inventory[WEALTH_CARD] ?? 0) + 1;
          state.items.points[playerId] -= WEALTH_RULES.price; state.wealth.supply--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: WEALTH_CARD, cost: WEALTH_RULES.price, points: state.items.points[playerId], supply: state.wealth.supply });
          break;
        }
        if (action.itemId === EQUAL_CASH) {
          if (!state.cards) return { ok: false, reason: 'illegal-action' };
          const playerId = state.players[state.active].id, inventory = state.effects.inventory[playerId];
          if (cardPurchaseReason(inventory, state.items.points[playerId], state.cards.supply)) return { ok: false, reason: 'insufficient-funds' };
          inventory[EQUAL_CASH] = (inventory[EQUAL_CASH] ?? 0) + 1;
          state.items.points[playerId] -= CARD_RULES.price; state.cards.supply--;
          state.pending = { ...shop, id: token() };
          emit({ type: 'itemBought', itemId: EQUAL_CASH, cost: CARD_RULES.price, points: state.items.points[playerId], supply: state.cards.supply });
          break;
        }
        const good = state.roadTools && ROAD_GOODS.find(good => good.id === action.itemId);
        if (action.itemId !== REMOTE_DICE && !good) return { ok: false, reason: 'illegal-action' };
        const id = state.players[state.active].id, quantity = state.effects.inventory[id][action.itemId] ?? 0;
        const price = good ? good.price : ITEM_RULES.price;
        const supply = good ? state.roadTools!.supply[good.id] : state.items.supply;
        if (quantity >= ITEM_RULES.capacity || supply <= 0 || state.items.points[id] < price) return { ok: false, reason: 'insufficient-funds' };
        state.effects.inventory[id][action.itemId] = quantity + 1; state.items.points[id] -= price;
        if (good) state.roadTools!.supply[good.id]--; else state.items.supply--;
        state.pending = { ...shop, id: token() };
        emit({ type: 'itemBought', itemId: action.itemId, cost: price, points: state.items.points[id], supply: supply - 1 });
        break;
      }
      case 'leaveShop':
        if (!state.items || state.phase !== 'shop' || state.pending?.kind !== 'shop' || state.pending.id !== action.decisionId) return { ok: false, reason: 'illegal-action' };
        closeShopLedger(state,emit);
        emit({ type: 'shopClosed', node: state.pending.node }); state.pending = null; state.phase = 'turnEnd'; break;
      case 'pause':
        if (typeof action.value !== 'boolean' || action.value === state.paused) return { ok: false, reason: 'illegal-action' };
        state.paused = action.value; emit({ type: 'paused', value: action.value });
        break;
      case 'traffic': {
        if (state.g5?.engineers[command.playerId]) return { ok: false, reason: 'illegal-action' };
        const m = state.g2?.players[command.playerId];
        if (!m || state.phase !== 'idle' || actionLocked(m) || !Number.isInteger(action.diceCount) || (action.dismount !== undefined && typeof action.dismount !== 'boolean')) return { ok: false, reason: 'illegal-action' };
        if (action.diceCount < 1 || action.diceCount > (action.dismount ? 1 : maxDice(m.vehicle))) return { ok: false, reason: 'illegal-action' };
        if (action.dismount && m.vehicle !== 'foot') { state.effects!.inventory[command.playerId][m.vehicle]++; m.vehicle = 'foot'; }
        m.diceCount = action.diceCount;
        emit({ type: 'mobilityChanged', targetId: command.playerId, mobility: structuredClone(m), reason: '交通设置' });
        break;
      }
      case 'roll': {
        if (state.phase !== 'idle') return { ok: false, reason: 'illegal-action' };
        if (state.g2) {
          const m = state.g2.players[command.playerId];
          if (detained(m) || m.winter) return { ok: false, reason: 'illegal-action' };
          if (m.stop) { state.g2.lastDice = []; state.dice = 0; state.phase = 'turnEnd'; state.pending = null; emit({ type: 'turnSkipped', reason: 'stop' }); break; }
          const values: number[] = [];
          if (m.turtle) values.push(1);
          else for (let i = 0; i < m.diceCount; i++) { const roll = drawDice(state.randomState); state.randomState = roll.state; values.push(roll.value); }
          state.g2.lastDice = values;
          const total = values.reduce((sum, n) => sum + n, 0);
          emit({ type: 'diceRolled', values, total }); startRoll(total); break;
        }
        const roll = drawDice(state.randomState);
        state.randomState = roll.state; startRoll(roll.value);
        break;
      }
      case 'animationDone': {
        const pending = state.pending;
        if (!pending || pending.id !== action.token || (pending.kind !== 'roll' && pending.kind !== 'segment')) return { ok: false, reason: 'illegal-action' };
        if (pending.kind === 'segment') {
          const player = state.players[state.active];
          player.previous = pending.from; player.node = pending.to; state.remaining--;
          if (state.g1) delete state.g1.facing[player.id];
          emit({ type: 'nodeEntered', node: player.node });
          if (g5Entered(state, [...this.nodes.values()], this.definitions, emit)) { state.completed++; break; }
          if (state.roadTools?.blocks.includes(player.node)) {
            state.roadTools.blocks = state.roadTools.blocks.filter(node => node !== player.node);
            state.roadTools.supply[ROADBLOCK]++;
            emit({ type: 'roadblockRemoved', node: player.node, reason: 'stop', supply: state.roadTools.supply[ROADBLOCK] });
            emit({ type: 'roadblockStopped', node: player.node, discarded: state.remaining });
            state.remaining = 0;
          }
          if (!state.remaining && isBankNode(this.nodes.get(player.node)!) && g5Landed(state, [...this.nodes.values()], emit)) { state.completed++; break; }
          if (state.finance && !state.g2?.players[player.id].dream && isBankNode(this.nodes.get(player.node)!)) {
            state.phase = 'bank';
            state.pending = { kind: 'bank', id: token(), node: player.node, arrival: state.remaining ? 'passing' : 'landing' };
            emit({ type: 'bankOffered', decision: structuredClone(state.pending) });
            break;
          }
        }
        next();
        break;
      }
      case 'choose':
        if (state.pending?.kind !== 'branch' || state.pending.id !== action.decisionId ||
          !state.pending.choices.includes(action.node)) return { ok: false, reason: 'illegal-action' };
        emit({ type: 'branchChosen', node: action.node }); startSegment(action.node);
        break;
      case 'property': {
        const pending = state.pending, economy = state.economy;
        if (state.phase !== 'property' || !economy || pending?.kind !== 'property' ||
          pending.id !== action.decisionId || typeof action.accept !== 'boolean' ||
          (!action.accept && pending.operation === 'rent')) return { ok: false, reason: 'illegal-action' };
        const property = economy.properties.find((p) => p.id === pending.propertyId)!;
        if (action.accept && pending.buildingChoices ? !pending.buildingChoices.includes(action.buildingType!) : action.buildingType !== undefined) return { ok: false, reason: 'illegal-action' };
        if (action.accept) {
          const player = state.players[state.active];
          const balance = economy.balances[pending.payerId ?? player.id];
          const paid = paymentSplit(balance, pending.amount, pending.operation === 'rent');
          if (!paid) return { ok: false, reason: 'insufficient-funds' };
          balance.cash -= paid.cash; balance.bank -= paid.bank;
          if (pending.operation === 'buy') property.ownerId = player.id;
          if (pending.operation === 'upgrade') { if (pending.buildingChoices) property.buildingType = action.buildingType!; property.level++; }
          if (state.g4 && pending.hotelTurns) { state.g4.hotel[pending.payerId ?? player.id] = pending.hotelTurns - 1 || 128; emit({ type: 'hotelChanged', playerId: pending.payerId ?? player.id, remaining: state.g4.hotel[pending.payerId ?? player.id] }); claimInsurance(state,pending.payerId??player.id,pending.hotelTurns*2000*priceIndex(state),'住宿',emit); }
          // Reference toll call uses flags=0: payer cash first, recipient bank account.
          if (pending.recipientId) economy.balances[pending.recipientId].bank += pending.amount;
          emit({ type: 'propertySettled', ...(pending.payerId ? { payerId: pending.payerId } : {}), propertyId: property.id, operation: pending.operation,
            amount: pending.amount, level: property.level, recipientId: pending.recipientId, paid });
        } else emit({ type: 'propertySkipped', propertyId: property.id });
        state.phase = 'turnEnd'; state.pending = null;
        break;
      }
      case 'loan':
        if(state.phase!=='bank'||state.pending?.kind!=='bank'||state.pending.id!==action.decisionId||!bankLoan(state,action.operation,action.amount,this.definitions,emit))return {ok:false,reason:'illegal-action'};
        break;
      case 'bank': {
        const pending = state.pending;
        if (!state.finance || !state.economy || state.phase !== 'bank' || pending?.kind !== 'bank' ||
          pending.id !== action.decisionId) return { ok: false, reason: 'illegal-action' };
        const playerId = state.players[state.active].id;
        if (state.news?.business?.bankRejected?.[playerId]) return { ok: false, reason: 'illegal-action' };
        const balance = bankTransfer(state.economy.balances[playerId], action.operation, action.amount);
        if (!balance) return { ok: false, reason: 'illegal-action' };
        state.economy.balances[playerId] = balance;
        // A successful transfer consumes its decision token, preventing a repeated click from transferring twice.
        state.pending = { ...pending, id: token() };
        emit({ type: 'bankTransferred', operation: action.operation, amount: action.amount, balance: { ...balance } });
        break;
      }
      case 'leaveBank': {
        const pending = state.pending;
        if (!state.finance || state.phase !== 'bank' || pending?.kind !== 'bank' || pending.id !== action.decisionId)
          return { ok: false, reason: 'illegal-action' };
        emit({ type: 'bankClosed', node: pending.node }); next();
        break;
      }
      case 'surrender': {
        if(!canSurrender(state))return {ok:false,reason:'illegal-action'};
        const playerId=state.players[state.active].id;
        state.g6!.surrender!.sourceId=playerId;
        // Explicit Web boundary: irreversible menu exit invalidates pre-exit worlds.
        state.g7!.checkpoints=Object.fromEntries(state.players.map(p=>[p.id,null]));
        emit({type:'surrenderStarted',sourceId:playerId});
        beginRentDisposal(state,this.definitions,{kind:'debt',id:token(),payerId:playerId,recipientId:'public',propertyId:'surrender',amount:0,lines:[],available:0,shortfall:0},token,emit,()=>{
          const cleanup=advanceEffects(state.effects!,{...effectContext(),players:state.players.map(p=>({id:p.id,alive:!state.finance!.eliminated.includes(p.id)}))},{sequence:this.log.length+emitted.length+1,kind:'playerEliminated',playerId},this.effectRegistry);
          if(!cleanup.ok)throw Error('Surrender cleanup failed');state.effects=cleanup.state;cleanup.events.forEach(emit);
        },'surrender');
        break;
      }
      case 'chooseDeath':
        if(!chooseDeath(state,action.decisionId,action.targetId,emit))return {ok:false,reason:'illegal-action'};break;
      case 'settleDebt': {
        const pending = state.pending, economy = state.economy, finance = state.finance;
        if (!finance || !economy || state.phase !== 'debt' || pending?.kind !== 'debt' || pending.id !== action.decisionId)
          return { ok: false, reason: 'illegal-action' };
        const playerId = pending.payerId ?? state.players[state.active].id;
        const balance = economy.balances[playerId];
        const amount = balance.cash + balance.bank;
        if (amount >= pending.amount || finance.eliminated.includes(pending.recipientId)) return { ok: false, reason: 'illegal-action' };
        if(state.rulesId===DISPOSAL_RULES.id||state.rulesId===PAYMENT_RULES.id||(state.rulesId === BATCH_RULES.id || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47'))))))))))))){
          beginRentDisposal(state,this.definitions,pending,token,emit,()=>{
            const cleanup=advanceEffects(state.effects!,{...effectContext(),players:state.players.map(p=>({id:p.id,alive:!state.finance!.eliminated.includes(p.id)}))},{sequence:this.log.length+emitted.length+1,kind:'playerEliminated',playerId},this.effectRegistry);
            if(!cleanup.ok)throw Error('Disposal effect cleanup failed');state.effects=cleanup.state;cleanup.events.forEach(emit);
          });break;
        }
        const paid = { ...balance };
        economy.balances[playerId] = { cash: 0, bank: 0 };
        economy.balances[pending.recipientId].bank += amount;
        emit({ type: 'debtSettled', ...(pending.payerId ? { payerId: playerId } : {}), propertyId: pending.propertyId, recipientId: pending.recipientId,
          due: pending.amount, amount, unpaid: pending.amount - amount, paid });
        eliminatePlayer(playerId, !!pending.payerId);
        state.pending = null; state.remaining = 0; state.phase = 'turnEnd';
        const survivors = state.players.filter((p) => !finance.eliminated.includes(p.id));
        if (survivors.length === 1) {
          finance.winnerId = survivors[0].id;
          state.phase = 'finished';
          emit({ type: 'gameEnded', winnerId: finance.winnerId });
        }
        break;
      }
      case 'buyLottery':
        if(!buyLottery(state,action.decisionId,action.number,emit))return {ok:false,reason:'illegal-action'};break;
      case 'leaveLottery':
        if(state.phase!=='lottery'||state.pending?.kind!=='lottery'||state.pending.id!==action.decisionId)return {ok:false,reason:'illegal-action'};
        state.pending=null;state.phase='turnEnd';break;
      case 'collectFortuneCard':
        if(!collectFortuneCard(state,action.decisionId,action.itemId,token,emit))return {ok:false,reason:'illegal-action'};break;
      case 'ackFortune':
        if(state.phase!=='fortune'||state.pending?.kind!=='fortune'||state.pending.id!==action.decisionId||!!state.pending.collection)return {ok:false,reason:'illegal-action'};
        if(ackNestedFortune(state,[...this.nodes.values()],this.definitions,token,emit,id=>eliminatePlayer(id,true)))break;
        state.pending=null;state.phase=state.finance!.winnerId?'finished':'turnEnd';
        if(state.finance!.winnerId)emit({type:'gameEnded',winnerId:state.finance!.winnerId});break;
      case 'magicBuild':
        if(!buildMagic(state,action.decisionId,action.buildingType,[...this.nodes.values()],this.definitions,token,emit))return {ok:false,reason:'illegal-action'};break;
      case 'magic':
        if(!operateMagicNested(state,action.decisionId,action.effect,[...this.nodes.values()],this.definitions,token,emit,id=>eliminatePlayer(id,true)))return {ok:false,reason:'illegal-action'};break;
      case 'spinInsurance':
        if(!spinInsurance(state,action.decisionId,token,emit,id=>eliminatePlayer(id,true)))return {ok:false,reason:'illegal-action'};break;
      case 'constructCompany':
        if(!constructCompany(state,this.definitions,action.decisionId,action.propertyId,action.buildingType,token,emit,id=>eliminatePlayer(id,true)))return {ok:false,reason:'illegal-action'};break;
      case 'subscribeCompany':
        if(!subscribeCompany(state,action.decisionId,action.quantity,emit))return {ok:false,reason:'illegal-action'};break;
      case 'ackCompany':
        if(state.phase!=='company'||state.pending?.kind!=='company'||state.pending.id!==action.decisionId)return {ok:false,reason:'illegal-action'};
        if(offerSubscription(state,token))break;
        state.pending=null;state.phase=state.finance!.winnerId?'finished':'turnEnd';if(state.finance!.winnerId)emit({type:'gameEnded',winnerId:state.finance!.winnerId});break;
      case 'ackNews':
        if (state.phase !== 'news' || state.pending?.kind !== 'news' || state.pending.id !== action.decisionId) return { ok:false, reason:'illegal-action' };
        if(state.pending.auction){startPublicAuction(state,this.definitions,state.pending,token,emit);break;}
        state.pending=null; state.phase=state.finance!.winnerId?'finished':'turnEnd';
        if(state.finance!.winnerId)emit({type:'gameEnded',winnerId:state.finance!.winnerId});break;
      case 'endTurn':
        if (state.phase !== 'turnEnd') return { ok: false, reason: 'illegal-action' };
        finishGodLanding(state, this.definitions, emit);
        if (state.g5) { finishEngineerLanding(state, this.definitions, emit); tickEngineer(state, emit); }
        if((state.rulesId === BATCH_RULES.id || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47'))))))))))))){
          const next=nextSolventIndex(state.players.map(p=>p.id),state.finance!.eliminated,state.active);
          if(next<0||next===state.active)return {ok:false,reason:'illegal-action'};
          if(next<=state.active){
            state.finance!.round++;const monthChanged=advanceCalendar(state,emit);
            updatePriceIndex(state,this.definitions,emit);ageSales(state,emit);tickProperties(state,emit);
            tickBusinessRound(state);marketTick(state,emit);settleFestival(state,emit);
            state.finance!.batches!.day={monthChanged};beginDividendBatch(state,emit);
          }else{state.active=next;startIncomingTurn();}
          break;
        }
        if (state.finance) {
          const nextIndex = nextSolventIndex(state.players.map((p) => p.id), state.finance.eliminated, state.active);
          if (nextIndex < 0 || nextIndex === state.active) return { ok: false, reason: 'illegal-action' };
          if (nextIndex <= state.active) { state.finance.round++; const monthChanged=advanceCalendar(state,emit); updatePriceIndex(state,this.definitions,emit); ageSales(state,emit); if (state.g4) tickProperties(state, emit); if (state.g6) { tickBusinessRound(state); marketTick(state, emit); settleFestival(state,emit); settleDividends(state,emit,id=>eliminatePlayer(id,true)); drawLottery(state,emit); if(monthChanged){settleMonthly(state,emit);refreshSpecialObjects(state,emit);} if (state.finance.round % 5 === 0) replenishGods(state, [...this.nodes.values()]); } }
          if((state.rulesId === DIVIDEND_RULES.id || (state.rulesId === COMPANY_RULES.id || (state.rulesId === COMMERCE_RULES.id || (state.rulesId === 'japan-events-candidate-v29' || (state.rulesId === 'japan-events-candidate-v30' || (state.rulesId === 'japan-events-candidate-v31' || (state.rulesId === 'japan-events-candidate-v32' || (state.rulesId === 'japan-events-candidate-v33' || (state.rulesId === 'japan-events-candidate-v34' || (state.rulesId === 'japan-events-candidate-v35' || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))){
            const survivors=state.players.filter(p=>!state.finance!.eliminated.includes(p.id));
            if(survivors.length<=1){state.finance.winnerId=survivors[0]?.id??null;state.phase='finished';state.pending=null;state.remaining=0;if(survivors.length)emit({type:'gameEnded',winnerId:survivors[0].id});break;}
            state.active=nextSolventIndex(state.players.map(p=>p.id),state.finance.eliminated,state.active);
          }else state.active = nextIndex;
        } else state.active = (state.active + 1) % state.players.length;
        startIncomingTurn();
        break;
      default: return { ok: false, reason: 'illegal-action' };
    }
    if (!(command.action.type === 'item' && command.action.action.type === 'confirm' && before.effects?.pending?.definitionId === 'tool:10:time-v1')) reconcileEngineers(state, before, emit);
    // Each completed callback can unlock the next seat, then the outer date. No UI command can skip it.
    for(let pass=0;pass<((state.rulesId === BATCH_RULES.id || (state.rulesId === 'japan-events-candidate-v36' || (state.rulesId === 'japan-events-candidate-v37' || (state.rulesId === 'japan-events-candidate-v38' || (state.rulesId === 'japan-events-candidate-v39' || (state.rulesId === 'japan-events-candidate-v40' || (state.rulesId === 'japan-events-candidate-v41' || (state.rulesId === 'japan-events-candidate-v42' || (state.rulesId==='japan-events-candidate-v43' || (state.rulesId === 'japan-events-candidate-v44' || (state.rulesId === 'japan-events-candidate-v45' || (state.rulesId === 'japan-events-candidate-v46' || state.rulesId === 'japan-events-candidate-v47'))))))))))))?state.players.length+3:1);pass++){
      advanceBatch(state,token,emit);
      startQueuedPayment(state,this.definitions,token,emit,id=>{const cleanup=advanceEffects(state.effects!,{...effectContext(),players:state.players.map(p=>({id:p.id,alive:!state.finance!.eliminated.includes(p.id)}))},{sequence:this.log.length+emitted.length+1,kind:'playerEliminated',playerId:id},this.effectRegistry);if(!cleanup.ok)throw Error('Payment effect cleanup failed');state.effects=cleanup.state;cleanup.events.forEach(emit);});
      continueDisposal(state,this.definitions,token,emit);
      resumePayment(state,token,emit);
      if(state.finance?.disposal?.current)break;
      advanceBatch(state,token,emit);
      resumeDay();
      if(!state.finance?.payments?.current&&!state.finance?.batches?.current)break;
    }
    resumeSurrender(state,token,emit);
    advanceMagicNested(state,[...this.nodes.values()],this.definitions,token,emit,id=>eliminatePlayer(id,true));
    if(state.rulesId===PAYMENT_RULES.id&&state.pending?.kind==='fortune')state.pending.scope='日本37槽命运、公司及保险沿用已实现规则；负值命运先完成退出处置，再将实付计入公共资金。新闻税/负分红多人破产回调仍待接入。';
    if(!state.finance?.disposal?.last?.finishedGame){reconcileResearch(state, this.definitions, emit);cleanCompanies(state);}
    pruneSales(state,emit);
    syncCardSlots(state);
    syncLoanDates(state,emit);
    state.revision++;
    this.current = state;
    this.accepted.add(command.id);
    this.commands.push(structuredClone(command));
    this.log.push(...emitted);
    return { ok: true, events: structuredClone(emitted) };
  }
}

export function replayGame(nodes: readonly MapNode[], replay: Replay, definitions: readonly PropertyDefinition[] = PROPERTY_CATALOG.properties): GameEngine {
  if (replay.version !== 1 || (replay.rulesId !== TURN_RULES.id && replay.rulesId !== ECONOMY_RULES.id && replay.rulesId !== FINANCE_RULES.id && replay.rulesId !== ITEM_RULES.id && replay.rulesId !== CONSTRUCTION_RULES.id && replay.rulesId !== NEARBY_RULES.id && replay.rulesId !== ROAD_RULES.id && replay.rulesId !== CARD_RULES.id && replay.rulesId !== WEALTH_RULES.id && replay.rulesId !== G1_RULES.id && replay.rulesId !== G2_RULES.id && replay.rulesId !== G3_RULES.id && replay.rulesId !== G4_RULES.id && replay.rulesId !== G5_RULES.id && replay.rulesId !== G6_RULES.id && replay.rulesId !== G7_RULES.id && replay.rulesId !== MAP_EVENT_RULES.id && replay.rulesId !== NEWS_RULES.id && replay.rulesId !== PROPERTY_NEWS_RULES.id && replay.rulesId !== OPERATING_NEWS_RULES.id && replay.rulesId !== STATUS_NEWS_RULES.id && replay.rulesId !== COMPLETE_NEWS_RULES.id && replay.rulesId !== FORTUNE_RULES.id && replay.rulesId !== ASSET_FORTUNE_RULES.id && replay.rulesId !== TRAFFIC_FORTUNE_RULES.id && replay.rulesId !== FINAL_FORTUNE_RULES.id && replay.rulesId !== CALENDAR_RULES.id && replay.rulesId !== LOTTERY_RULES.id && replay.rulesId !== DIVIDEND_RULES.id && (replay.rulesId !== COMPANY_RULES.id && (replay.rulesId !== COMMERCE_RULES.id && (replay.rulesId !== 'japan-events-candidate-v29' && (replay.rulesId !== 'japan-events-candidate-v30' && (replay.rulesId !== 'japan-events-candidate-v31' && (replay.rulesId !== 'japan-events-candidate-v32' && (replay.rulesId !== 'japan-events-candidate-v33' && (replay.rulesId !== 'japan-events-candidate-v34' && (replay.rulesId !== 'japan-events-candidate-v35' && (replay.rulesId !== 'japan-events-candidate-v36' && (replay.rulesId !== 'japan-events-candidate-v37' && (replay.rulesId !== 'japan-events-candidate-v38' && (replay.rulesId !== 'japan-events-candidate-v39' && (replay.rulesId !== 'japan-events-candidate-v40' && (replay.rulesId !== 'japan-events-candidate-v41' && (replay.rulesId !== 'japan-events-candidate-v42' && (replay.rulesId!=='japan-events-candidate-v43' && (replay.rulesId !== 'japan-events-candidate-v44' && (replay.rulesId !== 'japan-events-candidate-v45' && (replay.rulesId !== 'japan-events-candidate-v46' && replay.rulesId !== 'japan-events-candidate-v47')))))))))))))))))))))) throw new Error('不支持的回放规则版本');
  const engine = new GameEngine(nodes, replay.config, definitions);
  if (engine.state.rulesId !== replay.rulesId) throw new Error('回放规则与开局配置不一致');
  if (engine.state.items?.fingerprint !== replay.itemFingerprint) throw new Error('回放道具规则与当前配置不一致');
  if (engine.state.economy?.catalogFingerprint !== replay.catalogFingerprint) throw new Error('回放地产配置与当前配置不一致');
  if (engine.state.mapFingerprint !== replay.mapFingerprint) throw new Error('回放地图与当前地图不一致');
  for (const command of replay.commands) {
    const result = engine.dispatch(command);
    if (!result.ok) throw new Error(`回放命令 ${command.id} 无效：${result.reason}`);
  }
  return engine;
}
