import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-tools';
import {shopPrice,shopSupply} from './shop-acquisition';

export const RENT_POLICY='rent-v1';
/** Public, current liquidation estimate only. No future price, deck, RNG or world simulation. */
export function rentRisk(s:GameState,id:string,amount:number){
 const b=s.economy?.balances[id],liquid=(b?.cash??0)+(b?.bank??0);
 const stocks=s.g6?.stocks.reduce((n,k)=>n+Math.trunc((s.g6!.holdings[id]?.[k.id]?.quantity??0)*k.price/100),0)??0;
 return{liquid,stocks,shortfall:Math.max(0,amount-liquid-stocks),needsShares:amount>liquid};
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==RENT_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending,bag=s.effects?.inventory[id];
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason});
 if(p?.kind==='reaction'&&p.continuation.kind==='rent'){
  const rent=p.continuation.decision,risk=rentRisk(s,id,rent.amount);
  const decline=(reason:string)=>choose({type:'reaction',decisionId:p.id,choice:'decline'},reason);
  if(rent.amount<=0||id===rent.recipientId)return decline('本次无实际对外租金，保留反应卡');
  if(p.stage==='free')return (bag?.['card:20']??0)>0&&!rent.hotelTurns
   ?choose({type:'reaction',decisionId:p.id,choice:'use'},`使用免费卡免除${rent.amount}元租金${risk.shortfall?'，避免资金不足退出':risk.needsShares?'，避免必要清股':''}`)
   :decline('免费卡或适用条件已失效，继续既有租金流程');
  if(!((bag?.['card:19']??0)>0))return decline('嫁祸卡已不在库存，继续结算');
  const targets=p.targets.filter(target=>target!==id&&s.players.some(x=>x.id===target)&&!s.finance?.eliminated.includes(target));
  const owner=targets.find(target=>target===rent.recipientId);
  if(owner)return choose({type:'reaction',decisionId:p.id,choice:'use',targetId:owner},'将租金转给合法收租业主本人，免除转账并保留己方资金与持仓');
  const ally=s.g3?.allies[id]?.partner;
  // Prefer a solvent non-ally. A last-resort ally is considered only to prevent our own exit.
  const ranked=targets.filter(target=>target!==ally||risk.shortfall>0).map(target=>({target,risk:rentRisk(s,target,rent.amount)}))
   .sort((a,b)=>Number(a.target===ally)-Number(b.target===ally)||a.risk.shortfall-b.risk.shortfall||Number(a.risk.needsShares)-Number(b.risk.needsShares)||b.risk.liquid-a.risk.liquid||s.players.findIndex(p=>p.id===a.target)-s.players.findIndex(p=>p.id===b.target));
  const target=ranked[0];
  return target?choose({type:'reaction',decisionId:p.id,choice:'use',targetId:target.target},`转由${target.target}实际付款；${target.risk.shortfall?'现有资产不足，由其确认退出':target.risk.needsShares?'由既有规则卖出必要持股':'现有现金与存款可支付'}，不提前清股`):decline('没有合适的合法替代付款人，保留嫁祸卡');
 }
 // Restock at most one of each, from the actual finite shelf; full bags never displace a card.
 if(p?.kind==='shop'&&(s.g3?.slots[id].length??15)<15){
  const item=['card:20','card:19'].find(item=>!((bag?.[item]??0)>0)&&p.shelf?.cards.some(x=>x.itemId===item&&x.available)&&s.items!.points[id]>=shopPrice(item)&&shopSupply(s,item)>0);
  if(item)return choose({type:'buyItem',decisionId:p.id,itemId:item},`花${shopPrice(item)}点补充一张${item==='card:20'?'免费卡':'嫁祸卡'}，保留现金且不挤掉已有卡片`);
 }
 const d=previousDecision(s,nodes,'tools-v1');
 if(d&&(p?.kind==='debt'||p?.kind==='property'&&p.operation==='rent'))return{...d,reason:p.kind==='debt'?'实际付款人资金不足：确认退出，公共处置所得不救活或代付原债':'由实际付款人支付租金；必要持股已由既有付款流程清算'};
 return d;
}
