import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import {placePairGod,removeGod} from './god-pairs';
import {SHOP_TOOLS,shopSupply} from './shop-acquisition';
import {returnSupply} from './g3';
import {g6Draw} from './g6-random';
import {enterDetention} from './g2';
export type SpecialObjectEvent={type:'specialObjectResolved';objectType:number;node:number;targetId:string;outcome:'vehicle'|'hospital'|'empty'|'full'|'tool'|'points';itemId?:string;before?:number;after?:number}|{type:'specialObjectsRefreshed';date:string;objects:{type:number;node:number}[]};
type Emit=(e:EventPayload)=>void;
/** The native remaining-movement counter must be zero; dream is not checked here. */
export function encounterSpecialObject(s:GameState,nodes:readonly MapNode[],emit:Emit){
 const p=s.players[s.active];
 if(!s.g6?.objects||s.remaining!==0||s.finance!.eliminated.includes(p.id))return false;
 const g=s.g6.objects.find(g=>g.node===p.node);if(!g)return false;
 const base={type:'specialObjectResolved' as const,objectType:g.type,node:g.node,targetId:p.id};
 if(g.type===11){
  removeGod(s,g.id,emit);
  const m=s.g2!.players[p.id];
  if(m.vehicle!=='foot'||s.g5!.engineers[p.id]&&!s.g5!.engineers[p.id]!.suspended){emit({...base,outcome:'vehicle'});return false;}
  enterDetention(s,nodes,p.id,'hospital',3,emit);
  s.phase='turnEnd';s.pending=null;s.remaining=0;
  emit({...base,outcome:'hospital'});emit({type:'g6Notice',message:'道路对象11：步行停留，住院3次；车辆可避开。'});return true;
 }
 if(g.type===13){
  const pool=SHOP_TOOLS.flatMap(id=>Array.from({length:shopSupply(s,id)},()=>id));
  if(!pool.length){emit({...base,outcome:'empty'});return false;}
  const d=g6Draw(s.randomState,pool.length);s.randomState=d.state;const itemId=pool[d.index],bag=s.effects!.inventory[p.id],before=bag[itemId]??0;
  const received=before<9;if(received){bag[itemId]=before+1;returnSupply(s,itemId,-1);}
  // receive_random_tool returns the selected ID even when receive_tool rejects a full stack.
  removeGod(s,g.id,emit);emit({...base,outcome:received?'tool':'full',itemId,before,after:bag[itemId]??0});
  emit({type:'g6Notice',message:`道路对象13：抽中${itemId}${received?'，获得1件。':'已满9件；不重抽，对象移除。'}`});return false;
 }
 if(g.type===14){const before=s.items!.points[p.id];removeGod(s,g.id,emit);const after=(before+500)&65535;s.items!.points[p.id]=after;emit({...base,outcome:'points',before,after});emit({type:'g6Notice',message:`道路对象14：点数${before} → ${after}（增加500，原16位字段）。`});}
 return false;
}
export function refreshSpecialObjects(s:GameState,emit:Emit){
 if(!s.g6?.objects)return;
 for(const type of [13,14]){const old=s.g6.objects.find(g=>g.type===type);if(old)removeGod(s,old.id,emit);placePairGod(s,type,old?.node??null,emit);}
 emit({type:'specialObjectsRefreshed',date:s.calendar!.date,objects:s.g6.objects.filter(g=>g.type===13||g.type===14).map(({type,node})=>({type,node}))});
}
