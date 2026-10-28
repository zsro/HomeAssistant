import {buyHolding,sellHolding} from './stock-ledger';
import {updateStockMarket,marketBuyLimit} from './stock-market';
import {calendarClosed} from './calendar-date';
import { updateCompanyOwner } from './news-business';
import type { EventPayload, GameState } from './engine';
import { JAPAN_STOCKS } from './g6-catalog';
import { g6Draw } from './g6-random';
import { actionLocked } from './g2';
export type Stock = { momentum?:number; noise?:number; id: string; base: number; price: number; pool: number; quota: number; trend: 'red' | 'black' | null; remaining: number; history: number[] };
export type Holding = { average?: number; quantity: number; cost: number };
type Emit = (e: EventPayload) => void;
export const tradeAmount = (price: number, quantity: number) => Math.floor(price * quantity / 100);
export const stockValue = (market: GameState['g6'], id: string) => market?.stocks.reduce((sum, k) => sum + tradeAmount(k.price, market.holdings[id]?.[k.id]?.quantity ?? 0), 0) ?? 0;
/** Integer cents; truncate the change to the reference price tick, then clamp. */
export function marketPrice(base: number, percent: number) {
  const raw = base * (100 + percent) / 100;
  const tick = raw < 500 ? 1 : raw < 1500 ? 5 : raw < 5000 ? 10 : raw < 15000 ? 50 : 100;
  return Math.max(100, Math.min(999900, base + Math.trunc(base * percent / 100 / tick) * tick));
}
export function priceLimit(k:Pick<Stock,'price'|'base'>):'up'|'down'|null {
  if(k.price>k.base&&k.price>=marketPrice(k.base,10))return 'up';
  if(k.price<k.base&&k.price<=marketPrice(k.base,-10))return 'down';
  return null;
}
export function refreshQuota(s: GameState) {
  if (!s.g6) return;
  for (const k of s.g6.stocks) {
    if (k.pool <= 1000) k.quota = k.pool;
    else { const draw = g6Draw(s.randomState, 2000); s.randomState = draw.state; k.quota = Math.floor(k.pool * (draw.index + 1000) / 10000); }
  }
}
export function marketTick(s: GameState, emit: Emit) {
  if (!s.g6) return;
  if((s.rulesId==='japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))){
    for(const k of s.g6.stocks)if(k.remaining>0&&--k.remaining===0)k.trend=null;
    if(s.news?.business?.marketClosed||calendarClosed(s.calendar!.date))return;
    updateStockMarket(s,marketPrice,emit);return;
  }
  for (const k of s.g6.stocks) {
    // Reference date boundary decrements the red/black byte before the next update.
    if (k.remaining > 0 && --k.remaining === 0) k.trend = null;
    if(s.news?.business?.marketClosed||(s.calendar&&calendarClosed(s.calendar.date)))continue;
    k.base = k.price;
    if(s.news?.business?.halted[k.id]){k.history.push(k.price);k.history=k.history.slice(-144);continue;}
    let percent = k.trend === 'red' ? 10 : k.trend === 'black' ? -10 : 0;
    if (!k.trend) { const draw = g6Draw(s.randomState, 201); s.randomState = draw.state; percent = Math.max(-10, Math.min(10, (draw.index - 100) * JAPAN_STOCKS.find(d => d.id === k.id)!.volatility / 100)); }
    k.price = marketPrice(k.base, percent); k.history.push(k.price); k.history = k.history.slice(-144);
  }
  emit({ type: 'g6Notice', message: s.calendar&&calendarClosed(s.calendar.date)?`${s.calendar.date} ${calendarClosed(s.calendar.date)}，行情保持。`:`第${s.finance!.round}轮行情已更新。` });
}
export function marketAvailable(s: GameState) {
  const id = s.players[s.active].id;
  return !(s.calendar&&calendarClosed(s.calendar.date)) && !s.news?.business?.marketClosed && !!s.g6 && !s.paused && ['idle', 'turnEnd'].includes(s.phase) && !s.finance!.eliminated.includes(id) && !actionLocked(s.g2!.players[id]) && !s.g4!.hotel[id];
}
function executeTrade(s: GameState, id: string, k: Stock, side: 'buy' | 'sell', quantity: number, emit: Emit, forced = false) {
  const h = s.g6!.holdings[id][k.id], amount = tradeAmount(k.price, quantity), b = s.economy!.balances[id];
  if (side === 'buy') { buyHolding(h,quantity,amount); b.bank -= amount; k.pool -= quantity; k.quota -= quantity; }
  else { sellHolding(h,quantity); b.bank += amount; k.pool += quantity; k.quota += quantity; }
  updateCompanyOwner(s,id,k.id);
  emit({ type: 'stockTraded', stockId: k.id, traderId: id, side, quantity, price: k.price, amount, forced });
}
export function tradeStock(s: GameState, stockId: string, side: 'buy' | 'sell', quantity: number, emit: Emit) {
  if (!marketAvailable(s) || !['buy', 'sell'].includes(side) || !Number.isSafeInteger(quantity) || quantity < 1) return false;
  const k = s.g6!.stocks.find(k => k.id === stockId), id = s.players[s.active].id;
  if (!k || s.news?.business?.halted[stockId] || quantity > ((s.rulesId==='japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))))))))))))?10000:JAPAN_STOCKS.find(d => d.id === stockId)!.shares)) return false;
  if((s.rulesId==='japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))&&priceLimit(k)===(side==='buy'?'up':'down'))return false;
  const amount = tradeAmount(k.price, quantity);
  if((s.rulesId==='japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))&&side==='buy'&&quantity>marketBuyLimit(s.economy!.balances[id].bank,k.price,k.pool,k.quota))return false;
  if (side === 'buy' ? quantity > Math.min(k.pool, k.quota) || amount > s.economy!.balances[id].bank : quantity > s.g6!.holdings[id][k.id].quantity) return false;
  executeTrade(s, id, k, side, quantity, emit); return true;
}
/** Only after free/redirect reactions choose the actual payer. Stable stock order is a Web convention. */
export function liquidateForRent(s: GameState, id: string, due: number, emit: Emit) {
  if (!s.g6) return;
  const b = s.economy!.balances[id];
  for (const k of s.g6.stocks) {
    const deficit = due - b.cash - b.bank;
    if (deficit <= 0) break;
    const quantity = Math.min(s.g6.holdings[id][k.id].quantity, Math.ceil(deficit * 100 / k.price));
    if (quantity) executeTrade(s, id, k, 'sell', quantity, emit, true);
  }
}
