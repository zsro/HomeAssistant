import { COMPLETE_NEWS_FINGERPRINT } from './news';
import { hashSeed } from './random';
export const FORTUNE_NODES = [2, 19, 45, 66] as const;
export const FORTUNE_CATALOG = [
  { id:17, title:'请客吃饭', amount:-6000 }, { id:18, title:'乱丢垃圾罚款', amount:-600 },
  { id:19, title:'宠物违规罚款', amount:-1500 }, { id:20, title:'路上捡到钱', amount:1000 },
  { id:21, title:'路上捡到钱', amount:2000 }, { id:22, title:'路上捡到钱', amount:3000 },
  { id:23, title:'遗失钱包', amount:-1000 }, { id:24, title:'遗失钱包', amount:-2000 },
  { id:25, title:'获得遗产', amount:10000 }, { id:26, title:'遭遇诈骗', amount:-8000 },
  { id:27, title:'中奖奖金', amount:4000 }, { id:28, title:'中奖奖金', amount:6000 },
  { id:29, title:'中奖奖金', amount:8000 }, { id:30, title:'支付保险费', amount:-5000 },
  { id:31, title:'领取保险金', amount:5000 }, { id:32, title:'变卖全部卡片道具', amount:0 },
] as const;
// Tables ref_00474a06 / ref_00474a2a, signed words indexed by god type. Base is zero.
export const FORTUNE_GOD_MONEY = [0,100,150,0,0,-60,-100,0,0,60,-60,0,0,0,0,-200];
export const FORTUNE_GOD_RESISTANCE = [0,0,0,100,150,0,0,-60,-100,60,-60,0,0,0,0,-200];
export const TOOL_SELL_PRICES = [0,15,30,25,25,80,150,100,30,30,40,95,150,250];
export const FORTUNE_RULES = Object.freeze({ id:'japan-events-candidate-v20', version:1, base:'japan-events-candidate-v19',
 selection:'37-ranked-without-replacement-after-news;cursor0;advance-through-success;wrap-no-reshuffle;17-32-enabled-bounded37;regional33-36-plus-map4-deferred',
 money:'price1;rewards-cash;fees-cash-then-bank-real-paid-public-fund;no-stock-rescue;Web-bankruptcy-no-original-auction-no-insurance-policy',
 gods:'signed70-money-signed72-inventory;zero-base-attached-type-table;gt100-good-guaranteed-51to100-random-bit-negative-bad;cancel1-double2;inventory-no-double',
 inventory:'sell-card-price-tool1to13-full-price;equipped-vehicle-included-foot1-engineer-cleared;finite-pools-return-research-no-pool;points-u16;road-objects-and-carried-bombs-kept',
 timing:'landing2-19-45-66-after-hazards-gods-not-pass-dream;atomic-ack-only;self-teleport;time-restores-order-cursor-not-rng',
 scope:'16of37-per-map-slots-16of49-global-handlers;Web-seeded-RNG;date-interest-loan-maturity-full-company-original-bankruptcy-deferred' });
export const FORTUNE_FINGERPRINT = hashSeed(JSON.stringify({ base:COMPLETE_NEWS_FINGERPRINT, rules:FORTUNE_RULES, catalog:FORTUNE_CATALOG, nodes:FORTUNE_NODES, money:FORTUNE_GOD_MONEY, resistance:FORTUNE_GOD_RESISTANCE, prices:TOOL_SELL_PRICES })).toString(16);
