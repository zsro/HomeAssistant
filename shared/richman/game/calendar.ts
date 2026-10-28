import {queueLoanPayment} from './payments';
import type {DateBusinessState} from './date-business';
import holidays from './calendar-japan.json';
import {FINAL_FORTUNE_FINGERPRINT} from './final-fortune';
import {hashSeed} from './random';
import type {GameState,EventPayload} from './engine';
export const CALENDAR_RULES=Object.freeze({id:'japan-events-candidate-v24',version:1,base:'japan-events-candidate-v23',start:'Web-default1998-01-01-configurable1998..2099-no-initial-interest',date:'one-day-on-solvent-seat-wrap;source-year-divisible4;no-timezone',closed:'Sunday0-or-Japan-stage0-first-matching-table-flag;Saturday-open;no-modern-holidays',interest:'first-day-month-after-market-before-incoming-loan;all-solvent-with-loan0;bank=trunc(bank*float64(1.1));no-proration-no-public-fund',loan:'first-positive-principal-date+90-skip-closed;topup-keeps-due;zero-clears;incoming-before-status-clock-remind3/2/1-collect0-bank-cash-no-interest;insufficient-Web-eliminate-return-shares-no-sale-no-original-auction',clocks:'bankRejected-and-noLoans-highbit-clear-own-turn-even-hotel;other-mobility-clocks-inherited;calendar-world-restored-by-time',scope:'no-original-special-players-price-index-calendar-other-events-company-insurance-statistics'});
export const CALENDAR_FINGERPRINT=hashSeed(JSON.stringify({base:FINAL_FORTUNE_FINGERPRINT,rules:CALENDAR_RULES,holidays})).toString(16);
import {validStartDate,dayNumber,addDays,calendarClosed,dueDate} from './calendar-date';
export * from './calendar-date';
export type InterestRow={playerId:string;before:number;after:number;amount:number;debt:number};
export type LoanNotice={playerId:string;date:string;due:string;kind:'reminder'|'collected';days:number;principal:number;bank:number;cash:number;unpaid:number};
export type CalendarState={ business?:DateBusinessState;date:string;elapsedDays:number;due:Record<string,string|null>;lastInterest:{date:string;rows:InterestRow[]}|null;notices:LoanNotice[]};
export type CalendarEvent={type:'dateAdvanced';from:string;date:string;closed:string}|{type:'monthlyInterest';date:string;rows:InterestRow[]}|{type:'loanDateChanged';targetId:string;due:string|null}|{type:'loanNotice';notice:LoanNotice};
type Emit=(e:EventPayload)=>void;
export function initializeCalendar(s:GameState,start='1998-01-01'){if(!validStartDate(start))throw Error('开局日期须为1998～2099年有效日期');s.calendar={date:start,elapsedDays:0,due:Object.fromEntries(s.players.map(p=>[p.id,null])),lastInterest:null,notices:[]};}
export function syncLoanDates(s:GameState,emit:Emit){const c=s.calendar;if(!c)return;for(const p of s.players){const old=c.due[p.id],value=s.news!.business!.loans[p.id]>0&&!s.finance!.eliminated.includes(p.id)?old??dueDate(c.date):null;if(value!==old){c.due[p.id]=value;emit({type:'loanDateChanged',targetId:p.id,due:value});}}}
export function advanceCalendar(s:GameState,emit:Emit){const c=s.calendar;if(!c)return false;const from=c.date;c.date=addDays(from,1);c.elapsedDays++;emit({type:'dateAdvanced',from,date:c.date,closed:calendarClosed(c.date)});return c.date.endsWith('-01');}
export function settleMonthly(s:GameState,emit:Emit){const c=s.calendar;if(!c)return;const rows=s.players.filter(p=>!s.finance!.eliminated.includes(p.id)).map(p=>{const b=s.economy!.balances[p.id],before=b.bank,debt=s.news!.business!.loans[p.id];if(!debt)b.bank=Math.trunc(b.bank*1.1);return {playerId:p.id,before,after:b.bank,amount:b.bank-before,debt};});c.lastInterest={date:c.date,rows};emit({type:'monthlyInterest',date:c.date,rows});}
export function checkLoanMaturity(s:GameState,emit:Emit,eliminate:(id:string)=>void){const c=s.calendar;if(!c)return;const id=s.players[s.active].id,due=c.due[id],business=s.news!.business!,principal=business.loans[id];if(!due||!principal||s.finance!.eliminated.includes(id))return;
 const days=dayNumber(due)-dayNumber(c.date);if(days<0||days>3)return;
 const notice:LoanNotice={playerId:id,date:c.date,due,kind:days?'reminder':'collected',days,principal,bank:0,cash:0,unpaid:0};
 if(!days&&queueLoanPayment(s,notice))return;
 if(!days){const b=s.economy!.balances[id];notice.bank=Math.min(b.bank,principal);b.bank-=notice.bank;notice.cash=Math.min(b.cash,principal-notice.bank);b.cash-=notice.cash;notice.unpaid=principal-notice.bank-notice.cash;business.loans[id]=0;c.due[id]=null;
  if(notice.unpaid){for(const stock of s.g6!.stocks){const h=s.g6!.holdings[id][stock.id];stock.pool+=h.quantity;stock.quota+=h.quantity;h.quantity=0;h.cost=0;if(h.average!==undefined)h.average=0;}eliminate(id);s.phase='turnEnd';const survivors=s.players.filter(p=>!s.finance!.eliminated.includes(p.id));if(survivors.length===1){s.finance!.winnerId=survivors[0].id;s.phase='finished';emit({type:'gameEnded',winnerId:survivors[0].id});}}
 }
 c.notices.push(notice);c.notices=c.notices.slice(-12);emit({type:'loanNotice',notice});
}
