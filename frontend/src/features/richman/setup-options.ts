import type { SessionOptions } from './game/session';
import type { ComputerPolicy } from './game/computer';
import { modeIncludes } from './mode-help';

export const SETUP_MODES: { id: SessionOptions['mode']; label: string }[] = [
  {
    "id": "surrender",
    "label": "认输与衰神候选（v47）"
  },
  {
    "id": "specialObjects",
    "label": "特殊道路对象候选（v46）"
  },
  {
    "id": "godPairs",
    "label": "神仙配对刷新对局（v45，普通五组）"
  },
  {
    "id": "stockCircuit",
    "label": "日本股票组合（v44候选）"
  },
  {
    "id": "stockLedger",
    "label": "日本股票账本（v43候选）"
  },
  {
    "id": "stockMarket",
    "label": "日本股票行情（v42候选）"
  },
  {
    "id": "minigames",
    "label": "日本小游戏（v41候选）"
  },
  {
    "id": "shopAcquisition",
    "label": "商店赠品与货架（v40候选）"
  },
  {
    "id": "siteServices",
    "label": "地点服务候选 v39（探访与商店卖出）"
  },
  {
    "id": "magicNested",
    "label": "魔法屋十二效果（v38候选）"
  },
  {
    "id": "magicActions",
    "label": "魔法屋十效果（v37候选）"
  },
  {
    "id": "magic",
    "label": "魔法屋六效果（v36候选）"
  },
  {
    "id": "batches",
    "label": "多人税款与分红破产（v35）"
  },
  {
    "id": "payments",
    "label": "公司/命运/贷款破产（v34）"
  },
  {
    "id": "disposal",
    "label": "租金破产处置（v33）"
  },
  {
    "id": "estateSales",
    "label": "地产挂牌与竞价（v32）"
  },
  {
    "id": "indexedEconomy",
    "label": "物价与地产经营（v31）"
  },
  {
    "id": "dateBusiness",
    "label": "节日与日期经营（v30）"
  },
  {
    "id": "insurance",
    "label": "保险与公司经营（v29）"
  },
  {
    "id": "commerce",
    "label": "日产建造与现场认股（v28）"
  },
  {
    "id": "company",
    "label": "公司营业首组候选 · v27"
  },
  {
    "id": "dividends",
    "label": "公司日期分红候选 · v26"
  },
  {
    "id": "lottery",
    "label": "彩票与日期开奖候选 · v25"
  },
  {
    "id": "calendar",
    "label": "日期与银行结算候选 · v24"
  },
  {
    "id": "finalFortune",
    "label": "日本37槽命运候选 · v23"
  },
  {
    "id": "trafficFortune",
    "label": "交通命运候选（32项＋完整新闻）"
  },
  {
    "id": "assetFortune",
    "label": "资产命运候选（21项＋完整新闻）"
  },
  {
    "id": "fortune",
    "label": "命运候选（16项＋完整新闻）"
  },
  {
    "id": "completeNews",
    "label": "完整新闻候选（36条）"
  },
  {
    "id": "statusNews",
    "label": "新闻状态候选（十七条）"
  },
  {
    "id": "operatingNews",
    "label": "新闻经营候选（十一条）"
  },
  {
    "id": "propertyNews",
    "label": "新闻事件候选（八条，含地产组）"
  },
  {
    "id": "news",
    "label": "新闻事件候选（首批四条）"
  },
  {
    "id": "events",
    "label": "地图事件候选（随机得卡）"
  },
  {
    "id": "g7",
    "label": "完整物品候选（G7）"
  },
  {
    "id": "g6",
    "label": "神仙与股票（G6 四卡）"
  },
  {
    "id": "g5",
    "label": "建拆与道路攻击（G5 七项）"
  },
  {
    "id": "g4",
    "label": "地产经营对局（G4 五卡）"
  },
  {
    "id": "g3",
    "label": "反应与同盟对局（六卡组合）"
  },
  {
    "id": "g2",
    "label": "状态与车辆对局（七项组合）"
  },
  {
    "id": "g1",
    "label": "地产与方向卡片对局（五卡组合）"
  },
  {
    "id": "wealth",
    "label": "卡片与道具对局（均富卡＋均贫卡）"
  },
  {
    "id": "cards",
    "label": "卡片与道具对局（均贫卡）"
  },
  {
    "id": "roadTools",
    "label": "道具组合对局（路障与机器娃娃）"
  },
  {
    "id": "nearby",
    "label": "邻近建造对局（候选版）"
  },
  {
    "id": "construction",
    "label": "建造对局（机器工人限定版）"
  },
  {
    "id": "tools",
    "label": "道具对局（遥控骰子，候选规则）"
  },
  {
    "id": "economy",
    "label": "地产对局（2–4 人，候选规则）"
  },
  {
    "id": "turns",
    "label": "仅移动（2–4 人）"
  },
  {
    "id": "sandbox",
    "label": "自由验证（四角色手动切换）"
  }
];
export const COMPUTER_POLICIES: { id: ComputerPolicy; label: string }[] = [
  {
    "id": "basic-v1",
    "label": "基础：购地与资金"
  },
  {
    "id": "tools-v1",
    "label": "道具：遥控骰子与机器工人"
  },
  {
    "id": "rent-v1",
    "label": "租金：免费与嫁祸反应（含道具）"
  },
  {
    "id": "defense-v1",
    "label": "防御：陷害与梦游嫁祸（含租金/道具）"
  },
  {
    "id": "estate-v1",
    "label": "地产：购地、换地、换屋与拆除（含防御）"
  },
  {
    "id": "cash-v1",
    "label": "资金：均贫、均富与查税（含地产）"
  },
  {
    "id": "status-v1",
    "label": "状态：停留、冬眠、梦游、陷害与乌龟（含资金）"
  },
  {
    "id": "inventory-v1",
    "label": "库存：抢夺与同盟（含状态）"
  },
  {
    "id": "commerce-v1",
    "label": "经营：改建、拍卖、涨价与查封（含库存）"
  },
  {
    "id": "area-v1",
    "label": "建拆：天使、恶魔与怪兽（含经营）"
  },
  {
    "id": "roads-v1",
    "label": "道路：清路、放置与飞弹（含建拆）"
  },
  {
    "id": "research-v1",
    "label": "高级科研（research-v1）"
  },
  {
    "id": "capital-v1",
    "label": "股票与资金（capital-v1）"
  },
  {
    "id": "gods-v1",
    "label": "神仙与行情卡（gods-v1）"
  },
  {
    "id": "mobility-v1",
    "label": "移动：转向、机车、汽车与工程车（含道路）"
  }
];
export const hasFunds = (mode: SessionOptions['mode']) => !['turns','sandbox'].includes(mode);
export const hasCalendar = (mode: SessionOptions['mode']) => modeIncludes(mode,'calendar');
export const hasComputer = (mode: SessionOptions['mode']) => ['stockCircuit','godPairs','specialObjects','surrender'].includes(mode);
