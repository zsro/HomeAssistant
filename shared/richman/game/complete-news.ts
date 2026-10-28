import {consumerIndex,stockTaxBaseCents} from './price-index';
import type { GameState, EventPayload } from './engine';
import type { MapNode } from '../types';
import type { PropertyDefinition, PropertyState } from './economy';
import type { NewsDecision } from './news';
import type { Mobility } from './g2';
import { detained, enterDetention } from './g2';
import { consumeG3, openReaction } from './g3';
import { hospital, reconcileResearch } from './g5';
import { marketPrice } from './g6-market';
import { g6Draw } from './g6-random';
import { propertyBase, paymentSplit } from './economy';
import { operatingTargets } from './operating-news';
import { newsBuildings } from './property-news';
import { projectWorkerAnchor } from './nearby-construction';
import type { Company, NewsBusiness } from './news-business';

export const COMPLETE_NEWS_CATALOG = [
  {id:4,title:'外星人攻打地球'}, {id:10,title:'股市第一大户获奖励'}, {id:13,title:'全员缴交证交税5%'}, {id:14,title:'闹鬼地区地价下跌30%'},
  {id:18,title:'强烈地震，房屋倒塌'}, {id:19,title:'山洪造成土地流失'}, {id:20,title:'超级台风，多处房屋受损'}, {id:21,title:'龙卷风摧毁建筑'},
  {id:22,title:'银行挤兑，停止放款'}, {id:26,title:'股市暂停交易'}, {id:27,title:'个股暂停交易'}, {id:28,title:'个股恢复上市'}, {id:29,title:'公司违法超贷，经营者入狱'},
  {id:30,title:'公司排污罚款'}, {id:31,title:'公司海外投资获利'}, {id:32,title:'公司海外投资亏损'}, {id:33,title:'公司违规开发罚款'}, {id:34,title:'公司噪音罚款'}, {id:35,title:'公司获利加倍'},
] as const;
export type CompleteNewsChanges = {
 candidates?: string[]; targetId?: string;
 properties?: {before:PropertyState;after:PropertyState}[];
 hotel?: {playerId:string;before:number;after:number}[];
 players?: {playerId:string;before:Mobility;after:Mobility;nodeBefore:number;nodeAfter:number}[];
 counts?: {playerId:string;count:number}[];
 taxes?: {playerId:string;baseCents:number;due:number;cash:number;bank:number;unpaid:number;returnedShares:number;bankrupt:boolean}[];
 business?: {before:NewsBusiness;after:NewsBusiness};
 company?: {before:Company;after:Company};
 prosecution?: {originalId:string;targetId:string|null;absolved:boolean;redirected:boolean};
};
export type NewsProsecution = {kind:'newsProsecution';originalId:string;news:NewsDecision;skipped:number[];changes:CompleteNewsChanges};
type Emit=(e:EventPayload)=>void;
const active=(s:GameState,id:string)=>!s.finance!.eliminated.includes(id);
const present=(s:GameState,id:string)=>active(s,id)&&!detained(s.g2!.players[id])&&!s.g4!.hotel[id];
export function completeNewsEligible(s:GameState,id:number,defs:readonly PropertyDefinition[]){
 if(!s.news?.business||!COMPLETE_NEWS_CATALOG.some(n=>n.id===id))return false;
 if(id===4)return newsBuildings(s,defs,false).length>0;
 if(id===10||id===13)return s.players.some(p=>active(s,p.id)&&Object.values(s.g6!.holdings[p.id]).some(h=>h.quantity>0));
 if(id===28)return Object.values(s.news.business.halted).some(n=>n>0);
 if(id===29)return s.news.business.companies.some(c=>c.ownerId&&present(s,c.ownerId));
 if(id===35)return s.news.business.companies.some(c=>c.funds>10000);
 if([14,18,19,20,21].includes(id))return defs.length>0;
 return true;
}
export function applyCompleteNews(s:GameState,id:number,defs:readonly PropertyDefinition[],nodes:readonly MapNode[],lines:string[],emit:Emit,eliminate?:(id:string)=>void){
 const changes:CompleteNewsChanges={},money:{playerId:string;cashBefore:number;cashAfter:number;bankBefore:number;bankAfter:number}[]=[],stocks:{id:string;before:number;after:number}[]=[];
 const business=s.news!.business!;let prosecution:string|undefined;
 const select=<T,>(values:T[])=>{const d=g6Draw(s.randomState,values.length);s.randomState=d.state;return values[d.index];};
 if([4,14,18,19,20,21].includes(id)){
  const pool=id===4?newsBuildings(s,defs,false):operatingTargets(s,defs),target=select(pool);changes.candidates=pool.map(d=>d.id);changes.targetId=target.id;
  const square=(p:{x:number;y:number})=>{const a=projectWorkerAnchor(target,p);return !!a&&a.x>=120&&a.x<320&&a.y>=120&&a.y<320;};
  const affected=id===4||id===20?defs.filter(square):id===14||id===18?defs.filter(d=>target.kind==='land'?d.kind==='land'&&d.name===target.name:d.id===target.id):[target];
  changes.properties=[];changes.hotel=[];changes.players=[];
  for(const d of affected){
   const p=s.economy!.properties.find(p=>p.id===d.id)!,before=structuredClone(p);
   if(id===14)p.basePrice=Math.floor(propertyBase(p,d)*7/10)&65535;
   else if(id===4||id===19){p.ownerId=null;p.level=0;p.buildingType=0;p.research=null;}
   else{p.level=Math.max(0,p.level-1);if(d.kind==='land'&&p.buildingType)p.level=0;if(!p.level){p.buildingType=0;p.research=null;}}
   reconcileResearch(s,defs,emit);
   changes.properties.push({before,after:structuredClone(p)});
   lines.push(`${d.name}（${d.nodeIds.join('/')}号）：${id===14?`基础地价 ${propertyBase(before,d)} → ${p.basePrice}`:`建筑 ${before.level} → ${p.level}级；归属 ${before.ownerId??'待售'} → ${p.ownerId??'待售'}`}。`);
   if(id!==14&&d.kind==='facility'&&(id===4||id===19||(before.level>0&&p.level===0)))for(const player of s.players){
    const value=s.g4!.hotel[player.id];if(active(s,player.id)&&value&&value!==128){s.g4!.hotel[player.id]=128;changes.hotel.push({playerId:player.id,before:value,after:128});}
   }
  }
  if(id===4){const targets=s.players.filter(p=>present(s,p.id)&&square(nodes.find(n=>n.id===p.node)!)).map(p=>p.id);for(const pid of targets){
   const player=s.players.find(p=>p.id===pid)!,before=structuredClone(s.g2!.players[pid]),nodeBefore=player.node;
   hospital(s,nodes,pid,3,emit);changes.players.push({playerId:pid,before,after:structuredClone(s.g2!.players[pid]),nodeBefore,nodeAfter:player.node});
   lines.push(`玩家${pid.split('-')[1]}住院3次，现用车辆损毁。`);
  }}
  lines.push(id===14?'建筑、产权、租金表不变。':'无现金费用或赔偿；不触发反制卡或解除同盟。设施降至空地可标记全体住客离店，科研按剩余等级核查。');
  if(id===4||id===20)lines.push('范围沿用投影200×200地块/角色锚点；路障、地雷和炸弹不属于本新闻清除对象。');
 }else if(id===10){
  changes.counts=s.players.filter(p=>active(s,p.id)).map(p=>({playerId:p.id,count:Object.values(s.g6!.holdings[p.id]).reduce((v,h)=>v+h.quantity,0)}));
  const winner=changes.counts.reduce((a,b)=>b.count>a.count?b:a),b=s.economy!.balances[winner.playerId],before={...b};b.cash+=10000*consumerIndex(s);
  money.push({playerId:winner.playerId,cashBefore:before.cash,cashAfter:b.cash,bankBefore:before.bank,bankAfter:b.bank});
  lines.push(`按十二股持有股数合计，${changes.counts.map(c=>`${c.playerId} ${c.count}股`).join('；')}。${winner.playerId}获现金${(10000*consumerIndex(s)).toLocaleString()}元，并列取前席。`);
 }else if(id===13){
  changes.taxes=[];
  const assessed=s.players.filter(p=>active(s,p.id)).map(p=>({playerId:p.id,baseCents:stockTaxBaseCents(s,p.id)}));
  for(const {playerId,baseCents} of assessed){
   const b=s.economy!.balances[playerId],before={...b},due=Math.floor(baseCents/2000)*consumerIndex(s),available=b.cash+b.bank,bankrupt=due>available;
   const paid=paymentSplit(b,Math.min(due,available),true)!;b.cash-=paid.cash;b.bank-=paid.bank;s.news!.publicFund+=paid.cash+paid.bank;let returnedShares=0;
   if(bankrupt){if(!eliminate)throw new Error('Tax insolvency requires elimination handler');for(const k of s.g6!.stocks){const h=s.g6!.holdings[playerId][k.id];returnedShares+=h.quantity;k.pool+=h.quantity;k.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}eliminate(playerId);}
   money.push({playerId,cashBefore:before.cash,cashAfter:b.cash,bankBefore:before.bank,bankAfter:b.bank});
   changes.taxes.push({playerId,baseCents,due,cash:paid.cash,bank:paid.bank,unpaid:due-paid.cash-paid.bank,returnedShares,bankrupt});
   lines.push(`${playerId}：股票总市值 ${(baseCents/100).toFixed(2)} 元，税 ${due} 元；实付现金 ${paid.cash}＋银行 ${paid.bank}${bankrupt?'，不足破产，持仓归池不抵税':''}。`);
   const survivors=s.players.filter(p=>active(s,p.id));if(survivors.length===1){s.finance!.winnerId=survivors[0].id;lines.push('只剩一位未破产玩家，确认后结束对局。');break;}
  }
 }else{
  const before=structuredClone(business);
  if(id===22){for(const p of s.players.filter(p=>active(s,p.id)))business.noLoans[p.id]=15;lines.push('全体未破产玩家停止放款15次自身行动边界，覆盖原期限；仍能存取款和还款。');}
  else if(id===26){business.marketClosed=10;lines.push('全市停止主动交易和周期行情10轮，1之后为待解除标志，再下一轮恢复；红黑及个股停牌期限仍按轮推进。');}
  else if(id===27||id===28){const pool=s.g6!.stocks.filter(k=>id===27||business.halted[k.id]>0),k=select(pool);changes.candidates=pool.map(k=>k.id);changes.targetId=k.id;business.halted[k.id]=id===27?15:0;if(id===27){const price=k.price;k.price=k.base;k.history[k.history.length-1]=k.price;stocks.push({id:k.id,before:price,after:k.price});}lines.push(`${k.id}：${id===27?'停止主动交易15轮，现价恢复本期基准价（原文10，函数15）':'解除个股停牌；如全市仍休市，需等待全市恢复'}。`);}
  else{
   const pool=business.companies.filter(c=>id===29?c.ownerId!==null:id===35?c.funds>10000:true),c=select(pool);changes.candidates=pool.map(c=>c.id);changes.targetId=c.id;changes.company={before:structuredClone(c),after:c};
   if(id===29){prosecution=c.ownerId!;lines.push(`${c.name}经营者${c.ownerId}将被监禁5次；先处理免罪/嫁祸，无复仇或敌意。`);}
   else{
    const delta=id===31?20000:id===32?-20000:id===34?-5000:-10000;let code=id===31?0x30:id===32?4:3;
    if(id===35){const previous=c.funds;c.funds=(previous*2)|0;c.cumulative=(c.cumulative+c.funds)|0;code=(Math.floor(previous/10000)<<4)&255;}
    else{c.funds=(c.funds+delta)|0;c.cumulative=(c.cumulative+delta)|0;}
    const k=s.g6!.stocks.find(k=>k.id===c.stockId)!;k.trend=code&240?'red':code&15?'black':null;k.remaining=code&240?code>>>4:code&15;
    if(k.trend){if((s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))k.momentum=k.trend==='red'?10:-10;const price=k.price;k.price=marketPrice(k.base,k.trend==='red'?10:-10);k.history[k.history.length-1]=k.price;stocks.push({id:k.id,before:price,after:k.price});}
    lines.push(`${c.name}：本期账面 ${changes.company.before.funds} → ${c.funds}；累计 ${changes.company.before.cumulative} → ${c.cumulative} 元。`);
    lines.push(`${c.stockId} ${k.trend==='red'?'红':k.trend==='black'?'黑':'普通'}行情，原始剩余 ${k.remaining}；按本期基准更新，不直接改个人现金/存款。`);
   }
   changes.company.after=structuredClone(c);
  }
  changes.business={before,after:structuredClone(business)};
 }
 return {changes,money,stocks,prosecution};
}
function finishProsecution(s:GameState,nodes:readonly MapNode[],c:NewsProsecution,targetId:string|null,token:()=>string,emit:Emit){
 const decision=structuredClone(c.news),changes=structuredClone(c.changes);
 changes.prosecution={originalId:c.originalId,targetId,absolved:targetId===null,redirected:targetId!==null&&targetId!==c.originalId};changes.players=[];
 if(targetId){const p=s.players.find(p=>p.id===targetId)!,before=structuredClone(s.g2!.players[targetId]),nodeBefore=p.node;enterDetention(s,nodes,targetId,'prison',5,emit);changes.players.push({playerId:targetId,before,after:structuredClone(s.g2!.players[targetId]),nodeBefore,nodeAfter:p.node});decision.lines.push(`${targetId}实际入狱，原期限 ${before.prison} → ${s.g2!.players[targetId].prison}；不再检查目标反制卡。`);}
 else decision.lines.push('经营者自动使用免罪卡，本次不入狱。');
 decision.id=token();s.pending=decision;s.phase='news';
 emit({type:'newsResolved',newsId:29,title:decision.title,node:decision.node,skipped:c.skipped,money:[],stocks:[],publicFund:s.news!.publicFund,cursor:s.news!.cursor,completeChanges:changes});
}
export function startProsecution(s:GameState,nodes:readonly MapNode[],c:NewsProsecution,token:()=>string,emit:Emit){
 if(consumeG3(s,c.originalId,'card:21',emit))finishProsecution(s,nodes,c,null,token,emit);
 else if(s.effects!.inventory[c.originalId]['card:19']>0)openReaction(s,c,c.originalId,'redirect',token,emit);
 else finishProsecution(s,nodes,c,c.originalId,token,emit);
}
export function reactProsecution(s:GameState,nodes:readonly MapNode[],choice:'use'|'decline',targetId:string|undefined,token:()=>string,emit:Emit){
 const p=s.pending;if(p?.kind!=='reaction'||p.continuation.kind!=='newsProsecution'||!['use','decline'].includes(choice)||(choice==='use'?!p.targets.includes(targetId!):targetId!==undefined))return false;
 if(choice==='use'&&!consumeG3(s,p.responderId,'card:19',emit))return false;
 emit({type:'reactionAnswered',responderId:p.responderId,stage:'redirect',choice,...(targetId?{targetId}:{})});
 finishProsecution(s,nodes,p.continuation,choice==='use'?targetId!:p.responderId,token,emit);return true;
}
