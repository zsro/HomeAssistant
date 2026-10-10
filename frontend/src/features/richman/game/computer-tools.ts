import type {GameState} from './engine';
import type {MapNode} from '../types';
import {computerDecision, decisionPlayer} from './computer';
import type {ComputerDecision, ComputerPolicy} from './computer';
import {PROPERTY_CATALOG, propertyBase} from './economy';
import {maximumLevel} from './g4';
import {actionLocked} from './g2';
import {g1Adjacent} from './g1';
import {consumerIndex} from './price-index';
import {REMOTE_DICE, REMOTE_EFFECT, itemSite} from './items';
import {NEARBY_WORKER_EFFECT, nearbyWorkerTargets} from './nearby-construction';
import {shopPrice, shopSupply} from './shop-acquisition';

export const TOOLS_POLICY = 'tools-v1';
/** Public-state heuristics, not a simulation: no engine clone, deck, checkpoint or RNG access. */
export function workerChoice(s: GameState, nodes: readonly MapNode[]) {
  const who = s.players[s.active], center = nodes.find(n => n.id === who.node);
  if (!center || !s.economy) return null;
  const legal = nearbyWorkerTargets(center, PROPERTY_CATALOG.properties, s.economy.properties);
  return PROPERTY_CATALOG.properties.filter(d => legal.includes(d.id) && s.economy!.properties.some(p => p.id === d.id && p.ownerId === who.id))
    .map(d => {const p = s.economy!.properties.find(p => p.id === d.id)!; return {id: d.id, gain: d.rents[p.level + 1] - d.rents[p.level]};})
    .filter(x => x.gain > 0).sort((a,b) => b.gain - a.gain || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
}

/** At most six road edges. Every visible hazard/roadblock path is conservatively avoided. */
export function toolRouteScores(s: GameState, nodes: readonly MapNode[]) {
  const who = s.players[s.active], balance = s.economy!.balances[who.id], index = consumerIndex(s);
  const byId = new Map(nodes.map(n => [n.id,n]));
  const hazards = new Set([...(s.roadTools?.blocks ?? []), ...(s.g5?.hazards.filter(h => !h.carrier).map(h => h.node) ?? [])]);
  const landing = (node: MapNode) => {
    const d = PROPERTY_CATALOG.properties.find(d => d.nodeIds.includes(node.id));
    if (d) {
      const p = s.economy!.properties.find(p => p.id === d.id)!;
      if (p.ownerId && p.ownerId !== who.id) return -100; // Do not assume a god/free card will waive rent.
      if (d.kind !== 'land' || (p.priceStatus ?? 0) & 15) return 0;
      const cost = (p.ownerId ? d.upgradeCost : propertyBase(p,d) + p.level*d.upgradeCost) * index;
      if (balance.cash - cost < 1000) return 0;
      return !p.ownerId ? 40 : p.level < maximumLevel(p,d) ? 30 : 10;
    }
    // Unknown event outcomes have zero utility; no forecast from hidden news/fortune sequences.
    const points = itemSite(node)?.points ?? 0;
    return points > 0 ? 20 : 0;
  };
  const cache = new Map<string,number>();
  const afterStep = (nodeId: number, previous: number, remaining: number): number => {
    if (hazards.has(nodeId)) return -1000;
    const node = byId.get(nodeId); if (!node) return -1000;
    if (!remaining) return landing(node);
    const key = `${nodeId}:${previous}:${remaining}`;
    if (cache.has(key)) return cache.get(key)!;
    const all = g1Adjacent(node), onward = all.filter(id => id !== previous);
    const score = Math.max(-1000, ...(onward.length ? onward : all).map(id => afterStep(id,nodeId,remaining-1)));
    cache.set(key,score); return score;
  };
  const origin = byId.get(who.node), all = origin ? g1Adjacent(origin) : [], onward = all.filter(id => id !== who.previous);
  const first = onward.length ? onward : all;
  const dice = Array.from({length:6},(_,i) => ({value:i+1,score:Math.max(-1000,...first.map(id => afterStep(id,who.node,i)))}));
  return {dice, afterStep};
}
function remoteChoice(s: GameState, nodes: readonly MapNode[]) {
  const m = s.g2?.players[s.players[s.active].id];
  if (!m || m.stop || m.turtle || m.vehicle !== 'foot' || m.diceCount !== 1) return null;
  const dice = toolRouteScores(s,nodes).dice, ranked = [...dice].sort((a,b) => b.score-a.score || a.value-b.value);
  // Spend only for an affordable purchase/build and a meaningful improvement over another roll.
  return ranked[0].score >= 30 && ranked[0].score - Math.min(...dice.map(x => x.score)) >= 10 ? ranked[0] : null;
}
export function decideComputer(s: GameState, nodes: readonly MapNode[], policy: ComputerPolicy = 'basic-v1'): ComputerDecision | null {
  if (policy === 'basic-v1') return computerDecision(s);
  if (policy !== TOOLS_POLICY || (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))) || s.paused || s.phase === 'finished') return null;
  const who = s.players[s.active], p = s.pending;
  if (decisionPlayer(s) !== who.id) return computerDecision(s);
  const choose = (action: ComputerDecision['action'], reason: string): ComputerDecision => ({playerId:who.id,action,reason});
  const bag = s.effects?.inventory[who.id], available = !actionLocked(s.g2?.players[who.id]) && !s.g4?.hotel[who.id] && !s.finance?.eliminated.includes(who.id);
  if (p?.kind === 'effect') {
    // Recompute against current ownership, levels, inventory and hazards; never confirm a stored target.
    if (!available) return null;
    const pending = s.effects?.pending;
    // Existing engine forbids even cancelling a remote roll after these artificial status changes.
    const mobility = s.g2?.players[who.id];
    if (pending?.definitionId === REMOTE_EFFECT && (mobility?.stop || mobility?.turtle)) return null;
    if (pending?.definitionId === NEARBY_WORKER_EFFECT && (bag?.['tool:09'] ?? 0) > 0) {
      const target = workerChoice(s,nodes);
      if (target) {
        const land = PROPERTY_CATALOG.properties.find(d => d.id === target.id)!;
        return choose({type:'item',action:{type:'confirm',decisionId:p.id,target:{kind:'property',id:target.id}}},`机器工人加盖${land.name}（${land.nodeIds.join('/')}号路格），不花现金`);
      }
    }
    if (pending?.definitionId === REMOTE_EFFECT && (bag?.[REMOTE_DICE] ?? 0) > 0) {
      const target = remoteChoice(s,nodes);
      if (target) return choose({type:'item',value:target.value,action:{type:'confirm',decisionId:p.id,target:{kind:'player',id:who.id}}},`遥控骰子选择${target.value}点，优先可负担购建，避开可见路障与危险物`);
    }
    return choose({type:'item',action:{type:'cancel',decisionId:p.id}},'没有仍然合适的合法目标，取消并保留道具');
  }
  if (s.phase === 'idle' && !p && available) {
    if ((bag?.['tool:09'] ?? 0) > 0 && workerChoice(s,nodes)) return choose({type:'item',action:{type:'begin',definitionId:NEARBY_WORKER_EFFECT}},'优先用机器工人免费加盖附近自有地产');
    if ((bag?.[REMOTE_DICE] ?? 0) > 0 && remoteChoice(s,nodes)) return choose({type:'item',action:{type:'begin',definitionId:REMOTE_EFFECT}},'遥控骰子可改善落点，进入点数选择');
  }
  if (p?.kind === 'branch' && available && s.remaining >= 1 && s.remaining <= 6) {
    const route = toolRouteScores(s,nodes);
    const node = [...p.choices].sort((a,b) => route.afterStep(b,who.node,s.remaining-1)-route.afterStep(a,who.node,s.remaining-1) || a-b)[0];
    return choose({type:'choose',decisionId:p.id,node},'按公开道路评估剩余路程，优先可负担购建并避险');
  }
  if (p?.kind === 'shop' && (bag?.[REMOTE_DICE] ?? 0) === 0 && p.shelf?.tools.some(x => x.itemId === REMOTE_DICE && x.available) && s.items!.points[who.id] >= shopPrice(REMOTE_DICE) && shopSupply(s,REMOTE_DICE) > 0) {
    return choose({type:'buyItem',decisionId:p.id,itemId:REMOTE_DICE},'花30点补充一个遥控骰子，不花现金、不购买机器工人');
  }
  return computerDecision(s);
}
