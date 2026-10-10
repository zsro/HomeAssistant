import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import type {PropertyDefinition} from './economy';
import type {MagicDecision,MagicReceipt,MagicRow} from './magic-house';
import {MAGIC_ACTIONS_FINGERPRINT,operateMagicActions,rowFor} from './magic-actions';
import {hashSeed} from './random';
import {offerFortune} from './fortune';
import {actionLocked} from './g2';
import {auctionReserve,settleAuction} from './g4';
import type {AuctionDecision} from './g4';
export const MAGIC_NESTED_RULES=Object.freeze({id:'japan-events-candidate-v38',version:1,base:'japan-events-candidate-v37',fortune:'three-sequential-common-dispatch-calls-per-frozen-seat;no-location-dream-or-absence-gate;live-eligibility-next-call;wait-reaction-collection-disposal-and-receipt-ack;Web-skip-dead-and-stop-last-survivor-native-post-exit-loop-unproven',auction:'current-property2001..5999;skip-hotel-travel-prison-hospital-only;no-owner-restriction-no-hostility;source-target-is-recipient-not-owner;exclude-source-and-absence-winter-dream;cash>reserve;trunc(raw-base*(1+level/2))*price;winner-cash-target-bank-no-bid-preserves-owner;no-extra-fee-or-reaction',continuation:'serialized-frozen-targets-source-seat-cursor-issued-calls-wait-kind-and-receipts;temporary-active-target-no-clock;restore-source-on-completion-or-end;v35-payment-disposal-first;no-day-advance',eligibility:'v38-restores-asset-fortune-0-1-5-8-9-version-gate;v26..37-unchanged',scope:'12of12-candidate-effects;existing-auction-increments-no-native-timer-AI;legacy-rules-frozen;native-ending-special-actors-other-sites-deferred'});
export const MAGIC_NESTED_FINGERPRINT=hashSeed(JSON.stringify({base:MAGIC_ACTIONS_FINGERPRINT,rules:MAGIC_NESTED_RULES})).toString(16);
export const MAGIC_NESTED_EFFECTS=[{id:1,title:'接连三次命运'},{id:11,title:'拍卖脚下地产'}] as const;
export type NestedDetail={fortunes:{id:number;title:string;bankrupt:boolean;cursor:number}[];auction?:{propertyId:string;winnerId:string|null;amount:number;originalOwner:string|null;ownerAfter:string|null}};
export type MagicNested={id:string;sourceId:string;sourceIndex:number;cursor:number;calls:number;waiting:'fortune'|'auction'|null;decision:MagicDecision;receipt:MagicReceipt;row:MagicRow|null;stopped:boolean};
type Emit=(e:EventPayload)=>void;
export function captureMagicNested(s:GameState,event:EventPayload){const n=s.magic?.nested;if(!n?.row)return;
 if(n.waiting==='fortune'&&event.type==='fortuneResolved'){n.row.nested!.fortunes.push({id:event.fortuneId,title:event.title,bankrupt:event.change.bankrupt,cursor:event.cursor});n.row.lines.push(`第${n.calls}次命运：${event.title}${event.change.bankrupt?'，玩家退出':''}。`);}
 if(n.waiting==='auction'&&event.type==='auctionSettled'&&!s.finance?.disposal?.current){const a=n.row.nested!.auction!;Object.assign(a,{winnerId:event.winnerId,amount:event.amount,ownerAfter:s.economy!.properties.find(p=>p.id===a.propertyId)!.ownerId});n.row.lines.push(event.winnerId?`玩家 ${event.winnerId.split('-')[1]}现金支付 ${event.amount} 元，存入本位玩家银行。`:'无人出价，流拍，原产权保持。');}
}
function finishRow(s:GameState){const n=s.magic!.nested!,row=n.row!,id=row.playerId,b=s.economy!.balances[id];row.cashAfter=b.cash;row.bankAfter=b.bank;row.pointsAfter=s.items!.points[id];row.stopAfter=s.g2!.players[id].stop;row.previousAfter=s.players.find(p=>p.id===id)!.previous;n.receipt.rows.push(row);n.row=null;n.cursor++;n.calls=0;n.waiting=null;}
function complete(s:GameState,token:()=>string,emit:Emit){const n=s.magic!.nested!;s.active=n.sourceIndex;if(n.row)finishRow(s);s.magic!.last=structuredClone(n.receipt);s.magic!.nested=null;if(s.phase!=='finished'){s.phase='magic';s.pending={...n.decision,id:token(),stage:'result',receipt:structuredClone(n.receipt)};}emit({type:'magicNestedCompleted',sourceId:n.sourceId,stopped:n.stopped,cursor:n.cursor});emit({type:'magicResolved',receipt:structuredClone(n.receipt)});}
export function advanceMagicNested(s:GameState,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit,eliminate:(id:string)=>void){const n=s.magic?.nested;if(!n)return;
 if(s.phase==='finished'){n.stopped=true;if(n.row)n.row.lines.push('对局结束，停止余下命运和目标位。');complete(s,token,emit);return;}
 if(s.finance?.payments?.current||s.finance?.disposal?.current)return;
 if(n.waiting==='fortune')return;
 if(n.waiting==='auction'){if(s.pending)return;finishRow(s);}
 while(n.cursor<n.receipt.targets.length){const id=n.receipt.targets[n.cursor];s.active=s.players.findIndex(p=>p.id===id);
  if(!n.row){n.row=rowFor(s,id);n.row.nested={fortunes:[]};}
  if(s.finance!.eliminated.includes(id)){n.row.skipped=true;n.row.lines.push('玩家已退出，跳过剩余调用。');finishRow(s);continue;}
  if(n.receipt.effect===1){if(n.calls===3){finishRow(s);continue;}n.calls++;n.waiting='fortune';emit({type:'magicNestedCall',sourceId:n.sourceId,targetId:id,seat:n.cursor,call:n.calls});
   if(offerFortune(s,token,emit,eliminate,defs,nodes))return;
   n.waiting=null;n.row.lines.push(`第${n.calls}次未找到可执行命运。`);continue;
  }
  const m=s.g2!.players[id],p=s.players[s.active],d=defs.find(d=>d.nodeIds.includes(p.node)),property=d&&s.economy!.properties.find(q=>q.id===d.id);
  if(m.travel||m.prison||m.hospital||s.g4!.hotel[id]||!d||!property){n.row.skipped=true;n.row.lines.push('当前不在地产或住宿、旅行、拘留中，跳过拍卖。');finishRow(s);continue;}
  const reserve=auctionReserve(property,d,s),remaining=s.players.filter(p=>p.id!==id&&!s.finance!.eliminated.includes(p.id)&&!actionLocked(s.g2!.players[p.id])&&!s.g4!.hotel[p.id]&&s.economy!.balances[p.id].cash>reserve).map(p=>p.id);
  n.row.nested!.auction={propertyId:property.id,originalOwner:property.ownerId,ownerAfter:property.ownerId,winnerId:null,amount:0};n.waiting='auction';
  const a:AuctionDecision={kind:'auction',id:token(),propertyId:property.id,sourceId:id,originalOwner:property.ownerId,reserve,bid:reserve,leader:null,responderId:remaining[0]??id,remaining,magicBatchId:n.id};
  if(remaining.length){s.phase='auction';s.pending=a;emit({type:'auctionOffered',decision:structuredClone(a)});return;}
  settleAuction(s,a,emit);finishRow(s);
 }
 complete(s,token,emit);
}
export function operateMagicNested(s:GameState,id:string,effect:number|undefined,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit,eliminate:(id:string)=>void){
 if((s.rulesId!==MAGIC_NESTED_RULES.id&&(s.rulesId !== 'japan-events-candidate-v39' && (s.rulesId !== 'japan-events-candidate-v40' && (s.rulesId !== 'japan-events-candidate-v41' && (s.rulesId !== 'japan-events-candidate-v42' && (s.rulesId!=='japan-events-candidate-v43' && (s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))))))))||![1,11].includes(effect!))return operateMagicActions(s,id,effect,nodes,defs,token,emit);
 const d=s.pending;if(s.phase!=='magic'||d?.kind!=='magic'||d.stage!=='choose'||d.id!==id||s.magic?.nested)return false;
 s.magic!.nested={id:token(),sourceId:s.players[s.active].id,sourceIndex:s.active,cursor:0,calls:0,waiting:null,decision:structuredClone(d),receipt:{node:d.node,group:d.group!,targets:[...d.targets],effect:effect!,title:MAGIC_NESTED_EFFECTS.find(e=>e.id===effect)!.title,rows:[]},row:null,stopped:false};s.pending=null;advanceMagicNested(s,nodes,defs,token,emit,eliminate);return true;
}
export function ackNestedFortune(s:GameState,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit,eliminate:(id:string)=>void){const n=s.magic?.nested;if(!n||n.waiting!=='fortune')return false;n.waiting=null;s.pending=null;advanceMagicNested(s,nodes,defs,token,emit,eliminate);return true;}
