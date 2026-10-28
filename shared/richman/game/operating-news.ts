import {consumerIndex} from './price-index';
import type { EventPayload, GameState } from './engine';
import type { PropertyDefinition } from './economy';
import { propertyBase, paymentSplit } from './economy';
import { propertyValue } from './finance';
import { g6Draw } from './g6-random';

export const OPERATING_NEWS_CATALOG = [
  {id:6,title:'地区基础地价上涨30%'},
  {id:7,title:'公共土地拍卖'},
  {id:12,title:'全员缴交地产税5%'},
] as const;
export type OperatingNewsChanges = {
  candidates?: string[];
  prices?: {id:string;before:number;after:number}[];
  taxes?: {playerId:string;base:number;due:number;cash:number;bank:number;unpaid:number;bankrupt:boolean;returnedShares:number}[];
  auction?: {propertyId:string;winnerId:string|null;amount:number;reserve:number};
};
export function operatingTargets(s:GameState,definitions:readonly PropertyDefinition[],unowned=false){
 return definitions.filter(d=>!unowned||s.economy!.properties.find(p=>p.id===d.id)!.ownerId===null)
  .sort((a,b)=>Number(a.kind==='facility')-Number(b.kind==='facility')||Number(a.id.split(':').at(-1))-Number(b.id.split(':').at(-1)));
}
export function operatingEligible(s:GameState,id:number,definitions:readonly PropertyDefinition[]){
 if(id===6||id===7)return operatingTargets(s,definitions,id===7).length>0;
 return id===12&&s.economy!.properties.some(p=>p.ownerId!==null);
}
export function applyOperatingNews(s:GameState,id:number,definitions:readonly PropertyDefinition[],lines:string[],eliminate?:(id:string)=>void){
 const changes:OperatingNewsChanges={},money:{playerId:string;cashBefore:number;cashAfter:number;bankBefore:number;bankAfter:number}[]=[];
 let auction: {propertyId:string;candidates:string[];skipped:number[]}|undefined;
 if(id===6||id===7){
  const candidates=operatingTargets(s,definitions,id===7),draw=g6Draw(s.randomState,candidates.length);s.randomState=draw.state;
  const target=candidates[draw.index];changes.candidates=candidates.map(d=>d.id);
  if(id===7){auction={propertyId:target.id,candidates:changes.candidates,skipped:[]};lines.push(`${target.name}（${target.nodeIds.join('/')}号）待售地产将公开竞价；款项进入公共资金，建筑保留。`);}
  else {changes.prices=[];for(const d of definitions.filter(d=>target.kind==='land'?d.kind==='land'&&d.name===target.name:d.id===target.id)){
   const p=s.economy!.properties.find(p=>p.id===d.id)!,before=propertyBase(p,d);p.basePrice=Math.floor(before*13/10)&0xffff;
   changes.prices.push({id:p.id,before,after:p.basePrice});lines.push(`${d.name}（${d.nodeIds.join('/')}号）基础地价：${before.toLocaleString()} → ${p.basePrice.toLocaleString()} 元。`);
  }lines.push('产权、建筑等级、建造费和租金表不变；后续购地、拍卖及地产估值使用新地价。');}
 }else{
  changes.taxes=[];
  // Freeze all assessments before any player's bankruptcy releases their land.
  const assessments=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)).map(p=>({playerId:p.id,base:propertyValue(p.id,s.economy!.properties,definitions)}));
  for(const {playerId,base} of assessments){
   const b=s.economy!.balances[playerId],before={...b},due=Math.floor(base/20)*consumerIndex(s),available=b.cash+b.bank,bankrupt=due>available;
   const paid=paymentSplit(b,Math.min(due,available),true)!;b.cash-=paid.cash;b.bank-=paid.bank;s.news!.publicFund+=paid.cash+paid.bank;
   let returnedShares=0;
   if(bankrupt){
    if(!eliminate)throw new Error('Tax insolvency requires elimination handler');
    // Tax payment has already failed: holdings cannot rescue it. Keep existing Web pool cleanup convention.
    for(const k of s.g6!.stocks){const h=s.g6!.holdings[playerId][k.id];returnedShares+=h.quantity;k.pool+=h.quantity;k.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}
    eliminate(playerId);
   }
   money.push({playerId,cashBefore:before.cash,cashAfter:b.cash,bankBefore:before.bank,bankAfter:b.bank});
   changes.taxes.push({playerId,base,due,cash:paid.cash,bank:paid.bank,unpaid:due-paid.cash-paid.bank,bankrupt,returnedShares});
   lines.push(`玩家${playerId.split('-')[1]}：税基 ${base.toLocaleString()}，应缴 ${due.toLocaleString()} 元；现金 ${paid.cash.toLocaleString()}＋存款 ${paid.bank.toLocaleString()}${bankrupt?`，未付 ${(due-available).toLocaleString()} 元，破产退出；${returnedShares}股归池，不抵本次欠税`:''}。`);
   const survivors=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));
   if(survivors.length===1){s.finance!.winnerId=survivors[0].id;lines.push(`玩家${survivors[0].id.split('-')[1]}为唯一未破产玩家，确认后结束对局；后续玩家不再征税。`);break;}
  }
 }
 return {changes,money,auction};
}
export function emitOperatingAuction(s:GameState,decision:{newsId:number;title:string;node:number},changes:OperatingNewsChanges,skipped:number[],emit:(e:EventPayload)=>void){
 emit({type:'newsResolved',...decision,skipped,money:[],stocks:[],publicFund:s.news!.publicFund,cursor:s.news!.cursor,operatingChanges:changes});
}
