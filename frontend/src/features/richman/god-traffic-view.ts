import type {SessionSnapshot} from './game/session';
import {GODS} from './game/g6-catalog';
import {FORTUNE_GOD_MONEY, FORTUNE_GOD_RESISTANCE} from './game/fortune-catalog';
import {mobilityText, vehicleName} from './game/g2';

// Read-only presentation. Never call fortuneLuck: it can consume the game's RNG.
const influence = (value: number) => value > 100 ? '强利好' : value > 50 ? '可能利好' : value < 0 ? '不利' : '无修正';
export function godTrafficView(s: SessionSnapshot, seat: number) {
  const id = `player-${seat + 1}`, actorIndex = s.participants[seat], m = s.g2?.players[id];
  const gone = s.eliminated.includes(actorIndex), god = s.g6?.gods.find(g => g.carrier === id);
  const def = GODS.find(d => d.type === god?.type), engineer = s.g5?.engineers[id];
  const activeEngineer = engineer && !engineer.suspended;
  const vehicle = activeEngineer ? '工程车' : m ? vehicleName(m.vehicle) : '步行';
  const fortune = god && !['g6', 'g7', 'events', 'news', 'propertyNews', 'operatingNews', 'statusNews', 'completeNews'].includes(s.mode) ? `资金命运：${influence(FORTUNE_GOD_MONEY[god.type] ?? 0)}；状态/库存命运：${influence(FORTUNE_GOD_RESISTANCE[god.type] ?? 0)}。` : null;
  const restoration = engineer ? engineer.vehicle === 'foot' ? '原交通：步行；到期继续步行。' : `原交通：${vehicleName(engineer.vehicle)}；到期仅在背包仍有原车辆时恢复。` : null;
  return {
    id, actorIndex, gone, god: gone ? null : god, name: def?.name ?? '未知神仙', detail: def?.detail ?? '',
    fortune: gone ? null : fortune, mobility: m ? mobilityText(m, actorIndex === s.active) : '步行', vehicle,
    engineer: gone || !engineer ? null : `${engineer.suspended ? '工程车暂停（梦游）' : '驾驶工程车'} · 剩余${engineer.remaining}次自身行动；${restoration}`,
    badge: gone || m?.travel ? '' : [god ? `${def?.name ?? '神仙'} ${god.remaining}次` : '', vehicle !== '步行' ? vehicle : ''].filter(Boolean).join(' · '),
    bad: !!def?.bad,
  };
}
