import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import type {PropertyDefinition,PropertyState} from './economy';
import type {MagicDecision,MagicReceipt,MagicRow} from './magic-house';
import {MAGIC_FINGERPRINT,operateMagic} from './magic-house';
import {hashSeed} from './random';
import {consumeG3,hostility,openReaction} from './g3';
import {enterDetention} from './g2';
import {maximumLevel} from './g4';
import {reconcileResearch} from './g5';
import {claimInsurance} from './insurance-state';
import {priceIndex} from './price-index';
export const MAGIC_ACTIONS_RULES=Object.freeze({id:'japan-events-candidate-v37',version:1,base:'japan-events-candidate-v36',effects:'2-prison3;10-hospital3;5-current-build;9-current-demolish',batch:'frozen-seat-targets-live-per-row;serializable-cursor-before-each-response;original-visitor-retained;no-date-or-turn-advance;one-result',detention:'90*price-hostility-original-target-to-visitor-before-auto21-else-optional19;self-zero;one-redirect-no-recheck-no-revenge-no-god-gate;raw-plus3-and127;existing-same-kind-stays;other-presence-reset;vehicle-winter-dream-retained;insurance6000*price-on-final-target',building:'skip-bytes50..53-only;current-property-any-owner-no-fee;land-type0-cap5-type1-cap1-other-no-build;empty-facility-target-chooses0..4;facility-cap1/5/5/1/5;demolish-one-level-land-special-reset;facility-zero-reset-type-and-all-hotel-raw128',research:'existing-v11/v13-candidate-reconcile-after-each-row;not-native-research-clock-equivalence',scope:'ten-of-twelve;three-fortunes-auction-unavailable;hostility-deltas-recorded-no-global-AI-score;v36-groups-RNG-and-special-actor-differences-retained'});
export const MAGIC_ACTIONS_FINGERPRINT=hashSeed(JSON.stringify({base:MAGIC_FINGERPRINT,rules:MAGIC_ACTIONS_RULES})).toString(16);
export const MAGIC_ACTIONS_EFFECTS=[{id:2,title:'坐牢三回合'},{id:10,title:'住院三回合'},{id:5,title:'就地加盖一层'},{id:9,title:'就地拆除一层'}] as const;
export type MagicBatch={id:string;sourceId:string;cursor:number;waiting:boolean;row?:MagicRow;decision:MagicDecision;receipt:MagicReceipt};
export type MagicDetention={kind:'magicDetention';batchId:string;cursor:number;total:number;detention:'prison'|'hospital';originalId:string};
export type MagicChange={targetId?:string;kind?:'prison'|'hospital';before?:number;after?:number;hostility?:number;immune?:boolean;propertyBefore?:PropertyState;propertyAfter?:PropertyState};
type Emit=(e:EventPayload)=>void;
export function rowFor(s:GameState,id:string):MagicRow{const b=s.economy!.balances[id],m=s.g2!.players[id];return{playerId:id,lines:[],pointsBefore:s.items!.points[id],pointsAfter:s.items!.points[id],cashBefore:b.cash,cashAfter:b.cash,bankBefore:b.bank,bankAfter:b.bank,stopBefore:m.stop,stopAfter:m.stop,previousBefore:s.players.find(p=>p.id===id)!.previous,previousAfter:s.players.find(p=>p.id===id)!.previous};}
function finishRow(s:GameState,row:MagicRow,emit:Emit){const b=s.magic!.current!,money=s.economy!.balances[row.playerId];row.cashAfter=money.cash;row.bankAfter=money.bank;row.previousAfter=s.players.find(p=>p.id===row.playerId)!.previous;b.receipt.rows.push(row);b.cursor++;b.waiting=false;emit({type:'magicStep',batchId:b.id,cursor:b.cursor,row:structuredClone(row)});}
function detain(s:GameState,nodes:readonly MapNode[],row:MagicRow,targetId:string,emit:Emit){const b=s.magic!.current!,kind=b.receipt.effect===2?'prison':'hospital',m=s.g2!.players[targetId],before=m[kind];
 if(before){m[kind]=(before+3)&127;claimInsurance(s,targetId,6000*priceIndex(s),kind==='hospital'?'住院':'监禁',emit);}else enterDetention(s,nodes,targetId,kind,3,emit);
 row.change={...row.change,targetId,kind,before,after:m[kind]};row.lines.push(`玩家 ${targetId.split('-')[1]}${kind==='hospital'?'住院':'监禁'}：${before} → ${m[kind]}；保留车辆，按自身行动计时。`);finishRow(s,row,emit);
}
function building(s:GameState,row:MagicRow,p:PropertyState,d:PropertyDefinition,type:number|undefined,defs:readonly PropertyDefinition[],emit:Emit){const effect=s.magic!.current!.receipt.effect;row.change={propertyBefore:structuredClone(p)};
 if(effect===5){if(d.kind==='facility'&&!p.level)p.buildingType=type!;const cap=d.kind==='land'&&(p.buildingType??0)>1?p.level:maximumLevel(p,d);if(p.level<cap)p.level++;}
 else if(p.level){p.level--;if(d.kind==='land'&&p.buildingType){p.level=0;p.buildingType=0;}if(d.kind==='facility'&&!p.level){p.buildingType=0;for(const id of Object.keys(s.g4!.hotel))if(!s.finance!.eliminated.includes(id)&&s.g4!.hotel[id])s.g4!.hotel[id]=128;}}
 reconcileResearch(s,defs,emit);row.change.propertyAfter=structuredClone(p);row.lines.push(`${d.name}：${row.change.propertyBefore!.level} → ${p.level} 级；产权不变，不收费。`);finishRow(s,row,emit);
}
function drain(s:GameState,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit){const b=s.magic!.current!;
 while(b.cursor<b.receipt.targets.length){const id=b.receipt.targets[b.cursor],row=rowFor(s,id),effect=b.receipt.effect;
  if(s.finance!.eliminated.includes(id)){row.skipped=true;row.lines.push('玩家已退出，跳过。');finishRow(s,row,emit);continue;}
  if(effect===2||effect===10){const amount=id===b.sourceId?0:90*priceIndex(s);row.change={hostility:amount};if(amount)hostility(s,id,b.sourceId,emit);
   emit({type:'magicHostility',batchId:b.id,targetId:id,sourceId:b.sourceId,amount});
   if(consumeG3(s,id,'card:21',emit)){row.change.immune=true;row.lines.push('免罪卡自动抵消本位拘留。');finishRow(s,row,emit);continue;}
   if(s.effects!.inventory[id]['card:19']>0){b.waiting=true;b.row=row;openReaction(s,{kind:'magicDetention',batchId:b.id,cursor:b.cursor,total:b.receipt.targets.length,detention:effect===2?'prison':'hospital',originalId:id},id,'redirect',token,emit);return;}
   detain(s,nodes,row,id,emit);continue;
  }
  const m=s.g2!.players[id],player=s.players.find(p=>p.id===id)!,d=defs.find(d=>d.nodeIds.includes(player.node)),p=d&&s.economy!.properties.find(p=>p.id===d.id);
  if(s.g4!.hotel[id]||m.travel||m.prison||m.hospital||!d||!p){row.skipped=true;row.lines.push('当前不在可建拆地产，或住宿、旅行、拘留中，跳过。');finishRow(s,row,emit);continue;}
  if(effect===5&&d.kind==='facility'&&!p.level){b.waiting=true;b.row=row;s.phase='magic';s.pending={...b.decision,id:token(),stage:'build',responderId:id,propertyId:p.id};return;}
  building(s,row,p,d,undefined,defs,emit);
 }
 const receipt=structuredClone(b.receipt);s.magic!.last=receipt;s.magic!.current=null;s.phase='magic';s.pending={...b.decision,id:token(),stage:'result',receipt};emit({type:'magicResolved',receipt:structuredClone(receipt)});
}
export function operateMagicActions(s:GameState,id:string,effect:number|undefined,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit){const d=s.pending;
 if((s.rulesId!==MAGIC_ACTIONS_RULES.id&&(s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))))))||effect===undefined||!MAGIC_ACTIONS_EFFECTS.some(e=>e.id===effect))return operateMagic(s,id,effect,nodes,defs,token,emit);
 if(s.phase!=='magic'||d?.kind!=='magic'||d.id!==id||d.stage!=='choose'||s.magic?.current)return false;
 s.magic!.current={id:token(),sourceId:s.players[s.active].id,cursor:0,waiting:false,decision:structuredClone(d),receipt:{node:d.node,group:d.group!,targets:[...d.targets],effect,title:MAGIC_ACTIONS_EFFECTS.find(e=>e.id===effect)!.title,rows:[]}};
 drain(s,nodes,defs,token,emit);return true;
}
export function reactMagic(s:GameState,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],choice:'use'|'decline',targetId:string|undefined,token:()=>string,emit:Emit){const p=s.pending,b=s.magic?.current;
 if(!['use','decline'].includes(choice)||p?.kind!=='reaction'||p.continuation.kind!=='magicDetention'||!b||!b.waiting||b.id!==p.continuation.batchId||b.cursor!==p.continuation.cursor||!b.row)return false;
 if(choice==='use'&&(!targetId||!p.targets.includes(targetId)||!consumeG3(s,p.responderId,'card:19',emit)))return false;
 if(choice==='decline'&&targetId!==undefined)return false;
 emit({type:'reactionAnswered',responderId:p.responderId,choice,stage:'redirect',...(choice==='use'?{targetId}:{})});
 const row=b.row;delete b.row;detain(s,nodes,row,choice==='use'?targetId!:p.responderId,emit);drain(s,nodes,defs,token,emit);return true;
}
export function buildMagic(s:GameState,id:string,type:number,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit){const p=s.pending,b=s.magic?.current;
 if((s.rulesId!==MAGIC_ACTIONS_RULES.id&&(s.rulesId !== 'japan-events-candidate-v38' && (s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47'))))))))))||s.phase!=='magic'||p?.kind!=='magic'||p.stage!=='build'||p.id!==id||!b?.waiting||!b.row||!Number.isInteger(type)||type<0||type>4)return false;
 const d=defs.find(d=>d.id===p.propertyId),property=s.economy!.properties.find(q=>q.id===p.propertyId);if(!d||d.kind!=='facility'||!property||property.level!==0)return false;
 const row=b.row;delete b.row;building(s,row,property,d,type,defs,emit);drain(s,nodes,defs,token,emit);return true;
}
