import type { SessionSnapshot } from './game/session';
import { actionLocked, detained, maxDice } from './game/g2';
import { PROPERTY_CATALOG, propertyBase } from './game/economy';
import { stockValue } from './game/g6-market';
import { weekday } from './game/calendar-date';

export const seatId = (s: SessionSnapshot, character = s.active) => `player-${s.participants.indexOf(character) + 1}`;
export function turnControls(s: SessionSnapshot | null, ready: boolean) {
  const m = s?.g2?.players[seatId(s)];
  const enabled = !!s && ready && !s.paused && !s.computer?.automatic && (!s.network || (s.network.connected && !s.network.waiting && !s.network.pending && !s.network.readOnly));
  return {
    go: enabled && (s.phase === 'turnEnd' || (s.phase === 'idle' && !detained(m) && !m?.winter)),
    select: enabled && s.phase === 'idle' && !!m && !actionLocked(m) && !s.g5?.engineers[seatId(s)],
    count: m?.diceCount ?? 1, maximum: maxDice(m?.vehicle ?? 'foot'),
    frame: m?.stop || detained(m) || m?.winter ? 2 : m?.turtle ? 4 : 0,
  };
}
/** Faces are actual roll results. A sum of 7–18 is never used as a die face. */
export function diceResult(s: SessionSnapshot | null) {
  if (!s || s.phase === 'idle' || !s.dice) return [];
  return s.g2 ? s.g2.lastDice : s.dice >= 1 && s.dice <= 6 ? [s.dice] : [];
}
export function playerRows(s: SessionSnapshot, id: string): [string, string][][] {
  const balance = s.economy?.balances[id], owned = s.economy?.properties.filter(p => p.ownerId === id);
  const def = (propertyId: string) => PROPERTY_CATALOG.properties.find(d => d.id === propertyId)!;
  const property = owned?.reduce((sum, p) => {
    const d = def(p.id);
    return sum + propertyBase(p, d) + (d.kind === 'land' && p.buildingType ? 1 : p.level) * d.upgradeCost;
  }, 0) ?? 0;
  const stocks = stockValue(s.g6, id), loans = s.news?.business?.loans[id];
  const cost = s.g6?.holdings[id] && Object.values(s.g6.holdings[id]).reduce((sum, h) => sum + h.cost, 0);
  const privateOther = !!s.network && s.network.self !== id;
  const number = (value: number | undefined) => value === undefined ? '未启用' : value.toLocaleString('zh-CN');
  return [
    [['现金', number(balance?.cash)], ['存款', number(balance?.bank)], ['净资产估值', privateOther ? '未公开' : number(balance && balance.cash + balance.bank + property + stocks - (loans ?? 0))]],
    [['土地总数', number(owned?.length)], ['已建房地块', number(owned?.filter(p => def(p.id).kind === 'land' && (p.level > 0 || !!p.buildingType)).length)], ['已建营业设施', number(owned?.filter(p => def(p.id).kind === 'facility' && p.level > 0).length)]],
    [['股票市值', privateOther ? '未公开' : s.g6 ? number(stocks) : '未启用'], ['持股成本', privateOther ? '未公开' : number(cost)], ['控股公司', number(s.news?.business?.companies.filter(c => c.ownerId === id).length)]],
    [['点数', privateOther ? '未公开' : number(s.items?.points[id])], ['贷款', number(loans)], ['其他原版资料', '暂未接入']],
  ];
}
export function calendarMonth(date: string) {
  const [year, month, today] = date.split('-').map(Number);
  const first = weekday(`${date.slice(0, 7)}-01`);
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { today, first, days, season: Math.floor(((month + 9) % 12) / 3) };
}
