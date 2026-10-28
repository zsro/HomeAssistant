import {expect,it} from 'vitest';
import {GameEngine} from './engine';
import type {GameState} from './engine';
import {applyCompleteNews} from './complete-news';
import {tradeStock,marketTick,liquidateForRent} from './g6-market';
import {buyHolding} from './stock-ledger';
import {offerSubscription,subscribeCompany} from './commerce';
import {offerAssetFortune} from './asset-fortune';
import {saveCheckpoint,restoreCheckpoint} from './g7';
import {PROPERTY_CATALOG} from './economy';
import type {PropertyDefinition} from './economy';
import {STOCK_CIRCUIT_FINGERPRINT} from './stock-circuit-rules';
import nodes from '../../../../../shared/richman/japan-topology.fixture.json';
const defs=PROPERTY_CATALOG.properties as readonly PropertyDefinition[],emit=()=>undefined;
function fixture(version=44){const e=new GameEngine(nodes,{gameId:'circuit',seed:'circuit',rulesId:`japan-events-candidate-v${version}`,characterIds:['a','b','c'],initialFunds:300000,startDate:'1998-01-09'});const s=(e as unknown as{current:GameState}).current;s.g6!.gods=[];return{s,e};}
const news=(s:GameState,id:number)=>applyCompleteNews(s,id,defs,nodes,[],emit);
it('v44 has new fingerprint, v43 state/quotes/random remain inherited',()=>{const a=fixture(),b=fixture(43);expect(a.s.items!.fingerprint).toBe(STOCK_CIRCUIT_FINGERPRINT);expect(STOCK_CIRCUIT_FINGERPRINT).toBe('f9dbb7e9');expect(b.s.items!.fingerprint).toBe('d9c26ce0');expect(a.s.g6).toEqual(b.s.g6);expect(a.s.randomState).toBe(b.s.randomState);});
for(const version of[43,44])it.each([30,31,32,33,34,35])(`v${version} company news %i synchronizes only in new profile`,id=>{
 const {s}=fixture(version);for(const c of s.news!.business!.companies)c.funds=11000;for(const k of s.g6!.stocks)k.momentum=2.25;const banks=structuredClone(s.economy!.balances),holdings=structuredClone(s.g6!.holdings);
 const r=news(s,id),c=r.changes.company!.after,k=s.g6!.stocks.find(k=>k.id===c.stockId)!;
 expect(k.momentum).toBe(version===43?2.25:k.trend==='red'?10:-10);expect(s.economy!.balances).toEqual(banks);expect(s.g6!.holdings).toEqual(holdings);expect(k.history.at(-1)).toBe(k.price);
});
it('one-day company red expires before next normal update but preserves forced percentage',()=>{
 const {s}=fixture();for(const c of s.news!.business!.companies)c.funds=11000;const r=news(s,35),k=s.g6!.stocks.find(k=>k.id===r.changes.company!.after.stockId)!;expect(k.remaining).toBe(1);marketTick(s,emit);expect(k.trend).toBeNull();expect(s.g6!.market!.last!.quotes.find(q=>q.stockId===k.id)).toMatchObject({kind:'ordinary',beforePercent:10});
});
it('wrapped zero company trend does not overwrite accumulated percent or price',()=>{
 const {s}=fixture();for(const c of s.news!.business!.companies)c.funds=160000;for(const k of s.g6!.stocks)k.momentum=2.25;const prices=s.g6!.stocks.map(k=>k.price);const r=news(s,35),k=s.g6!.stocks.find(k=>k.id===r.changes.company!.after.stockId)!;expect(k.trend).toBeNull();expect(k.remaining).toBe(0);expect(k.momentum).toBe(2.25);expect(s.g6!.stocks.map(k=>k.price)).toEqual(prices);
});
it('suspension overrides company red on next open day; closed date leaves receipt and average intact',()=>{
 const{s}=fixture();const r=news(s,31),k=s.g6!.stocks.find(k=>k.id===r.changes.company!.after.stockId)!;buyHolding(s.g6!.holdings['player-1'][k.id],3,10);const holding=structuredClone(s.g6!.holdings);s.news!.business!.halted[k.id]=3;s.calendar!.date='1998-01-11';const rng=s.randomState;marketTick(s,emit);expect(s.randomState).toBe(rng);expect(s.g6!.market!.last).toBeNull();expect(k.momentum).toBe(10);s.calendar!.date='1998-01-12';marketTick(s,emit);expect(k.momentum).toBe(0);expect(s.g6!.market!.last!.quotes.find(q=>q.stockId===k.id)!.kind).toBe('halted');expect(s.g6!.holdings).toEqual(holding);
});
it.each([2,3,4,5])('company%i cash subscription mixes public stock average without moving bank or creating revenue',number=>{
 const{s}=fixture(),c=s.news!.business!.companies.find(c=>c.id===`japan:company:${number}`)!,k=s.g6!.stocks.find(k=>k.id===c.stockId)!,h=s.g6!.holdings['player-1'][k.id];expect(tradeStock(s,k.id,'buy',3,emit)).toBe(true);const old=structuredClone(h),bank=s.economy!.balances['player-1'].bank,cash=s.economy!.balances['player-1'].cash,pool=k.pool,quota=k.quota,available=c.subscription!;s.players[0].node=c.nodeIds[0];expect(offerSubscription(s,()=> 'sub')).toBe(true);expect(subscribeCompany(s,'sub',13,emit)).toBe(true);const paid=13*Math.trunc(c.capital/10000);expect(h.average).toBe(Math.fround((Math.trunc(old.quantity*old.average!)+paid)/16));expect(s.economy!.balances['player-1']).toEqual({bank,cash:cash-paid});expect([k.pool,k.quota]).toEqual([pool,quota]);expect(c.subscription).toBe(available-13);expect([c.funds,c.cumulative,c.ownerId]).toEqual([0,0,'player-1']);
});
for(const halted of[false,true])it.each([8,9])(`fortune %i forced sale with halt=${halted} preserves destination and basis`,id=>{
 const{s}=fixture(),k=s.g6!.stocks[0],h=s.g6!.holdings['player-1'][k.id];expect(tradeStock(s,k.id,'buy',19,emit)).toBe(true);const bank=s.economy!.balances['player-1'].bank,pub=s.news!.publicFund,avg=h.average,price=k.price,pool=k.pool;news(s,31);if(halted){s.news!.business!.marketClosed=10;s.news!.business!.halted[k.id]=5;expect(tradeStock(s,k.id,'sell',1,emit)).toBe(false);}const salePrice=k.price;offerAssetFortune(s,id,defs,[],()=> 'fortune',emit);const quantity=id===8?1:19,amount=Math.trunc(salePrice*quantity/100);expect(h.quantity).toBe(19-quantity);expect(h.average).toBe(id===8?avg:0);expect(k.pool).toBe(pool+quantity);expect(s.news!.publicFund-pub).toBe(id===8?amount:0);expect(s.economy!.balances['player-1'].bank-bank).toBe(id===9?amount:0);expect(price).toBeGreaterThan(0);
});
it('necessary debt sale under closure and lower limit keeps survivor average and credits bank',()=>{const{s}=fixture(),k=s.g6!.stocks[0],h=s.g6!.holdings['player-1'][k.id];buyHolding(h,19,100);const average=h.average;s.economy!.balances['player-1']={cash:0,bank:0};k.base=1000;k.price=900;s.news!.business!.marketClosed=10;liquidateForRent(s,'player-1',20,emit);expect(h).toEqual({quantity:16,average,cost:Math.trunc(16*average!)});expect(s.economy!.balances['player-1'].bank).toBe(27);expect(s.news!.publicFund).toBe(0);});
it('G7 restores company trend, receipt, subscription, cash/bank and float averages as one world',()=>{
 const{s}=fixture(),c=s.news!.business!.companies[2];tradeStock(s,c.stockId,'buy',3,emit);s.effects!.inventory['player-1']['tool:10']=1;saveCheckpoint(s);const before=structuredClone(s);s.players[0].node=c.nodeIds[0];offerSubscription(s,()=> 'sub');subscribeCompany(s,'sub',13,emit);news(s,31);marketTick(s,emit);const rng=s.randomState;expect(restoreCheckpoint(s,emit)).toBe(true);expect(s.g6).toEqual(before.g6);expect(s.news).toEqual(before.news);expect(s.economy).toEqual(before.economy);expect(s.calendar).toEqual(before.calendar);expect(s.randomState).toBe(rng);expect(s.effects!.inventory['player-1']['tool:10']).toBe(0);
});
