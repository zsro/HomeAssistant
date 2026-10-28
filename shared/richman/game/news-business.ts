import type {InsuranceState} from './insurance-state';
import type {ConstructionReceipt,SubscriptionReceipt} from './commerce';
import {JAPAN_STOCKS} from './g6-catalog';
import type {ServiceReceipt} from './company-services';
import type {DividendSettlement} from './dividends';
import catalog from './news-companies.json';
import type { GameState, EventPayload } from './engine';
import type { PropertyDefinition } from './economy';
import { propertyBase } from './economy';
export type Company = typeof catalog[number] & { ownerId: string | null; ranking: string[]; subscription?:number };
export type NewsBusiness = { insurance?:InsuranceState; construction?:ConstructionReceipt|null; subscriptionReceipt?:SubscriptionReceipt|null; service?:ServiceReceipt|null; dividends?: DividendSettlement | null; bankRejected?: Record<string,number>; companies: Company[]; marketClosed: number; halted: Record<string, number>; noLoans: Record<string, number>; loans: Record<string, number> };
export function initializeBusiness(s: GameState): NewsBusiness {
  return { ...((s.rulesId==='japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))?{insurance:{terms:Object.fromEntries(s.players.map(p=>[p.id,0])),policy:null,claims:[]}}:{}), ...((s.rulesId==='japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))))))))))))?{construction:null,subscriptionReceipt:null}:{}), ...((s.rulesId === 'japan-events-candidate-v27' || (s.rulesId === 'japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))?{service:null}:{}), ...((s.rulesId==='japan-events-candidate-v26'||(s.rulesId === 'japan-events-candidate-v27' || (s.rulesId === 'japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))))))))))))))?{dividends:null}:{}), ...((s.rulesId==='japan-events-candidate-v23'||(s.rulesId==='japan-events-candidate-v24'||(s.rulesId==='japan-events-candidate-v25'||(s.rulesId==='japan-events-candidate-v26'||(s.rulesId === 'japan-events-candidate-v27' || (s.rulesId === 'japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47'))))))))))))))))))))))))?{bankRejected:Object.fromEntries(s.players.map(p=>[p.id,0]))}:{}), companies: catalog.map(c => ({ ...c, ...((s.rulesId==='japan-events-candidate-v28' || (s.rulesId === 'japan-events-candidate-v29' || (s.rulesId === 'japan-events-candidate-v30' || (s.rulesId === 'japan-events-candidate-v31' || (s.rulesId === 'japan-events-candidate-v32' || (s.rulesId === 'japan-events-candidate-v33' || (s.rulesId === 'japan-events-candidate-v34' || (s.rulesId === 'japan-events-candidate-v35' || (s.rulesId === 'japan-events-candidate-v36' || (s.rulesId === 'japan-events-candidate-v37' || (s.rulesId === 'japan-events-candidate-v38' || (s.rulesId === 'japan-events-candidate-v39' || (s.rulesId === 'japan-events-candidate-v40' || (s.rulesId === 'japan-events-candidate-v41' || (s.rulesId === 'japan-events-candidate-v42' || (s.rulesId==='japan-events-candidate-v43' || (s.rulesId === 'japan-events-candidate-v44' || (s.rulesId === 'japan-events-candidate-v45' || (s.rulesId === 'japan-events-candidate-v46' || s.rulesId === 'japan-events-candidate-v47')))))))))))))))))))?{subscription:10000-JAPAN_STOCKS.find(k=>k.id===c.stockId)!.shares}:{}), nodeIds: [...c.nodeIds], ownerId: null, ranking: [] })), marketClosed: 0,
    halted: Object.fromEntries(s.g6!.stocks.map(k => [k.id, 0])), noLoans: Object.fromEntries(s.players.map(p => [p.id, 0])), loans: Object.fromEntries(s.players.map(p => [p.id, 0])) };
}
/** Remove the trader, then insert after all existing holders of equal quantity. */
export function updateCompanyOwner(s: GameState, playerId: string, stockId: string) {
  const company = s.news?.business?.companies.find(c => c.stockId === stockId);
  if (!company) return;
  const quantity = (id: string) => s.finance!.eliminated.includes(id) ? 0 : s.g6!.holdings[id][stockId].quantity;
  company.ranking = company.ranking.filter(id => id !== playerId && quantity(id) > 0);
  if (quantity(playerId) > 0) {
    const index = company.ranking.findIndex(id => quantity(id) < quantity(playerId));
    company.ranking.splice(index < 0 ? company.ranking.length : index, 0, playerId);
  }
  company.ownerId = company.ranking[0] ?? null;
}
export function cleanCompanies(s: GameState) {
  for (const c of s.news?.business?.companies ?? []) {
    c.ranking = c.ranking.filter(id => !s.finance!.eliminated.includes(id) && s.g6!.holdings[id][c.stockId].quantity > 0);
    c.ownerId = c.ranking[0] ?? null;
  }
}
const tickRaw = (n: number) => n === 128 ? 0 : n === 1 ? 128 : Math.max(0, n - 1);
export function tickBusinessRound(s: GameState) {
  const b = s.news?.business; if (!b) return;
  b.marketClosed = tickRaw(b.marketClosed);
  for (const id in b.halted) b.halted[id] = Math.max(0, b.halted[id] - 1);
}
export function tickLoans(s: GameState, id: string) {
  const b = s.news?.business; if(b?.bankRejected){const n=b.bankRejected[id];b.bankRejected[id]=n&128?0:n===1?128:Math.max(0,n-1);}
  if (b && (s.calendar || !s.g4!.hotel[id])) b.noLoans[id] = s.calendar && (b.noLoans[id] & 128) ? 0 : tickRaw(b.noLoans[id]);
}
export function loanCapacity(s: Pick<GameState, 'news' | 'economy' | 'g6'>, id: string, definitions: readonly PropertyDefinition[]) {
  const b = s.economy!.balances[id];
  const shares = s.g6!.stocks.reduce((sum, k) => sum + Math.floor(k.price * s.g6!.holdings[id][k.id].quantity / 100), 0);
  const debt = s.news!.business!.loans[id];
  const wealth = b.cash + b.bank + shares + s.economy!.properties.filter(p=>p.ownerId===id).reduce((sum,p)=>{const d=definitions.find(d=>d.id===p.id)!;return sum+propertyBase(p,d)+(d.kind==='land'&&p.buildingType?1:p.level)*d.upgradeCost;},0) - debt;
  return Math.max(0, wealth - debt);
}
export function bankLoan(s: GameState, operation: 'borrow' | 'repay', amount: number, definitions: readonly PropertyDefinition[], emit: (e: EventPayload) => void) {
  const business = s.news?.business, id = s.players[s.active].id;
  if (!business || business.bankRejected?.[id] || !['borrow', 'repay'].includes(operation) || !Number.isSafeInteger(amount) || amount < 1) return false;
  const b = s.economy!.balances[id];
  if (operation === 'borrow') {
    if (business.noLoans[id] || amount > loanCapacity(s, id, definitions)) return false;
    b.bank += amount; business.loans[id] += amount;
  } else {
    if (amount > business.loans[id] || amount > b.cash + b.bank) return false;
    const bank = Math.min(amount, b.bank); b.bank -= bank; b.cash -= amount - bank; business.loans[id] -= amount;
  }
  emit({ type: 'loanChanged', targetId: id, operation, amount, debt: business.loans[id], balance: { ...b } }); return true;
}
