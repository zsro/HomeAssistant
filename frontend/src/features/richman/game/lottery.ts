import type {GameState,EventPayload} from './engine';
import type {MapNode} from '../types';
import {CALENDAR_FINGERPRINT} from './calendar';
import {hashSeed} from './random';
import {g6Draw} from './g6-random';
export const LOTTERY_RULES=Object.freeze({
 id:'japan-events-candidate-v25',version:1,base:'japan-events-candidate-v24',
 site:'Japan-statusLowByte9-nodes28/88;landing-only-no-dream;one-ticket-per-visit-or-leave',
 purchase:'numbers1..36-global-unique;cash>=1000-fixed-no-price-bank-reaction;cash-1000-publicFund+1000',
 draw:'date15-after-market-before-incoming;no-tickets-no-RNG;any-seat>10-select-sold-numbers-ascending-else-all36;one-g6Draw-Web-no-CRT-animation-RNG',
 prize:'same-news-publicFund-start0;winner-all-to-cash-clear-fund-and-all-tickets;no-winner-keep-both;no-new-subsidy',
 exit:'bankruptcy-clear-only-own-tickets-no-refund-pool-stays;G7-world-includes-tickets-and-result-with-fund-calendar',
 scope:'no-original-animation-AI-company-dividend-calendar-other-activities-original-bankruptcy-auction',
});
export const LOTTERY_NODES=[28,88] as const;
export const LOTTERY_FINGERPRINT=hashSeed(JSON.stringify({base:CALENDAR_FINGERPRINT,rules:LOTTERY_RULES,nodes:LOTTERY_NODES})).toString(16);
export type LotteryDecision={kind:'lottery';id:string;node:number};
export type LotteryDraw={date:string;number:number|null;winnerId:string|null;amount:number;fundBefore:number;fundAfter:number;sold:number;restricted:boolean;candidates:number[]};
export type LotteryState={tickets:(string|null)[];lastDraw:LotteryDraw|null};
export type LotteryEvent={type:'lotteryOffered';decision:LotteryDecision}|{type:'lotteryBought';number:number;buyerId:string;cost:number;fund:number;cash:number}|{type:'lotteryDrawn';result:LotteryDraw}|{type:'lotteryReleased';ownerId:string;numbers:number[]};
type Emit=(e:EventPayload)=>void;
export function initializeLottery(s:GameState){s.lottery={tickets:Array<string|null>(36).fill(null),lastDraw:null};}
export function offerLottery(s:GameState,nodes:readonly MapNode[],token:()=>string,emit:Emit){
 const p=s.players[s.active];
 if(!s.lottery||s.g2!.players[p.id].dream||s.finance!.eliminated.includes(p.id)||!(LOTTERY_NODES as readonly number[]).includes(p.node)||!nodes.some(n=>n.id===p.node))return false;
 s.phase='lottery';s.pending={kind:'lottery',id:token(),node:p.node};emit({type:'lotteryOffered',decision:{...s.pending}});return true;
}
export function buyLottery(s:GameState,decisionId:string,number:number,emit:Emit){
 const l=s.lottery,p=s.players[s.active];
 if(!l||s.phase!=='lottery'||s.pending?.kind!=='lottery'||s.pending.id!==decisionId||!Number.isInteger(number)||number<1||number>36||l.tickets[number-1]!==null||s.economy!.balances[p.id].cash<1000)return false;
 const b=s.economy!.balances[p.id];b.cash-=1000;l.tickets[number-1]=p.id;s.news!.publicFund+=1000;
 emit({type:'lotteryBought',number,buyerId:p.id,cost:1000,fund:s.news!.publicFund,cash:b.cash});s.pending=null;s.phase='turnEnd';return true;
}
export function releaseLottery(s:GameState,id:string,emit:Emit){
 const l=s.lottery;if(!l)return;const numbers:number[]=[];
 l.tickets.forEach((owner,i)=>{if(owner===id){numbers.push(i+1);l.tickets[i]=null;}});
 if(numbers.length)emit({type:'lotteryReleased',ownerId:id,numbers});
}
export function drawLottery(s:GameState,emit:Emit){
 const l=s.lottery;if(!l||!s.calendar!.date.endsWith('-15'))return;
 const sold=l.tickets.flatMap((id,i)=>id?[i+1]:[]),restricted=s.players.some(p=>l.tickets.filter(id=>id===p.id).length>10);
 const candidates=sold.length?(restricted?sold:Array.from({length:36},(_,i)=>i+1)):[];
 let number:number|null=null,winnerId:string|null=null,amount=0;const fundBefore=s.news!.publicFund;
 if(candidates.length){const draw=g6Draw(s.randomState,candidates.length);s.randomState=draw.state;number=candidates[draw.index];winnerId=l.tickets[number-1];if(winnerId){amount=fundBefore;s.economy!.balances[winnerId].cash+=amount;s.news!.publicFund=0;l.tickets.fill(null);}}
 const result:LotteryDraw={date:s.calendar!.date,number,winnerId,amount,fundBefore,fundAfter:s.news!.publicFund,sold:sold.length,restricted,candidates};
 l.lastDraw=result;emit({type:'lotteryDrawn',result:structuredClone(result)});
}
