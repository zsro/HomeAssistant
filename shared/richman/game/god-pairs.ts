import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import {g6Draw} from './g6-random';
const staticBlocked=[{"id":23,"x":599,"y":2063},{"id":24,"x":599,"y":2016},{"id":25,"x":552,"y":1968},{"id":26,"x":503,"y":1968},{"id":27,"x":456,"y":2016},{"id":28,"x":408,"y":2064},{"id":29,"x":336,"y":2065}];
export type GodPairState={nodes:Pick<MapNode,'id'|'x'|'y'>[]};
const paired=(s:GameState)=>!!s.g6?.pairing;
const ordinary=(type:number,s:GameState)=>type>=1&&type<=(s.g6?.objects?12:10);
export const allRoadGods=(s:Pick<GameState,'g6'>)=>[...(s.g6?.gods??[]),...(s.g6?.objects??[])];
const report=(emit:(e:EventPayload)=>void,message:string)=>emit({type:'g6Notice',message});
/** MapDat Japan node +0x24 mask 0x80ffff00; coordinates are raw signed shorts. */
export function pairCandidates(s:GameState,origin:number|null) {
 const nodes=s.g6?.pairing?.nodes??[],from=nodes.find(n=>n.id===origin);
 const occupied=new Set([
  ...allRoadGods(s).filter(g=>!g.carrier).map(g=>g.node),...s.roadTools!.blocks,
  ...s.g5!.hazards.filter(h=>!h.carrier).map(h=>h.node),
  ...s.players.filter(p=>{const m=s.g2!.players[p.id];return !s.finance!.eliminated.includes(p.id)&&!m.prison&&!m.hospital&&!m.travel&&!s.g4!.hotel[p.id];}).map(p=>p.node),
 ]);
 const candidates=nodes.filter(n=>!occupied.has(n.id));
 return {candidates,distant:candidates.filter(n=>!from||Math.abs(n.x-from.x)>=300||Math.abs(n.y-from.y)>=300)};
}
export function placePairGod(s:GameState,type:number,origin:number|null,emit:(e:EventPayload)=>void) {
 const {candidates,distant}=pairCandidates(s,origin);
 if(!distant.length){report(emit,`配对补位：${type}号槽没有可用远处空位，保持缺席。`);return false;}
 const allowed=new Set(distant.map(n=>n.id));let node:number|null=null;
 for(let i=0;i<4096;i++){const d=g6Draw(s.randomState,candidates.length);s.randomState=d.state;const n=candidates[d.index];if(allowed.has(n.id)){node=n.id;break;}}
 if(node===null){report(emit,`配对补位：${type}号槽抽样达到安全上限，保持缺席。`);return false;}
 // Native place_object checks the slot only after find_random... has drawn a node.
 if(allRoadGods(s).some(g=>g.type===type)){report(emit,`配对补位：${type}号槽已占用，本次不覆盖。`);return false;}
 (s.g6!.objects&&[11,13,14].includes(type)?s.g6!.objects:s.g6!.gods).push({id:`god-${++s.g6!.serial}`,type,node,carrier:null,remaining:0});
 report(emit,`配对补位：${type}号槽出现在${node}号路格。`);return true;
}
export function initializePairs(s:GameState,nodes:readonly MapNode[]) {
 // Static exclusions apply only to the original Japan coordinates (custom test maps stay usable).
 s.g6!.pairing={nodes:nodes.filter(n=>!staticBlocked.some(b=>b.id===n.id&&b.x===n.x&&b.y===n.y)).map(({id,x,y})=>({id,x,y})).sort((a,b)=>a.id-b.id)};
 if((s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))s.g6!.objects=[];
 for(const type of (s.g6!.objects?[1,3,5,7,9,11,13,14]:[1,3,5,7,9]))placePairGod(s,type,null,()=>{});
}
export function removeGod(s:GameState,id:string,emit:(e:EventPayload)=>void) {
 const g=allRoadGods(s).find(g=>g.id===id);if(!g)return false;
 const origin=g.carrier?s.players.find(p=>p.id===g.carrier)!.node:g.node;
 s.g6!.gods=s.g6!.gods.filter(x=>x.id!==id);
 if(s.g6!.objects)s.g6!.objects=s.g6!.objects.filter(x=>x.id!==id);
 if(paired(s)&&ordinary(g.type,s))placePairGod(s,g.type%2?g.type+1:g.type-1,origin,emit);
 return true;
}
export function removePlayerGod(s:GameState,id:string,emit:(e:EventPayload)=>void) {
 for(const g of [...(s.g6?.gods??[])])if(g.carrier===id)removeGod(s,g.id,emit);
}
