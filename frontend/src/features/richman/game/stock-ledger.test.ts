import { expect, it } from 'vitest';
import { GameEngine } from './engine';
import type { GameState } from './engine';
import { buyHolding, sellHolding, holdingSummary } from './stock-ledger';
import { STOCK_LEDGER_FINGERPRINT } from './stock-ledger-rules';
import { tradeStock, liquidateForRent, marketTick } from './g6-market';
import type { Holding } from './g6-market';
import { offerSubscription, subscribeCompany } from './commerce';
import { offerAssetFortune, assetFortuneEligible, collectFortuneCard } from './asset-fortune';
import { saveCheckpoint, restoreCheckpoint } from './g7';
import { PROPERTY_CATALOG } from './economy';
import type { PropertyDefinition } from './economy';
const definitions=PROPERTY_CATALOG.properties as readonly PropertyDefinition[];
import nodes from '../japan-topology.fixture.json';
const emit = () => undefined;
function setup(version=43,count=3) {
  const e=new GameEngine(nodes,{gameId:'ledger',seed:'ledger',rulesId:`japan-events-candidate-v${version}`,characterIds:['a','b','c'].slice(0,count),initialFunds:100000,startDate:'1998-01-09'});
  const s=(e as unknown as {current:GameState}).current;s.g6!.gods=[];
  return {e,s,h:s.g6!.holdings['player-1']['jp:24'],k:s.g6!.stocks[0],b:s.economy!.balances['player-1']};
}
it('v43 adds float averages without changing v42 initial quotes, RNG or legacy fingerprint',()=>{
  const a=setup(),b=setup(42);expect(a.s.items!.fingerprint).toBe(STOCK_LEDGER_FINGERPRINT);expect(b.s.items!.fingerprint).toBe('3d941ac1');
  expect(a.s.g6!.stocks).toEqual(b.s.g6!.stocks);expect(a.s.randomState).toBe(b.s.randomState);
  expect(a.h).toEqual({quantity:0,cost:0,average:0});expect(b.h).toEqual({quantity:0,cost:0});
});
it.each([[3,10],[7,100],[9,1000],[11,109],[1000,33333]])('buy %i shares for %i stores float average and derived cost',(q,paid)=>{
  const h:Holding={quantity:0,cost:0,average:0};buyHolding(h,q,paid);expect(h.average).toBe(Math.fround(paid/q));expect(h.cost).toBe(Math.trunc(q*Math.fround(paid/q)));
});
it('partial sale preserves unrounded average; re-entry truncates remaining basis first',()=>{
  const h:Holding={quantity:0,cost:0,average:0};buyHolding(h,3,10);const avg=h.average!;sellHolding(h,1);expect(h).toEqual({quantity:2,cost:6,average:avg});buyHolding(h,1,5);expect(h.average).toBe(Math.fround(11/3));expect(h.cost).toBe(11);
});
it('float storage may make derived cost less than cash spent, never compensates money',()=>{
  const h:Holding={quantity:0,cost:0,average:0};buyHolding(h,3,10);expect(h.cost).toBe(9);expect(holdingSummary(h,400)).toEqual({average:Math.fround(10/3),cost:9,value:12,unrealized:3});
});
it.each([0,1,2,3])('sell %i shares, clear average only at zero',q=>{
  const h:Holding={quantity:0,cost:0,average:0};buyHolding(h,3,10);const avg=h.average;sellHolding(h,q);expect(h.average).toBe(q===3?0:avg);expect(h.cost).toBe(Math.trunc((3-q)*(q===3?0:avg!)));
});
it('empty sale, repurchase and no-average old branch stay finite and distinct',()=>{
  const h:Holding={quantity:0,cost:0,average:0};sellHolding(h,0);buyHolding(h,2,15);sellHolding(h,2);buyHolding(h,1,8);expect(h).toEqual({quantity:1,cost:8,average:8});
  const old:Holding={quantity:0,cost:0};buyHolding(old,3,10);sellHolding(old,1);buyHolding(old,1,5);expect(old).toEqual({quantity:3,cost:11});
});
it('market amount moves only bank/public pool/quota; price movement never changes average',()=>{
  const {s,h,k,b}=setup();k.price=k.base=333;k.quota=100;const cash=b.cash,bank=b.bank,pool=k.pool,companies=structuredClone(s.news!.business!.companies);
  expect(tradeStock(s,k.id,'buy',3,emit)).toBe(true);expect(b).toEqual({cash,bank:bank-9});expect(h.average).toBe(3);expect(k.pool).toBe(pool-3);expect(k.quota).toBe(97);
  marketTick(s,emit);expect(h.average).toBe(3);k.base=k.price;expect(tradeStock(s,k.id,'sell',1,emit)).toBe(true);expect(h).toEqual({quantity:2,cost:6,average:3});expect(s.news!.business!.companies.map(c=>[c.funds,c.cumulative,c.capital])).toEqual(companies.map(c=>[c.funds,c.cumulative,c.capital]));expect(s.news!.business!.companies.find(c=>c.stockId===k.id)!.ownerId).toBe('player-1');
});
it.each(['closed','halted','limit','quantity','funds'] as const)('%s rejected trade leaves average and funds unchanged',kind=>{
  const {s,k,b}=setup();if(kind==='closed')s.news!.business!.marketClosed=1;if(kind==='halted')s.news!.business!.halted[k.id]=1;if(kind==='limit'){k.base=1000;k.price=1100;}if(kind==='funds')b.bank=0;
  const before=structuredClone(s);expect(tradeStock(s,k.id,'buy',kind==='quantity'?0:1,emit)).toBe(false);expect(s).toEqual(before);
});
it('cash subscription uses same remaining average, separate supply and no operating income',()=>{
  const {s}=setup(),c=s.news!.business!.companies.find(c=>c.id==='japan:company:2')!,h=s.g6!.holdings['player-1'][c.stockId],k=s.g6!.stocks.find(k=>k.id===c.stockId)!;
  buyHolding(h,3,10);sellHolding(h,1);s.players[0].node=c.nodeIds[0];const bank=s.economy!.balances['player-1'].bank,cash=s.economy!.balances['player-1'].cash,pool=k.pool,quota=k.quota,available=c.subscription!,funds=c.funds;
  expect(offerSubscription(s,()=> 'subscribe')).toBe(true);const price=Math.trunc(c.capital/10000);expect(subscribeCompany(s,'subscribe',2,emit)).toBe(true);
  expect(h.average).toBe(Math.fround((6+2*price)/4));expect(c.subscription).toBe(available-2);expect(k.pool).toBe(pool);expect(k.quota).toBe(quota);expect(c.funds).toBe(funds);expect(c.ownerId).toBe('player-1');expect(s.economy!.balances['player-1']).toEqual({cash:cash-2*price,bank});
});
it.each([8,9])('fortune %i preserves or clears average with correct proceeds destination',id=>{
  const {s,h,k,b}=setup();buyHolding(h,13,100);k.price=1234;s.news!.business!.halted[k.id]=5;s.news!.business!.marketClosed=5;const avg=h.average,bank=b.bank,pub=s.news!.publicFund;
  expect(assetFortuneEligible(s,id,definitions)).toBe(true);offerAssetFortune(s,id,definitions,[],()=> 'fortune',emit);
  expect(h.average).toBe(id===8?avg:0);expect(h.quantity).toBe(id===8?12:0);expect(b.bank-bank).toBe(id===8?0:160);expect(s.news!.publicFund-pub).toBe(id===8?12:0);
});
it('v43 inherited fortune collection can finish with real donor slot',()=>{
  const {s}=setup();s.g3!.slots['player-2']=['card:06'];s.effects!.inventory['player-2']['card:06']=1;
  expect(assetFortuneEligible(s,5,definitions)).toBe(true);offerAssetFortune(s,5,definitions,[],()=> 'collect',emit);expect(collectFortuneCard(s,'collect',null,()=> 'next',emit)).toBe(true);
});
it('debt liquidation ignores manual stop, preserves partial average and credits bank',()=>{
  const {s,h,k,b}=setup();buyHolding(h,13,100);const avg=h.average;k.price=900;k.base=1000;b.cash=b.bank=0;s.news!.business!.halted[k.id]=5;
  liquidateForRent(s,'player-1',17,emit);expect(h.quantity).toBe(11);expect(h.average).toBe(avg);expect(b.bank).toBe(18);expect(s.news!.publicFund).toBe(0);
});
it.each([2,3])('bankruptcy with %i players keeps native final-survivor disposal boundary',count=>{
  const {e,s,h,k,b}=setup(43,count);buyHolding(h,13,100);b.cash=2;b.bank=3;const avg=h.average;k.price=1234;s.phase='debt';s.pending={kind:'debt',id:'debt',propertyId:s.economy!.properties[0].id,recipientId:'player-2',amount:100,available:5,shortfall:95,lines:[]};
  expect(e.dispatch({gameId:s.gameId,id:'settle',expectedRevision:s.revision,playerId:'player-1',action:{type:'settleDebt',decisionId:'debt'}}).ok).toBe(true);
  const actual=e.state;expect(actual.finance!.eliminated).toContain('player-1');expect(actual.g6!.holdings['player-1'][k.id].average).toBe(count===2?avg:0);expect(actual.news!.publicFund).toBe(count===2?0:160);expect(actual.economy!.balances['player-2'].bank).toBe(50005);
});
it('G7 restores average, derived basis, holdings and bank while RNG remains outside rewind',()=>{
  const {s,h}=setup();buyHolding(h,3,10);s.effects!.inventory['player-1']['tool:10']=1;saveCheckpoint(s);const before=structuredClone(s.g6),bank=structuredClone(s.economy);sellHolding(h,1);tradeStock(s,'jp:24','buy',1,emit);marketTick(s,emit);const rng=s.randomState;expect(restoreCheckpoint(s,emit)).toBe(true);expect(s.g6).toEqual(before);expect(s.economy).toEqual(bank);expect(s.randomState).toBe(rng);
});
