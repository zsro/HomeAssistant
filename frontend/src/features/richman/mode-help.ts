import type { SessionOptions } from './game/session';

// Presentation metadata only. Never used to authorize commands or change rules.
// These modes inherit the calendar/business increments in this order.
const businessModes: SessionOptions['mode'][] = [
  'calendar', 'lottery', 'dividends', 'company', 'commerce', 'insurance',
  'dateBusiness', 'indexedEconomy', 'estateSales', 'disposal', 'payments',
  'batches', 'magic', 'magicActions', 'magicNested', 'siteServices',
  'shopAcquisition', 'minigames', 'stockMarket', 'stockLedger', 'stockCircuit',
  'godPairs', 'specialObjects', 'surrender',
];
export function modeIncludes(mode: SessionOptions['mode'], since: typeof businessModes[number]) {
  const start = businessModes.indexOf(since);
  return start >= 0 && businessModes.indexOf(mode) >= start;
}

export function disposalHelp(mode: SessionOptions['mode']) {
  if (modeIncludes(mode, 'batches')) return '新闻税与负分红按座位等待退出处置完成，再继续当天开奖和随后贷款。退出后的拍卖所得归公共资金，不能救活退出者或代付原债。';
  if (modeIncludes(mode, 'payments')) return '租金、公司费、命运罚款及贷款到期支持退出后公共拍卖；多人新闻税和负分红处置不在此历史模式内。';
  if (modeIncludes(mode, 'disposal')) return '租金破产支持退出后公共拍卖；其他付款处置不在此历史模式内。';
  return '此历史模式未接入退出后的公共拍卖。';
}
