import type {GameState} from './engine';
import type {MapNode} from '../types';
import type {ComputerDecision,ComputerPolicy} from './computer';
import {decisionPlayer} from './computer';
import {decideComputer as previousDecision} from './computer-gods';
import {marketAvailable,priceLimit,tradeAmount,stockValue} from './g6-market';
import {marketBuyLimit} from './stock-market';
import {holdingSummary} from './stock-ledger';
import {JAPAN_STOCKS} from './g6-catalog';
import {PROPERTY_CATALOG} from './economy';
import {g4RentLines} from './g4';
import {consumerIndex} from './price-index';
import {loanCapacity} from './news-business';
export const CAPITAL_POLICY='capital-v1';
/** Present public liabilities only; no future quote, deck, RNG or snapshot forecast. */
export function capitalBudget(s:GameState,id=s.players[s.active].id){
 const b=s.economy!.balances[id],business=s.news!.business!,ally=s.g3!.allies[id]?.partner;
 const rent=Math.max(0,...PROPERTY_CATALOG.properties.filter(d=>d.kind==='land'&&s.economy!.properties.some(q=>q.id===d.id&&q.ownerId&&q.ownerId!==id&&q.ownerId!==ally)).map(d=>g4RentLines(s,d,PROPERTY_CATALOG.properties).reduce((n,r)=>n+r.amount,0)*consumerIndex(s)));
 // Entire current loss is a conservative bound, not the final pro-rata/net dividend bill.
 const losses=business.companies.filter(c=>c.funds<0&&s.g6!.holdings[id][c.stockId].quantity>0).reduce((n,c)=>n-c.funds,0);
 const operating=Math.max(10000,5000+rent)+losses,debt=business.loans[id],liquid=b.cash+b.bank;
 const basis=s.g6!.stocks.reduce((n,k)=>n+holdingSummary(s.g6!.holdings[id][k.id],k.price).cost,0);
 const cap=Math.max(0,Math.min(10000,Math.floor((liquid+basis-debt)/5)));
 return {operating,debt,liquid,basis,reserve:operating+debt,room:Math.max(0,cap-basis)};
}
function allyLimit(s:GameState,stockId:string){
 const id=s.players[s.active].id,ally=s.g3!.allies[id]?.partner,c=s.news!.business!.companies.find(c=>c.stockId===stockId);
 return c?.ownerId===ally&&ally?Math.max(0,s.g6!.holdings[ally][stockId].quantity-s.g6!.holdings[id][stockId].quantity):Infinity;
}
export function capitalTrade(s:GameState):ComputerDecision['action']|null{
 if(!marketAvailable(s))return null;
 const id=s.players[s.active].id,b=s.economy!.balances[id],budget=capitalBudget(s,id);
 for(const k of s.g6!.stocks){
  const h=s.g6!.holdings[id][k.id];if(!h.quantity||s.news!.business!.halted[k.id]||priceLimit(k)==='down')continue;
  const deficit=budget.reserve-budget.liquid,c=s.news!.business!.companies.find(c=>c.stockId===k.id),summary=holdingSummary(h,k.price);
  const profit=summary.unrealized>=500&&k.price/100>=summary.average*1.2&&c?.ownerId!==id;
  const quantity=deficit>0?Math.min(h.quantity,Math.ceil(deficit*100/k.price)):profit?h.quantity:0;
  if(quantity)return {type:'stockTrade',stockId:k.id,side:'sell',quantity};
 }
 if(budget.debt)return null; // Never borrow to invest, even if the loan is not due yet.
 for(const k of s.g6!.stocks){
  const h=s.g6!.holdings[id][k.id],c=s.news!.business!.companies.find(c=>c.stockId===k.id);
  if(h.quantity||s.news!.business!.halted[k.id]||priceLimit(k)==='up'||k.trend==='black'||(c?.funds??0)<0||k.price>JAPAN_STOCKS.find(d=>d.id===k.id)!.price*.9)continue;
  const money=Math.max(0,Math.min(5000,b.bank-budget.reserve,budget.room));
  const quantity=Math.min(100,Math.floor(money*100/k.price),marketBuyLimit(b.bank,k.price,k.pool,k.quota),allyLimit(s,k.id));
  if(quantity>0&&tradeAmount(k.price,quantity)>=100)return {type:'stockTrade',stockId:k.id,side:'buy',quantity};
 }
 return null;
}
export function capitalSubscription(s:GameState){
 const p=s.pending;if(p?.kind!=='subscription')return null;
 const id=s.players[s.active].id,c=s.news!.business!.companies.find(c=>c.id===p.companyId)!,k=s.g6!.stocks.find(k=>k.id===c.stockId)!,budget=capitalBudget(s),price=Math.trunc(c.capital/10000),b=s.economy!.balances[id];
 if(budget.debt||c.funds<0||price<=0||price>k.price/100*.9)return null;
 const money=Math.max(0,Math.min(5000,b.cash-5000,budget.liquid-budget.reserve,budget.room));
 const quantity=Math.min(100,p.maximum,c.subscription??0,Math.floor(money/price),allyLimit(s,k.id));
 return quantity>0&&quantity*price>=100?quantity:null;
}
export function decideComputer(s:GameState,nodes:readonly MapNode[],policy:ComputerPolicy='basic-v1'):ComputerDecision|null{
 if(policy!==CAPITAL_POLICY)return previousDecision(s,nodes,policy);
 if((s.rulesId !== 'japan-events-candidate-v44' && (s.rulesId !== 'japan-events-candidate-v45' && (s.rulesId !== 'japan-events-candidate-v46' && s.rulesId !== 'japan-events-candidate-v47')))||s.paused||s.phase==='finished')return null;
 const id=decisionPlayer(s),p=s.pending;
 if(id!==s.players[s.active].id)return previousDecision(s,nodes,'gods-v1');
 const choose=(action:ComputerDecision['action'],reason:string):ComputerDecision=>({playerId:id,action,reason}),budget=capitalBudget(s),b=s.economy!.balances[id];
 if(p?.kind==='bank'){
  const business=s.news!.business!;
  if(business.bankRejected?.[id])return choose({type:'leaveBank',decisionId:p.id},'银行拒绝往来，离开并保留现有债务');
  const repay=Math.min(budget.debt,Math.max(0,budget.liquid-budget.operating));
  if(repay)return choose({type:'loan',decisionId:p.id,operation:'repay',amount:repay},'保留经营缓冲后还款；实际规则先扣银行再现金，部分还款不延期');
  const short=5000-budget.liquid;
  if(short>0&&!budget.debt&&!business.noLoans[id]&&!stockValue(s.g6,id)&&s.economy!.properties.some(q=>q.ownerId===id)&&loanCapacity(s,id,PROPERTY_CATALOG.properties)>=short)return choose({type:'loan',decisionId:p.id,operation:'borrow',amount:short},'无持股且流动资金不足5000元，以已有地产额度补足；不追加借款或借款炒股');
  const target=Math.min(5000,budget.liquid),amount=Math.abs(target-b.cash);
  return amount?choose({type:'bank',decisionId:p.id,operation:target>b.cash?'withdraw':'deposit',amount},'调整可用现金至5000元，保留其余银行资金'):choose({type:'leaveBank',decisionId:p.id},'资金调整完成');
 }
 if(p?.kind==='subscription')return choose({type:'subscribeCompany',decisionId:p.id,quantity:capitalSubscription(s)},'只以现金余量认购折价公司股份，核对份额与盟友经营权；不假设未来盈利');
 if(p?.kind==='property'&&p.operation!=='rent'&&(b.cash-p.amount<3000||budget.liquid-p.amount<budget.reserve))return choose({type:'property',decisionId:p.id,accept:false},'保留当前经营与债务缓冲，跳过可选购建');
 if(!p&&['idle','turnEnd'].includes(s.phase)){
  const trade=capitalTrade(s);
  // Liquidity sales precede cards; otherwise preserve existing active item priorities (including red on own holdings).
  if(trade?.type==='stockTrade'&&trade.side==='sell'&&budget.liquid<budget.reserve)return choose(trade,'按当前缺口卖出必要股数，款入银行；停牌/跌停不做普通卖出');
  const prior=previousDecision(s,nodes,'gods-v1');
  if(prior&&['item','research','traffic'].includes(prior.action.type))return prior;
  if(trade)return choose(trade,trade.type==='stockTrade'&&trade.side==='buy'?'以银行余量小额配置公开折价股票；100股/5000元上限，不平均补仓':'当前盈利达到20%且至少500元，落袋非自营公司的持仓');
  return prior;
 }
 return previousDecision(s,nodes,'gods-v1');
}
