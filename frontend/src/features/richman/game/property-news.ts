import {consumerIndex} from './price-index';
import type { GameState } from './engine';
import type { PropertyDefinition, PropertyState } from './economy';
import { g6Draw } from './g6-random';
import { buildingName } from './g4';

export const PROPERTY_NEWS_CATALOG = [
  { id: 5, title: '随机建筑拆除并收回土地' },
  { id: 8, title: '土地最多者获现金奖励' },
  { id: 9, title: '土地最少者获现金补助' },
  { id: 15, title: '随机普通地产建筑降级' },
] as const;
export type PropertyNewsChanges = {
  candidates: string[];
  properties: { before: PropertyState; after: PropertyState }[];
  counts: { playerId: string; count: number }[];
  hotel: { playerId: string; before: number; after: number }[];
};
// The source enumerates ordinary land indices before facility indices, independently of map position.
export function newsBuildings(s: GameState, definitions: readonly PropertyDefinition[], ordinaryOnly: boolean) {
  return definitions.filter(d => (!ordinaryOnly || d.kind === 'land') && s.economy!.properties.some(p => p.id === d.id && p.level > 0))
    .sort((a,b) => Number(a.kind === 'facility') - Number(b.kind === 'facility') || Number(a.id.split(':').at(-1)) - Number(b.id.split(':').at(-1)));
}
export function propertyNewsEligible(s: GameState, id: number, definitions: readonly PropertyDefinition[]) {
  if (id === 5 || id === 15) return newsBuildings(s, definitions, id === 15).length > 0;
  return (id === 8 || id === 9) && s.economy!.properties.some(p => p.ownerId !== null) && s.players.some(p => !s.finance!.eliminated.includes(p.id));
}
export function applyPropertyNews(s: GameState, id: number, definitions: readonly PropertyDefinition[], lines: string[]) {
  const changes: PropertyNewsChanges = { candidates: [], properties: [], counts: [], hotel: [] };
  const money: {playerId:string;cashBefore:number;cashAfter:number;bankBefore:number;bankAfter:number}[] = [];
  if (id === 5 || id === 15) {
    const candidates = newsBuildings(s, definitions, id === 15);
    changes.candidates = candidates.map(d => d.id);
    const draw = g6Draw(s.randomState, candidates.length); s.randomState = draw.state;
    const d = candidates[draw.index], p = s.economy!.properties.find(p => p.id === d.id)!;
    const before = structuredClone(p), oldName = buildingName(p, d);
    if (id === 5) { p.ownerId = null; p.level = 0; p.buildingType = 0; p.research = null; }
    else { p.level = p.buildingType ? 0 : p.level - 1; if (!p.level) p.buildingType = 0; }
    changes.properties.push({ before, after: structuredClone(p) });
    const owner = (v:string|null) => v ? `玩家${v.split('-')[1]}` : '待售';
    lines.push(`${d.name}（${d.nodeIds.join('/')}号）：${oldName}${before.level}级 → ${buildingName(p,d)}${p.level}级；产权 ${owner(before.ownerId)} → ${owner(p.ownerId)}。`);
    lines.push(id === 5 ? '本次收回土地，无费用或赔偿；原涨价/查封期限保留。' : '仅这块普通地产降级，产权、现金与价格状态不变。');
    if (before.research && !p.research) lines.push('研究所生产任务已取消，未发放在研工具。');
    // fcn_0040ab4a(mode1) calls fcn_0040dffa for every facility type: release all active hotel stays.
    if (id === 5 && d.kind === 'facility') for (const player of s.players) {
      const before = s.g4!.hotel[player.id];
      if (!s.finance!.eliminated.includes(player.id) && before) {
        s.g4!.hotel[player.id] = 128; changes.hotel.push({playerId:player.id,before,after:128});
        lines.push(`玩家${player.id.split('-')[1]}住宿改为离店标记，下次自身行动解除。`);
      }
    }
  } else {
    changes.counts = s.players.filter(p => !s.finance!.eliminated.includes(p.id)).map(p => ({playerId:p.id,count:s.economy!.properties.filter(q => q.ownerId === p.id).length}));
    // Strict comparisons retain the first seat on ties, including players with no land for news9.
    const winner = changes.counts.reduce((a,b) => (id === 8 ? b.count > a.count : b.count < a.count) ? b : a);
    const amount = (id === 8 ? 10000 : 5000) * consumerIndex(s), b = s.economy!.balances[winner.playerId], before = {...b};
    b.cash += amount;
    money.push({playerId:winner.playerId,cashBefore:before.cash,cashAfter:b.cash,bankBefore:before.bank,bankAfter:b.bank});
    lines.push(`地块数（普通＋大型，含空地）：${changes.counts.map(c => `玩家${c.playerId.split('-')[1]} ${c.count}块`).join('；')}。`);
    lines.push(`玩家${winner.playerId.split('-')[1]}获现金 ${amount.toLocaleString()} 元：${before.cash.toLocaleString()} → ${b.cash.toLocaleString()} 元；存款不变。并列取席位靠前者，${(s.rulesId==='japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))?'物价倍率 '+consumerIndex(s):'物价固定1'}。`);
  }
  return { money, changes };
}
