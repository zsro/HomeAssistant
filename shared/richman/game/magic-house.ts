import type {MagicNested,NestedDetail} from './magic-nested';
import type {MagicBatch,MagicChange} from './magic-actions';
import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import type {PropertyDefinition} from './economy';
import {propertyBase} from './economy';
import {BATCH_FINGERPRINT} from './payment-batches';
import {hashSeed} from './random';
import {g6Draw} from './g6-random';
import {g1Adjacent,g1Draw} from './g1';
import {directionFor} from '../traversal';
import {receiveRandomCard} from './g6';
import {cardPrices,returnSupply,syncCardSlots,itemName} from './g3';
import {TOOL_SELL_PRICES} from './fortune-catalog';
export const MAGIC_NODES=[35,73] as const;
export const MAGIC_GROUPS=['财产最多的人','土地最多的人','房屋最多的人','现金最多的人','存款最多的人','点券最多的人','走路的人','骑机车的人','开汽车的人','神明附身的人','所有男生','所有女生'] as const;
export const MAGIC_EFFECTS=[{id:0,title:'变卖所有卡片'},{id:3,title:'原地停留一回合'},{id:4,title:'存入所有现金'},{id:6,title:'得一张卡片'},{id:7,title:'向后转'},{id:8,title:'变卖所有道具'}] as const;
export const MAGIC_RULES=Object.freeze({id:'japan-events-candidate-v36',version:1,base:'japan-events-candidate-v35',entry:'Japan35/73-code16-landing-skip-dream-free;human-target-draw-then-effect-choice-no-cancel',targets:'12-groups-alive-seat-order-all-max-ties;land/built-property-count-positive;cash/bank/points-positive;raw-wealth-cash-bank-minus-loan-f32-stock-trunc-each-plus-unindexed-property;four-current-roster-sex-only;current-vehicle-lowbits;dream-foot-saved-vehicle-not-equipped',random:'Web-one-seeded-uniform-nonempty-group-draw;not-native-rand-rejection-animation-or-AI-policy',effects:'0-cards-only-pool-return-uint16-points;3-stop-plus1-and127-no-react;4-cash-to-bank-no-bank-refusal-fee-interest;6-weighted-card-pool-seat-order-full-drop-first-cheapest;7-skip-hotel-travel-prison-hospital-only-reuse-v7-turn;8-tools-including-active-vehicle-only;dream-vehicle-already-in-bag-no-duplicate;keep-dream-restore-metadata-and-v11-suspended-engineer-lease;pool-return-uint16-points-foot1',scope:'6of12-effects;no-nested-fortune3-detention-building-auction;no-effect-fee-bankruptcy-or-date-advance;v35-payment-batches-inherited;special-actors-other-listings-native-ending-and-wheel-timing-deferred'});
export const MAGIC_FINGERPRINT=hashSeed(JSON.stringify({base:BATCH_FINGERPRINT,rules:MAGIC_RULES,nodes:MAGIC_NODES,groups:MAGIC_GROUPS,effects:MAGIC_EFFECTS})).toString(16);
export type MagicRow={playerId:string;lines:string[];change?:MagicChange;nested?:NestedDetail;sold?:{itemId:string;count:number;price:number}[];received?:{itemId:string;discarded:string|null}|null;pointsBefore:number;pointsAfter:number;cashBefore:number;cashAfter:number;bankBefore:number;bankAfter:number;stopBefore:number;stopAfter:number;previousBefore:number|null;previousAfter:number|null;skipped?:boolean};
export type MagicReceipt={node:number;group:number;targets:string[];effect:number;title:string;rows:MagicRow[]};
export type MagicState={last:MagicReceipt|null;current?:MagicBatch|null;nested?:MagicNested|null};
export type MagicDecision={kind:'magic';id:string;node:number;stage:'draw'|'choose'|'result'|'build';extended?:boolean;nestedEnabled?:boolean;responderId?:string;propertyId?:string;group?:number;targets:string[];receipt?:MagicReceipt};
export type MagicEvent={type:'magicNestedCompleted';sourceId:string;stopped:boolean;cursor:number}|{type:'magicNestedCall';sourceId:string;targetId:string;seat:number;call:number}|{type:'magicStep';batchId:string;cursor:number;row:MagicRow}|{type:'magicHostility';batchId:string;targetId:string;sourceId:string;amount:number}|{type:'magicOffered';node:number}|{type:'magicTargets';node:number;group:number;targets:string[];eligibleGroups:number[]}|{type:'magicResolved';receipt:MagicReceipt};
type Emit=(e:EventPayload)=>void;
// These are the four exported original roster entries, not an inference from display names.
const sex:Record<string,number>={xiaomei:0,tuu:1,chyan:0,salonbus:1};
function traffic(s:GameState,id:string){const m=s.g2!.players[id];if(s.g5!.engineers[id]&&!s.g5!.engineers[id]!.suspended)return 3;const v=m.vehicle;return v==='tool:05'?1:v==='tool:06'?2:0;}
export function magicWealth(s:GameState,id:string,defs:readonly PropertyDefinition[]){
 const b=s.economy!.balances[id];let value=(b.cash+b.bank-s.news!.business!.loans[id])|0;
 for(const k of s.g6!.stocks)value=Math.trunc(Math.fround(value)+s.g6!.holdings[id][k.id].quantity*Math.fround(k.price/100))|0;
 for(const p of s.economy!.properties.filter(p=>p.ownerId===id)){
  const d=defs.find(d=>d.id===p.id)!;value=(value+propertyBase(p,d)+((d.kind==='land'&&p.buildingType)?1:p.level)*d.upgradeCost)|0;
 }
 return value;
}
export function magicTargets(s:GameState,group:number,defs:readonly PropertyDefinition[]):string[]{
 const alive=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));
 if(group<0||group>11||!Number.isInteger(group))return[];
 if(group<6){const values=alive.map(p=>{const owned=s.economy!.properties.filter(x=>x.ownerId===p.id);return group===0?magicWealth(s,p.id,defs):group===1?owned.length:group===2?owned.filter(x=>x.level>0).length:group===3?s.economy!.balances[p.id].cash:group===4?s.economy!.balances[p.id].bank:s.items!.points[p.id];});const max=Math.max(0,...values);return alive.filter((_,i)=>values[i]===max&&(group===0||max>0)).map(p=>p.id);}
 return alive.filter(p=>group<9?traffic(s,p.id)===group-6:group===9?s.g6!.gods.some(g=>g.carrier===p.id):sex[p.characterId]===(group===10?1:0)).map(p=>p.id);
}
export function offerMagic(s:GameState,token:()=>string,emit:Emit){
 const p=s.players[s.active];if(!s.magic||!MAGIC_NODES.includes(p.node as 35|73)||s.g2!.players[p.id].dream||s.finance!.eliminated.includes(p.id))return false;
 s.phase='magic';s.pending={kind:'magic',id:token(),node:p.node,stage:'draw',targets:[],...((s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))?{extended:true,...((s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))?{nestedEnabled:true}:{})}:{})};emit({type:'magicOffered',node:p.node});return true;
}
export function operateMagic(s:GameState,decisionId:string,effect:number|undefined,nodes:readonly MapNode[],defs:readonly PropertyDefinition[],token:()=>string,emit:Emit){
 const d=s.pending;if(!s.magic||s.phase!=='magic'||d?.kind!=='magic'||d.id!==decisionId)return false;
 if(d.stage==='result'){if(effect!==undefined)return false;s.phase='turnEnd';s.pending=null;return true;}
 if(d.stage==='draw'){
  if(effect!==undefined)return false;
  const groups=MAGIC_GROUPS.map((_,g)=>({g,targets:magicTargets(s,g,defs)})).filter(g=>g.targets.length);
  if(!groups.length)return false;
  const draw=g6Draw(s.randomState,groups.length);s.randomState=draw.state;const selected=groups[draw.index];
  Object.assign(d,{id:token(),stage:'choose',group:selected.g,targets:selected.targets});
  emit({type:'magicTargets',node:d.node,group:selected.g,targets:[...d.targets],eligibleGroups:groups.map(g=>g.g)});return true;
 }
 if(d.stage!=='choose')return false;
 const choice=MAGIC_EFFECTS.find(e=>e.id===effect);if(!choice)return false;
 const receipt:MagicReceipt={node:d.node,group:d.group!,targets:[...d.targets],effect:choice.id,title:choice.title,rows:[]};
 for(const id of d.targets){
  const p=s.players.find(p=>p.id===id)!,b=s.economy!.balances[id],m=s.g2!.players[id],bag=s.effects!.inventory[id];
  const row:MagicRow={playerId:id,lines:[],pointsBefore:s.items!.points[id],pointsAfter:0,cashBefore:b.cash,cashAfter:0,bankBefore:b.bank,bankAfter:0,stopBefore:m.stop,stopAfter:0,previousBefore:p.previous,previousAfter:null};
  if(s.finance!.eliminated.includes(id)){row.skipped=true;row.lines.push('玩家已退出，跳过。');}
  else if(effect===0||effect===8){
   row.sold=[];
   if(effect===8){const method=traffic(s,id),v=method===1?'tool:05':method===2?'tool:06':method===3?'tool:12':null;if(v)bag[v]=(bag[v]??0)+1;m.vehicle='foot';m.diceCount=1;if(!s.g5!.engineers[id]?.suspended)s.g5!.engineers[id]=null;}
   let points=0;
   for(const itemId of Object.keys(bag).sort())if(bag[itemId]>0&&itemId.startsWith(effect===0?'card:':'tool:')){
    const count=bag[itemId],price=effect===0?cardPrices[itemId]:TOOL_SELL_PRICES[Number(itemId.slice(5))];points+=count*price;row.sold.push({itemId,count,price});returnSupply(s,itemId,count);bag[itemId]=0;row.lines.push(`${itemName(itemId)} × ${count}：${count*price} 点。`);
   }
   if(effect===0)syncCardSlots(s);s.items!.points[id]=(s.items!.points[id]+points)&65535;
   row.lines.push(`点数 ${row.pointsBefore} → ${s.items!.points[id]}${effect===8?'；恢复步行、1骰':''}。`);
  }else if(effect===3){m.stop=(m.stop+1)&127;row.lines.push(`停留 ${row.stopBefore} → ${m.stop}，按自身行动计时。`);}
  else if(effect===4){b.bank+=b.cash;b.cash=0;row.lines.push(`现金 ${row.cashBefore.toLocaleString()} → 0；存款 ${row.bankBefore.toLocaleString()} → ${b.bank.toLocaleString()} 元。`);}
  else if(effect===6){row.received=receiveRandomCard(s,id,()=>{});row.lines.push(row.received?`获得${itemName(row.received.itemId)}${row.received.discarded?`，满包丢弃${itemName(row.received.discarded)}`:''}。`:'卡片供应池已空，本位未得卡。');}
  else if(effect===7){
   // The source tests bytes 50..53; winter/dream (54/55) do not block this effect.
   if(s.g4!.hotel[id]||m.travel||m.prison||m.hospital){row.skipped=true;row.lines.push('住宿、旅行或拘留中，不能转向。');}
   else{const node=nodes.find(n=>n.id===p.node)!,prev=nodes.find(n=>n.id===p.previous),candidates=g1Adjacent(node).filter(n=>n!==p.previous),draw=candidates.length?g1Draw(s.randomState,candidates.length):null;
    s.g1!.facing[id]=((s.g1!.facing[id]??(prev?directionFor(node.x-prev.x,node.y-prev.y):4))+4)%8;if(draw)s.randomState=draw.state;p.previous=draw?candidates[draw.index]:null;row.lines.push('原地向后转，下次移动使用新方向；不立即移动。');}
  }
  row.pointsAfter=s.items!.points[id];row.cashAfter=b.cash;row.bankAfter=b.bank;row.stopAfter=m.stop;row.previousAfter=p.previous;receipt.rows.push(row);
 }
 s.magic.last=structuredClone(receipt);Object.assign(d,{id:token(),stage:'result',receipt});emit({type:'magicResolved',receipt:structuredClone(receipt)});return true;
}
