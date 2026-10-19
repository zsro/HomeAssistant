import type { SessionSnapshot } from './game/session';
import { decisionSelector } from './decision-navigation';

export const WINDOW_EVENT = 'richman:open-window';
export const WINDOW_TITLES: Record<string, string> = {
  directory: '更多功能', disposal: '资产处置记录', settings: '声音设置', help: '操作帮助', players: '人物资料', items: '道具与卡片',
  stocks: '股票市场', sales: '地产出售', lottery: '彩票', insurance: '保险办理', commerce: '公司服务',
  company: '公司营业', calendar: '日历与分红', research: '研究与道路状态', 'magic-report': '魔法屋记录',
  magic: '魔法屋', facility: '设施探访', 'shop-report': '商店经营记录', fortune: '命运', news: '新闻',
  auction: '地产拍卖', reaction: '反应决策', finance: '银行与债务', property: '地产', traffic: '行动与交通',
  journey: '旅途记录', surrender: '认输与衰神', computer: '电脑状态', minigame: '小游戏', diagnostics: '运行信息与验证工具',
};
export type WindowRequest = { panel: string; title: string; selector: string; key: string; required: boolean; map: boolean; decision: boolean; minimized?: boolean };
export function decisionWindow(s: SessionSnapshot | null): WindowRequest | null {
  if (!s) return null;
  const selector = decisionSelector(s);
  if (selector === '.rm-action-bar') return null;
  const panels: Partial<Record<SessionSnapshot['phase'], string>> = {
    effect: 'items', shop: 'items', choosing: 'journey', property: 'property', bank: 'finance', debt: 'finance',
    finished: 'finance', reaction: 'reaction', auction: 'auction', news: 'news', fortune: 'fortune', magic: 'magic',
    lottery: 'lottery', company: 'company', commerce: 'commerce', facility: 'facility', surrender: 'surrender', minigame: 'minigame',
  };
  const panel = s.insuranceDecision ? 'insurance' : panels[s.phase];
  if (!panel) return null;
  const decisions = [s.insuranceDecision, s.effects?.pending, s.shopDecision, s.decision, s.bankDecision, s.debtDecision,
    s.reaction, s.auction, s.newsDecision, s.fortuneDecision, s.magicDecision, s.lotteryDecision, s.companyDecision,
    s.commerceDecision, s.facilityDecision, s.surrenderDecision, s.minigame];
  // Stable across interpolation and account edits; changes for the next real decision/responder.
  const key = [s.seed, s.turn, s.active, panel, ...decisions.map(d => d?.id ?? ''),
    s.auction?.responderId, s.reaction?.responderId, s.reaction?.stage, s.magicDecision?.stage, s.magicDecision?.responderId, s.minigame?.stage, s.debtDecision?.payerId, s.decision?.payerId,
    s.fortuneDecision?.collection ? JSON.stringify(s.fortuneDecision.collection) : ''].join(':');
  return { panel, selector, key, title: s.phase === 'finished' ? '对局结果' : WINDOW_TITLES[panel],
    required: s.phase !== 'finished', map: !s.insuranceDecision && ['effect', 'choosing', 'commerce'].includes(s.phase), decision: true };
}
